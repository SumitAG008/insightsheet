from __future__ import annotations

import csv
import io
import json
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from app.services.ingestion_service import IngestionService
from app.services.ocr_service import OCRService
from app.services.ai_service import invoke_llm


@dataclass
class InvoiceLineItem:
    description: str = ""
    quantity: str = ""
    unit_price: str = ""
    amount: str = ""


def _coerce_str(v: Any) -> str:
    if v is None:
        return ""
    return str(v).strip()


def _safe_float(v: Any) -> Optional[float]:
    try:
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return float(v)
        s = str(v)
        s = s.replace(",", "")
        s = "".join(ch for ch in s if (ch.isdigit() or ch in ".-"))
        if not s or s in ("-", "."):
            return None
        return float(s)
    except Exception:
        return None


def _extract_text_hybrid(filename: str, content: bytes, ocr_lang: Optional[str], max_pages: int) -> Tuple[str, Dict[str, Any]]:
    ing = IngestionService()
    meta: Dict[str, Any] = {"filename": filename}

    ext = (os.path.splitext(filename or "")[1] or "").lower().lstrip(".")

    text = ""
    if ext == "pdf":
        out = ing.ingest(filename, content)
        text = (out.get("extracted_text") or "").strip()
        meta["pdf_meta"] = out.get("meta") or {}
        if len(text) >= 200:
            return text, meta

        # OCR fallback for scanned/empty PDFs
        ocr = OCRService()
        ocr_out = ocr.extract_pdf_with_layout(content, max_pages=max_pages, ocr_lang=ocr_lang)
        text = ((ocr_out.get("text") or "") + "").strip()
        meta["ocr"] = {"page_count": ocr_out.get("page_count"), "pages": len(ocr_out.get("pages") or [])}
        return text, meta

    # Images (receipt photos)
    ocr = OCRService()
    try:
        text = (ocr.extract_text(io.BytesIO(content), ocr_lang=ocr_lang) or "").strip()
        meta["ocr"] = {"mode": "tesseract_text"}
        return text, meta
    except Exception:
        # Layout OCR often does better with receipts
        ocr_out = ocr.extract_with_layout(io.BytesIO(content), ocr_lang=ocr_lang)
        text = (ocr_out.get("text") or "").strip()
        meta["ocr"] = {"mode": "tesseract_layout"}
        return text, meta


def _invoice_llm_prompt(extracted_text: str) -> str:
    return (
        "Extract invoice/receipt data from the text below. "
        "Return a JSON object with these keys:\n"
        "- vendor_name (string)\n"
        "- invoice_number (string)\n"
        "- invoice_date (string; ISO if possible)\n"
        "- currency (string; e.g. USD, GBP, EUR)\n"
        "- subtotal (string or number)\n"
        "- tax (string or number)\n"
        "- total (string or number)\n"
        "- line_items (array of objects with keys: description, quantity, unit_price, amount)\n\n"
        "If a field is not present, return an empty string. "
        "Try to extract line items if the invoice contains an items table; otherwise return an empty array.\n\n"
        "INVOICE TEXT:\n" + extracted_text
    )


async def extract_invoice_structured(
    filename: str,
    content: bytes,
    ocr_lang: Optional[str] = None,
    max_pages: int = 25,
) -> Dict[str, Any]:
    start = time.time()
    max_pages = max(1, min(int(max_pages or 25), 200))

    extracted_text, extract_meta = _extract_text_hybrid(filename, content, ocr_lang=ocr_lang, max_pages=max_pages)
    if not extracted_text or len(extracted_text.strip()) < 20:
        raise ValueError("Unable to extract readable text from document")

    prompt = _invoice_llm_prompt(extracted_text)

    structured: Dict[str, Any] = {}
    llm_error = None
    try:
        structured = await invoke_llm(prompt=prompt, response_schema={"type": "json_object"})
        if not isinstance(structured, dict):
            structured = {}
    except Exception as e:
        llm_error = str(e)
        structured = {}

    invoice = {
        "vendor_name": _coerce_str(structured.get("vendor_name")),
        "invoice_number": _coerce_str(structured.get("invoice_number")),
        "invoice_date": _coerce_str(structured.get("invoice_date")),
        "currency": _coerce_str(structured.get("currency")),
        "subtotal": structured.get("subtotal"),
        "tax": structured.get("tax"),
        "total": structured.get("total"),
        "line_items": structured.get("line_items") if isinstance(structured.get("line_items"), list) else [],
    }

    # Minimal validation hints
    subtotal_f = _safe_float(invoice.get("subtotal"))
    tax_f = _safe_float(invoice.get("tax"))
    total_f = _safe_float(invoice.get("total"))
    validation: Dict[str, Any] = {}
    if subtotal_f is not None and tax_f is not None and total_f is not None:
        expected = subtotal_f + tax_f
        validation["total_matches_subtotal_plus_tax"] = abs(expected - total_f) <= max(0.02, abs(total_f) * 0.02)
        validation["expected_total"] = expected

    # Normalize line items to consistent shape
    norm_items: List[InvoiceLineItem] = []
    for it in invoice.get("line_items") or []:
        if not isinstance(it, dict):
            continue
        norm_items.append(
            InvoiceLineItem(
                description=_coerce_str(it.get("description")),
                quantity=_coerce_str(it.get("quantity")),
                unit_price=_coerce_str(it.get("unit_price")),
                amount=_coerce_str(it.get("amount")),
            )
        )
    invoice["line_items"] = [it.__dict__ for it in norm_items]

    end = time.time()
    report = {
        "source": "invoice_extraction",
        "filename": filename,
        "duration_ms": int((end - start) * 1000),
        "extraction_meta": extract_meta,
        "llm_error": llm_error,
        "validation": validation,
        "extracted_text_chars": len(extracted_text),
        "line_items": len(norm_items),
    }

    return {"invoice": invoice, "report": report}


def write_invoice_exports(
    invoice: Dict[str, Any],
    header_csv_path: str,
    line_items_csv_path: str,
) -> None:
    header_fields = [
        "vendor_name",
        "invoice_number",
        "invoice_date",
        "currency",
        "subtotal",
        "tax",
        "total",
    ]

    with open(header_csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header_fields)
        w.writeheader()
        w.writerow({k: invoice.get(k, "") for k in header_fields})

    li_fields = ["description", "quantity", "unit_price", "amount"]
    with open(line_items_csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=li_fields)
        w.writeheader()
        for it in (invoice.get("line_items") or []):
            if isinstance(it, dict):
                w.writerow({k: it.get(k, "") for k in li_fields})
