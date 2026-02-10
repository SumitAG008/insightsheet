"""
P&L (Profit & Loss) Builder Service
Generates Excel files with formulas, charts, and formatting from natural language
"""
import openpyxl
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, Reference
from openpyxl.utils import get_column_letter
import pandas as pd
import io
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, date, timedelta
import re

from app.services.ai_service import invoke_llm

logger = logging.getLogger(__name__)


class PLBuilderService:
    """Service to generate P&L Excel files from natural language"""

    def __init__(self):
        self.theme_colors = {
            'header': '366092',  # Dark blue
            'revenue': '70AD47',  # Green
            'expense': 'C00000',  # Red
            'net': 'FFC000',  # Orange
            'border': '000000',  # Black
            'light_bg': 'F2F2F2',  # Light gray
        }

    async def generate_pl_from_natural_language(
        self,
        prompt: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Generate P&L Excel file from natural language description

        Args:
            prompt: Natural language description (e.g., "Create monthly P&L for 2024")
            user_context: Additional context (company name, currency, etc.)

        Returns:
            bytes: Excel file data
        """
        try:
            # Parse natural language using AI
            pl_spec = await self._parse_pl_request(prompt, user_context)

            # Generate Excel workbook
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Profit & Loss"

            # Build P&L structure
            self._build_pl_structure(ws, pl_spec)

            # Add formulas
            self._add_formulas(ws, pl_spec)

            # Add charts
            self._add_charts(ws, pl_spec)

            # Format worksheet
            self._format_worksheet(ws, pl_spec)

            # Save to bytes
            output = io.BytesIO()
            wb.save(output)
            output.seek(0)

            return output.read()

        except Exception as e:
            logger.error(f"Error generating P&L: {str(e)}")
            raise Exception(f"P&L generation failed: {str(e)}")

    def preview_extraction_from_uploaded_excel(self, filename: str, content: bytes) -> Dict[str, Any]:
        candidates = self._extract_pl_candidates_from_excel_bytes(filename=filename, content=content)
        if not candidates:
            return {
                "ok": False,
                "message": "Could not detect a P&L/Income Statement table in this workbook.",
            }

        extracted = candidates[0]

        warnings: List[str] = []
        diag0 = extracted.get("diagnostics") or {}
        if isinstance(diag0, dict) and diag0.get("workbook_has_formulas"):
            warnings.append(
                "Workbook contains formulas. If Excel did not save cached results, extraction may return zeros. "
                "Fix: open the file in Excel, calculate (Formulas → Calculate Now), save, then re-upload; or paste values."
            )

        period_labels = extracted.get("period_labels") or []
        values_by_category = extracted.get("values_by_category") or {}
        nonzero_cells = 0
        for _k, vals in values_by_category.items():
            if not isinstance(vals, list):
                continue
            for v in vals:
                if isinstance(v, (int, float)) and v != 0:
                    nonzero_cells += 1

        confidence_payload = self._compute_extraction_confidence(
            period_count=len(period_labels),
            line_item_count=len(values_by_category),
            nonzero_cells=nonzero_cells,
            has_revenue=bool(extracted.get("has_revenue")),
            has_expense=bool(extracted.get("has_expense")),
        )

        preview_candidates: List[Dict[str, Any]] = []
        for cand in candidates[:6]:
            vals_by_cat = cand.get("values_by_category") or {}
            nz = 0
            for _k, vals in vals_by_cat.items():
                if not isinstance(vals, list):
                    continue
                for v in vals:
                    if isinstance(v, (int, float)) and v != 0:
                        nz += 1
            conf = self._compute_extraction_confidence(
                period_count=int(cand.get("period_count") or 0),
                line_item_count=int(cand.get("line_item_count") or 0),
                nonzero_cells=nz,
                has_revenue=bool(cand.get("has_revenue")),
                has_expense=bool(cand.get("has_expense")),
            )
            diag = cand.get("diagnostics") or {}
            preview_candidates.append(
                {
                    "candidate_id": cand.get("candidate_id"),
                    "sheet": diag.get("sheet"),
                    "layout": diag.get("layout"),
                    "period_count": cand.get("period_count"),
                    "line_item_count": cand.get("line_item_count"),
                    "nonzero_cells": nz,
                    "confidence": conf.get("confidence"),
                    "recommendation": conf.get("recommendation"),
                    "reasons": conf.get("reasons"),
                }
            )

        return {
            "ok": True,
            "candidate_id": extracted.get("candidate_id"),
            "period_labels": period_labels,
            "period_count": len(period_labels),
            "revenue_categories": extracted.get("revenue_categories") or [],
            "expense_categories": extracted.get("expense_categories") or [],
            "line_item_count": len(values_by_category),
            "nonzero_cells": nonzero_cells,
            "confidence": confidence_payload.get("confidence"),
            "recommendation": confidence_payload.get("recommendation"),
            "reasons": confidence_payload.get("reasons"),
            "diagnostics": extracted.get("diagnostics") or {},
            "warnings": (extracted.get("warnings") or []) + warnings,
            "candidates": preview_candidates,
        }

    async def generate_pl_from_uploaded_excel(
        self,
        filename: str,
        content: bytes,
        prompt: str,
        user_context: Optional[Dict[str, Any]] = None,
        llm_assist_headers_only: bool = False,
        candidate_id: Optional[str] = None,
    ) -> bytes:
        try:
            extracted = self._extract_pl_from_excel_bytes(filename=filename, content=content, candidate_id=candidate_id)

            if extracted and extracted.get("values_by_category"):
                period_count = int(extracted.get("period_count") or 0)
                line_item_count = int(extracted.get("line_item_count") or 0)
                has_revenue = bool(extracted.get("has_revenue"))
                has_expense = bool(extracted.get("has_expense"))

                nonzero_cells = 0
                values_by_category = extracted.get("values_by_category") or {}
                if isinstance(values_by_category, dict):
                    for _k, vals in values_by_category.items():
                        if not isinstance(vals, list):
                            continue
                        for v in vals:
                            if isinstance(v, (int, float)) and v != 0:
                                nonzero_cells += 1

                conf = self._compute_extraction_confidence(
                    period_count=period_count,
                    line_item_count=line_item_count,
                    nonzero_cells=nonzero_cells,
                    has_revenue=has_revenue,
                    has_expense=has_expense,
                )

                # Strict mode (Option A): if we are not confident, require explicit user confirmation
                # via candidate_id selection from preview before generating an output workbook.
                if float(conf.get("confidence") or 0.0) < 0.75 and not candidate_id:
                    reasons = conf.get("reasons") or []
                    reason_text = "; ".join([str(r) for r in reasons if r])
                    msg = (
                        "Could not confidently build a P&L from this upload (strict mode). "
                        "Use Preview to select the correct detected table, then Generate again."
                    )
                    if reason_text:
                        msg = f"{msg} Reasons: {reason_text}"
                    raise Exception(msg)

            spec = await self._parse_pl_request(prompt or "", user_context)

            if extracted:
                if extracted.get("period_labels"):
                    spec["period_labels"] = extracted["period_labels"]
                    spec["period_count"] = len(extracted["period_labels"])
                if extracted.get("revenue_categories"):
                    spec["revenue_categories"] = extracted["revenue_categories"]
                if extracted.get("expense_categories"):
                    spec["expense_categories"] = extracted["expense_categories"]
                if extracted.get("values_by_category"):
                    spec["values_by_category"] = extracted["values_by_category"]

            spec = self._normalize_spec_from_extraction(spec)

            if llm_assist_headers_only:
                spec = await self._apply_llm_header_assist(spec)

            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Profit & Loss"

            self._build_pl_structure(ws, spec)
            self._add_formulas(ws, spec)
            self._add_charts(ws, spec)
            self._format_worksheet(ws, spec)

            output = io.BytesIO()
            wb.save(output)
            output.seek(0)
            return output.read()
        except Exception as e:
            logger.error(f"Error generating P&L from uploaded Excel: {str(e)}")
            raise Exception(f"P&L generation failed: {str(e)}")

    def _normalize_spec_from_extraction(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        values_by_category = spec.get("values_by_category") or {}
        if not isinstance(values_by_category, dict) or not values_by_category:
            return spec

        extracted_items: List[str] = []
        for k in values_by_category.keys():
            if k is None:
                continue
            s = str(k).strip()
            if not s:
                continue
            extracted_items.append(s)

        if not extracted_items:
            return spec

        revenue = spec.get("revenue_categories") or []
        expense = spec.get("expense_categories") or []

        if not isinstance(revenue, list):
            revenue = []
        if not isinstance(expense, list):
            expense = []

        revenue = [str(x).strip() for x in revenue if x is not None and str(x).strip()]
        expense = [str(x).strip() for x in expense if x is not None and str(x).strip()]

        rev_set = set([x.lower() for x in revenue])
        exp_set = set([x.lower() for x in expense])

        if not revenue and not expense:
            for item in extracted_items:
                bucket = self._classify_line_item(item)
                if bucket == "revenue":
                    revenue.append(item)
                elif bucket == "expense":
                    expense.append(item)
                else:
                    expense.append(item)
        else:
            for item in extracted_items:
                key = item.lower()
                if key in rev_set or key in exp_set:
                    continue
                bucket = self._classify_line_item(item)
                if bucket == "revenue":
                    revenue.append(item)
                    rev_set.add(key)
                elif bucket == "expense":
                    expense.append(item)
                    exp_set.add(key)
                else:
                    expense.append(item)
                    exp_set.add(key)

        revenue = self._dedupe_keep_order(revenue)
        expense = self._dedupe_keep_order(expense)

        spec["revenue_categories"] = revenue
        spec["expense_categories"] = expense
        return spec

    async def _parse_pl_request(
        self,
        prompt: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Parse natural language request into structured P&L specification"""

        extracted = self._extract_uploaded_file_hints(prompt)

        system_prompt = """
        You are a financial statement generator. Parse the user's request and generate a JSON specification for a Profit & Loss statement.

        Respond with JSON containing:
        {
            "period_type": "monthly|quarterly|yearly",
            "period_count": 12,
            "start_date": "2024-01-01",
            "revenue_categories": ["Sales", "Services", "Other Income"],
            "expense_categories": ["Cost of Goods Sold", "Operating Expenses", "Marketing", "R&D", "Administrative"],
            "currency": "USD",
            "company_name": "Company Name",
            "include_charts": true,
            "include_percentages": true,
            "notes": "Additional notes"
        }

        Extract as much information as possible from the prompt. Use defaults for missing information.
        """

        full_prompt = f"""
        {prompt}
        
        {f'Additional context: {json.dumps(user_context)}' if user_context else ''}
        """

        try:
            response = await invoke_llm(
                prompt=full_prompt,
                response_schema={"type": "json_object"},
                max_tokens=2000
            )

            # Validate and set defaults
            spec = {
                "period_type": response.get("period_type", "monthly"),
                "period_count": response.get("period_count", 12),
                "start_date": response.get("start_date", datetime.now().strftime("%Y-01-01")),
                "revenue_categories": response.get("revenue_categories", ["Revenue", "Other Income"]),
                "expense_categories": response.get("expense_categories", ["Cost of Goods Sold", "Operating Expenses"]),
                "currency": response.get("currency", "USD"),
                "company_name": response.get("company_name", "Company"),
                "include_charts": response.get("include_charts", True),
                "include_percentages": response.get("include_percentages", True),
                "notes": response.get("notes", "")
            }

            if user_context:
                cn = (user_context.get("company_name") or "").strip()
                if cn:
                    spec["company_name"] = cn
                cur = (user_context.get("currency") or "").strip()
                if cur:
                    spec["currency"] = cur
                pt = (user_context.get("period_type") or "").strip()
                if pt:
                    spec["period_type"] = pt

            spec = self._apply_extracted_hints(spec, extracted)

            return spec

        except Exception as e:
            logger.error(f"Error parsing PL request: {str(e)}")
            # Return default spec if parsing fails
            spec = {
                "period_type": "monthly",
                "period_count": 12,
                "start_date": datetime.now().strftime("%Y-01-01"),
                "revenue_categories": ["Revenue", "Other Income"],
                "expense_categories": ["Cost of Goods Sold", "Operating Expenses"],
                "currency": "USD",
                "company_name": "Company",
                "include_charts": True,
                "include_percentages": True,
                "notes": ""
            }

            if user_context:
                cn = (user_context.get("company_name") or "").strip()
                if cn:
                    spec["company_name"] = cn
                cur = (user_context.get("currency") or "").strip()
                if cur:
                    spec["currency"] = cur
                pt = (user_context.get("period_type") or "").strip()
                if pt:
                    spec["period_type"] = pt

            spec = self._apply_extracted_hints(spec, extracted)
            return spec

    def _workbook_has_formulas(self, content: bytes) -> bool:
        """Best-effort: detect presence of formulas in workbook.

        openpyxl cannot evaluate formulas; it can only read cached values when
        data_only=True. If a workbook relies heavily on formulas and was not saved
        with cached results, extracted numbers will look like zeros.
        """
        try:
            wb = load_workbook(io.BytesIO(content), data_only=False, read_only=True)
            try:
                for ws in wb.worksheets[:8]:
                    max_rows = min(getattr(ws, "max_row", 0) or 0, 120)
                    max_cols = min(getattr(ws, "max_column", 0) or 0, 40)
                    if max_rows <= 0 or max_cols <= 0:
                        continue
                    for r in range(1, max_rows + 1):
                        for c in range(1, max_cols + 1):
                            cell = ws.cell(row=r, column=c)
                            if getattr(cell, "data_type", None) == "f":
                                return True
                            v = cell.value
                            if isinstance(v, str) and v.startswith("="):
                                return True
                return False
            finally:
                try:
                    wb.close()
                except Exception:
                    pass
        except Exception:
            return False

    async def _apply_llm_header_assist(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        try:
            revenue = spec.get("revenue_categories") or []
            expense = spec.get("expense_categories") or []
            periods = spec.get("period_labels") or []

            prompt = (
                "You are a financial statement assistant. You will be given statement headers/labels only (no amounts). "
                "Your job is to improve categorization and ordering of Revenue and Expense line items for a P&L. "
                "Do not invent new items not present in the input unless absolutely necessary. "
                "Respond with JSON: {\"revenue_categories\": [...], \"expense_categories\": [...]}\n\n"
                f"Periods: {periods}\n"
                f"Revenue labels: {revenue}\n"
                f"Expense labels: {expense}\n"
            )
            response = await invoke_llm(
                prompt=prompt,
                response_schema={"type": "json_object"},
                max_tokens=800,
            )
            if isinstance(response, dict):
                rc = response.get("revenue_categories")
                ec = response.get("expense_categories")
                if isinstance(rc, list) and rc:
                    spec["revenue_categories"] = [str(x) for x in rc if str(x).strip()]
                if isinstance(ec, list) and ec:
                    spec["expense_categories"] = [str(x) for x in ec if str(x).strip()]
            return spec
        except Exception:
            return spec

    def _extract_pl_from_excel_bytes(self, filename: str, content: bytes, candidate_id: Optional[str] = None) -> Dict[str, Any]:
        candidates = self._extract_pl_candidates_from_excel_bytes(filename=filename, content=content)
        if not candidates:
            return {}
        if candidate_id:
            for c in candidates:
                if c.get("candidate_id") == candidate_id:
                    return c
        return candidates[0]

    def _extract_pl_candidates_from_excel_bytes(self, filename: str, content: bytes) -> List[Dict[str, Any]]:
        ext = (filename or "").lower().split(".")[-1] if "." in (filename or "") else ""
        if ext not in ("xlsx", "xls"):
            return []

        has_formulas = self._workbook_has_formulas(content)
        wb = load_workbook(io.BytesIO(content), data_only=True, read_only=False)
        try:
            candidates = self._extract_pl_candidates_from_workbook(wb)
            if has_formulas and candidates:
                for c in candidates:
                    diag = c.get("diagnostics")
                    if not isinstance(diag, dict):
                        diag = {}
                    diag["workbook_has_formulas"] = True
                    c["diagnostics"] = diag
            return candidates
        finally:
            try:
                wb.close()
            except Exception:
                pass

    def _extract_pl_from_workbook(self, wb) -> Dict[str, Any]:
        candidates = self._extract_pl_candidates_from_workbook(wb)
        if not candidates:
            return {}
        return candidates[0]

    def _extract_pl_candidates_from_workbook(self, wb) -> List[Dict[str, Any]]:
        scored: List[Dict[str, Any]] = []

        for ws in wb.worksheets:
            title = (ws.title or "").lower()
            score = 0.0
            if any(k in title for k in ["income", "p&l", "pnl", "profit", "financial"]):
                score += 2

            extracted = self._try_extract_statement_from_sheet(ws)
            if not extracted:
                extracted = self._try_extract_statement_vertical_periods(ws)
            if not extracted:
                continue

            score += float(extracted.get("score", 0.0) or 0.0)
            if extracted.get("line_item_count", 0) >= 5:
                score += 2
            if extracted.get("period_count", 0) >= 6:
                score += 1
            if extracted.get("has_revenue"):
                score += 0.5
            if extracted.get("has_expense"):
                score += 0.5

            extracted["score"] = float(extracted.get("score", 0.0) or 0.0) + score
            extracted["candidate_id"] = self._candidate_id_for_extraction(extracted)
            scored.append(extracted)

        scored.sort(key=lambda x: float(x.get("score", 0.0) or 0.0), reverse=True)
        return scored

    def _try_extract_statement_from_sheet(self, ws) -> Optional[Dict[str, Any]]:
        max_rows = min(getattr(ws, "max_row", 0) or 0, 500)
        max_cols = min(getattr(ws, "max_column", 0) or 0, 80)
        if max_rows <= 1 or max_cols <= 1:
            return None

        merged_lookup = self._build_merged_lookup(ws)

        header_row_idx = None
        period_cols = []
        period_labels = []

        for r in range(1, max_rows + 1):
            labels = []
            cols = []
            for c in range(1, max_cols + 1):
                v = self._get_cell_value(ws, r, c, merged_lookup)
                label = self._period_label_from_cell(v)
                if label:
                    labels.append(label)
                    cols.append(c)
            if len(labels) >= 4:
                header_row_idx = r
                period_cols = cols
                period_labels = labels
                break

        if not header_row_idx or not period_cols:
            return None

        line_item_col = None
        for c in range(1, min(period_cols) + 1):
            hv = self._get_cell_value(ws, header_row_idx, c, merged_lookup)
            if hv is None:
                continue
            t = str(hv).strip().lower()
            if any(k in t for k in ["line", "item", "category", "account", "description", "name"]):
                line_item_col = c
                break
        if not line_item_col:
            line_item_col = 1

        values_by_category: Dict[str, List[float]] = {}
        revenue_categories: List[str] = []
        expense_categories: List[str] = []
        has_revenue = False
        has_expense = False

        empty_streak = 0
        for r in range(header_row_idx + 1, max_rows + 1):
            raw_item = self._get_cell_value(ws, r, line_item_col, merged_lookup)
            item = str(raw_item).strip() if raw_item is not None else ""
            if not item or item.lower() == "nan":
                empty_streak += 1
                if empty_streak >= 8:
                    break
                continue
            empty_streak = 0

            if item.strip().upper() in {"REVENUE", "EXPENSES", "COSTS", "OPERATING EXPENSES"}:
                continue
            if item.strip().lower() in {"total revenue", "total expenses", "net profit", "net profit / (loss)", "net income"}:
                continue

            vals: List[float] = []
            numeric_count = 0
            for c in period_cols:
                v = self._get_cell_value(ws, r, c, merged_lookup)
                if isinstance(v, (int, float)):
                    vals.append(float(v))
                    if v != 0:
                        numeric_count += 1
                else:
                    vals.append(0.0)

            if numeric_count == 0:
                continue

            values_by_category[item] = vals
            bucket = self._classify_line_item(item)
            if bucket == "revenue":
                revenue_categories.append(item)
                has_revenue = True
            elif bucket == "expense":
                expense_categories.append(item)
                has_expense = True

        revenue_categories = self._dedupe_keep_order(revenue_categories)
        expense_categories = self._dedupe_keep_order(expense_categories)

        if not values_by_category:
            return None

        warnings: List[str] = []
        nonzero_cells = 0
        for _k, vals in values_by_category.items():
            for v in vals:
                if isinstance(v, (int, float)) and v != 0:
                    nonzero_cells += 1
        if nonzero_cells == 0:
            warnings.append(
                "All extracted numeric cells are 0. If your model uses formulas, ensure the workbook is saved with calculated values (Excel caches results), then upload again."
            )

        return {
            "diagnostics": {
                "layout": "horizontal_periods",
                "sheet": ws.title,
                "header_row": header_row_idx,
                "line_item_col": line_item_col,
                "period_cols": period_cols,
                "max_rows_scanned": max_rows,
                "max_cols_scanned": max_cols,
            },
            "warnings": warnings,
            "period_labels": period_labels,
            "period_count": len(period_labels),
            "values_by_category": values_by_category,
            "revenue_categories": revenue_categories,
            "expense_categories": expense_categories,
            "line_item_count": len(values_by_category),
            "has_revenue": has_revenue,
            "has_expense": has_expense,
            "score": 1.0,
        }

    def _try_extract_statement_vertical_periods(self, ws) -> Optional[Dict[str, Any]]:
        max_rows = min(getattr(ws, "max_row", 0) or 0, 800)
        max_cols = min(getattr(ws, "max_column", 0) or 0, 80)
        if max_rows <= 1 or max_cols <= 1:
            return None

        merged_lookup = self._build_merged_lookup(ws)

        best = None
        best_score = -1.0

        for c in range(1, max_cols + 1):
            period_rows: List[int] = []
            period_labels: List[str] = []
            for r in range(1, max_rows + 1):
                v = self._get_cell_value(ws, r, c, merged_lookup)
                label = self._period_label_from_cell(v)
                if label:
                    period_rows.append(r)
                    period_labels.append(label)
                if len(period_labels) >= 18:
                    break

            if len(period_labels) < 4:
                continue

            start_row = period_rows[0]

            header_row = start_row - 1 if start_row > 1 else start_row
            header_vals: List[str] = []
            header_cols: List[int] = []
            for hc in range(c + 1, max_cols + 1):
                hv = self._get_cell_value(ws, header_row, hc, merged_lookup)
                if hv is None:
                    continue
                t = str(hv).strip()
                if not t:
                    continue
                if self._period_label_from_cell(hv):
                    continue
                header_vals.append(t)
                header_cols.append(hc)

            if not header_cols:
                continue

            values_by_category: Dict[str, List[float]] = {}
            revenue_categories: List[str] = []
            expense_categories: List[str] = []
            has_revenue = False
            has_expense = False

            for idx, hc in enumerate(header_cols):
                name = header_vals[idx]
                vals: List[float] = []
                numeric_count = 0
                for pr in period_rows[: len(period_labels)]:
                    v = self._get_cell_value(ws, pr, hc, merged_lookup)
                    if isinstance(v, (int, float)):
                        fv = float(v)
                        vals.append(fv)
                        if fv != 0:
                            numeric_count += 1
                    else:
                        vals.append(0.0)

                if numeric_count == 0:
                    continue
                values_by_category[name] = vals
                bucket = self._classify_line_item(name)
                if bucket == "revenue":
                    revenue_categories.append(name)
                    has_revenue = True
                elif bucket == "expense":
                    expense_categories.append(name)
                    has_expense = True

            revenue_categories = self._dedupe_keep_order(revenue_categories)
            expense_categories = self._dedupe_keep_order(expense_categories)

            if not values_by_category:
                continue

            warnings: List[str] = []
            nonzero_cells = 0
            for _k, vals in values_by_category.items():
                for v in vals:
                    if isinstance(v, (int, float)) and v != 0:
                        nonzero_cells += 1
            if nonzero_cells == 0:
                warnings.append(
                    "All extracted numeric cells are 0. If your model uses formulas, ensure the workbook is saved with calculated values (Excel caches results), then upload again."
                )

            score = 0.8
            score += 0.05 * min(len(period_labels), 12)
            score += 0.02 * min(len(values_by_category), 30)
            if has_revenue:
                score += 0.3
            if has_expense:
                score += 0.3

            candidate = {
                "diagnostics": {
                    "layout": "vertical_periods",
                    "sheet": ws.title,
                    "period_col": c,
                    "period_rows": period_rows[: len(period_labels)],
                    "header_row": header_row,
                    "data_cols": header_cols,
                    "max_rows_scanned": max_rows,
                    "max_cols_scanned": max_cols,
                },
                "warnings": warnings,
                "period_labels": period_labels,
                "period_count": len(period_labels),
                "values_by_category": values_by_category,
                "revenue_categories": revenue_categories,
                "expense_categories": expense_categories,
                "line_item_count": len(values_by_category),
                "has_revenue": has_revenue,
                "has_expense": has_expense,
                "score": score,
            }

            if score > best_score:
                best_score = score
                best = candidate

        return best

    def _compute_extraction_confidence(
        self,
        period_count: int,
        line_item_count: int,
        nonzero_cells: int,
        has_revenue: bool,
        has_expense: bool,
    ) -> Dict[str, Any]:
        reasons: List[str] = []
        score = 0.0

        if period_count >= 4:
            score += 0.25
        else:
            reasons.append("Fewer than 4 period columns/rows detected")

        if line_item_count >= 5:
            score += 0.25
        else:
            reasons.append("Fewer than 5 line items detected")

        if nonzero_cells > 0:
            score += 0.25
        else:
            reasons.append("No non-zero numeric cells detected (may be formula cache)")

        if has_revenue:
            score += 0.125
        else:
            reasons.append("Could not confidently identify revenue labels")

        if has_expense:
            score += 0.125
        else:
            reasons.append("Could not confidently identify expense labels")

        confidence = max(0.0, min(1.0, score))

        if confidence >= 0.75:
            recommendation = "local_ok"
        elif confidence >= 0.45:
            recommendation = "local_low_confidence"
        else:
            recommendation = "server_recommended_with_consent"

        return {
            "confidence": confidence,
            "recommendation": recommendation,
            "reasons": reasons,
        }

    def _period_label_from_cell(self, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, datetime):
            return v.strftime("%b %Y")
        if isinstance(v, date):
            return v.strftime("%b %Y")
        s = str(v).strip()
        if not s:
            return None

        if "total" in s.strip().lower():
            return None

        s2 = re.sub(r"^(act\.|act|actual)\s*", "", s, flags=re.IGNORECASE).strip()

        # e.g. Jan-26 / Jan 26 / Jan-2026
        m_my = re.match(r"^([A-Za-z]{3})[-\s](\d{2}|\d{4})$", s2)
        if m_my:
            mon = m_my.group(1).title()
            yy = m_my.group(2)
            if len(yy) == 2:
                year = 2000 + int(yy)
            else:
                year = int(yy)
            return f"{mon} {year}"

        m = re.search(r"(\d{1,2}/\d{1,2}/\d{2,4})", s)
        if m:
            return m.group(1)

        if self._looks_like_period_label(s2):
            return s2
        return None

    def _build_merged_lookup(self, ws) -> Dict[tuple, tuple]:
        lookup: Dict[tuple, tuple] = {}
        try:
            ranges = list(getattr(ws, "merged_cells", []).ranges)
        except Exception:
            ranges = []
        for r in ranges:
            try:
                min_row = int(r.min_row)
                max_row = int(r.max_row)
                min_col = int(r.min_col)
                max_col = int(r.max_col)
            except Exception:
                continue
            for rr in range(min_row, max_row + 1):
                for cc in range(min_col, max_col + 1):
                    lookup[(rr, cc)] = (min_row, min_col)
        return lookup

    def _get_cell_value(self, ws, row: int, col: int, merged_lookup: Dict[tuple, tuple]) -> Any:
        v = ws.cell(row=row, column=col).value
        if v is not None:
            return v
        tl = merged_lookup.get((row, col))
        if not tl:
            return v
        tl_row, tl_col = tl
        return ws.cell(row=tl_row, column=tl_col).value

    def _candidate_id_for_extraction(self, extracted: Dict[str, Any]) -> str:
        diag = extracted.get("diagnostics") or {}
        sheet = str(diag.get("sheet") or "")
        layout = str(diag.get("layout") or "")
        header_row = str(diag.get("header_row") or "")
        line_item_col = str(diag.get("line_item_col") or "")
        period_col = str(diag.get("period_col") or "")
        return f"{sheet}:{layout}:{header_row}:{line_item_col}:{period_col}"

    def _extract_uploaded_file_hints(self, prompt: str) -> Dict[str, Any]:
        if not prompt:
            return {}
        if "UPLOADED FILE CONTEXT" not in prompt:
            return {}

        previews: List[str] = []
        for m in re.finditer(r"# Sheet:\s*(.+?)\nRows:.*?\n\n(.*?)(?:\n\n# Sheet:|\Z)", prompt, flags=re.DOTALL):
            csv_block = (m.group(2) or "").strip()
            if csv_block:
                previews.append(csv_block)

        if not previews:
            return {}

        candidates: Dict[str, Any] = {"revenue": [], "expense": [], "periods": []}

        for csv_text in previews[:3]:
            try:
                df = pd.read_csv(io.StringIO(csv_text))
            except Exception:
                continue
            if df is None or df.empty:
                continue

            cols = [str(c) for c in df.columns]
            period_cols = [c for c in cols if self._looks_like_period_label(c)]
            if period_cols and not candidates["periods"]:
                candidates["periods"] = period_cols[:24]

            item_col = self._pick_line_item_column(cols)
            if not item_col:
                continue

            raw_items = [str(v).strip() for v in df[item_col].tolist()[:80] if str(v).strip() and str(v).strip().lower() != "nan"]
            for item in raw_items:
                bucket = self._classify_line_item(item)
                if bucket == "revenue":
                    candidates["revenue"].append(item)
                elif bucket == "expense":
                    candidates["expense"].append(item)

        candidates["revenue"] = self._dedupe_keep_order(candidates["revenue"])[:25]
        candidates["expense"] = self._dedupe_keep_order(candidates["expense"])[:25]

        if not candidates["revenue"] and not candidates["expense"] and not candidates["periods"]:
            return {}
        return candidates

    def _apply_extracted_hints(self, spec: Dict[str, Any], extracted: Dict[str, Any]) -> Dict[str, Any]:
        if not extracted:
            return spec

        revenue = extracted.get("revenue") or []
        expense = extracted.get("expense") or []
        periods = extracted.get("periods") or []

        if revenue:
            spec["revenue_categories"] = revenue
        if expense:
            spec["expense_categories"] = expense

        if periods:
            if len(periods) <= 4:
                spec["period_type"] = "quarterly"
            elif len(periods) <= 14:
                spec["period_type"] = "monthly"
            else:
                spec["period_type"] = spec.get("period_type") or "monthly"
            spec["period_count"] = len(periods)
        return spec

    def _dedupe_keep_order(self, items: List[str]) -> List[str]:
        seen = set()
        out: List[str] = []
        for x in items:
            k = (x or "").strip().lower()
            if not k or k in seen:
                continue
            seen.add(k)
            out.append(x)
        return out

    def _pick_line_item_column(self, cols: List[str]) -> Optional[str]:
        preferred = ["line item", "category", "account", "name", "description", "item"]
        for p in preferred:
            for c in cols:
                if str(c).strip().lower() == p:
                    return c
        for c in cols:
            cl = str(c).strip().lower()
            if any(p in cl for p in preferred):
                return c
        return None

    def _looks_like_period_label(self, s: str) -> bool:
        if not s:
            return False
        t = str(s).strip()
        if not t:
            return False
        if "total" in t.strip().lower():
            return False

        # Normalize common prefixes
        t_norm = re.sub(r"^(act\.|act|actual)\s*", "", t, flags=re.IGNORECASE).strip()
        if re.match(r"^(q[1-4])\s*\d{4}$", t, flags=re.IGNORECASE):
            return True
        if re.match(r"^[A-Za-z]{3}\s+\d{4}$", t):
            return True
        if re.match(r"^[A-Za-z]{3}[-\s]\d{2}$", t_norm):
            return True
        if re.match(r"^[A-Za-z]{3}[-\s]\d{4}$", t_norm):
            return True
        if re.match(r"^\d{4}[-/]\d{1,2}$", t):
            return True
        if re.match(r"^\d{1,2}/\d{1,2}/\d{2,4}$", t):
            return True
        if re.search(r"\d{4}", t) and re.search(r"[A-Za-z]{3}", t):
            return True
        return False

    def _classify_line_item(self, item: str) -> Optional[str]:
        t = (item or "").strip().lower()
        if not t:
            return None
        if any(k in t for k in ["revenue", "sales", "income", "turnover", "other income", "service revenue"]):
            return "revenue"
        if any(k in t for k in ["cogs", "cost of goods", "expense", "opex", "operating", "marketing", "rent", "salary", "wage", "payroll", "tax", "interest", "depreciation", "amortization", "rd", "r&d"]):
            return "expense"
        return None

    def _build_pl_structure(self, ws, spec: Dict[str, Any]):
        """Build the P&L structure in Excel"""

        row = 1

        # Title
        ws.merge_cells(f'A{row}:D{row}')
        cell = ws[f'A{row}']
        cell.value = f"{spec['company_name']} - Profit & Loss Statement"
        cell.font = Font(size=16, bold=True)
        row += 2

        # Period header
        periods = self._generate_periods(spec)
        header_row = row

        # Column headers
        ws[f'A{header_row}'] = "Category"
        ws[f'B{header_row}'] = "Type"
        for idx, period in enumerate(periods, start=3):
            col_letter = get_column_letter(idx)
            ws[f'{col_letter}{header_row}'] = period

        # Total column
        total_col = len(periods) + 3
        total_col_letter = get_column_letter(total_col)
        ws[f'{total_col_letter}{header_row}'] = "Total"

        row += 1

        # Revenue section
        ws[f'A{row}'] = "REVENUE"
        ws[f'A{row}'].font = Font(bold=True, size=12)
        row += 1

        revenue_start_row = row
        for category in spec['revenue_categories']:
            ws[f'A{row}'] = category
            ws[f'B{row}'] = "Revenue"
            values_by_category = spec.get('values_by_category') or {}
            vals = values_by_category.get(category)
            for p_idx in range(len(periods)):
                col_letter = get_column_letter(3 + p_idx)
                if isinstance(vals, list) and p_idx < len(vals):
                    ws[f'{col_letter}{row}'] = vals[p_idx]
                else:
                    ws[f'{col_letter}{row}'] = 0
            row += 1

        revenue_end_row = row - 1

        # Total Revenue
        ws[f'A{row}'] = "Total Revenue"
        ws[f'A{row}'].font = Font(bold=True)
        for idx in range(3, total_col + 1):
            col_letter = get_column_letter(idx)
            ws[f'{col_letter}{row}'] = f"=SUM({get_column_letter(idx)}{revenue_start_row}:{get_column_letter(idx)}{revenue_end_row})"
        row += 2

        # Expense section
        ws[f'A{row}'] = "EXPENSES"
        ws[f'A{row}'].font = Font(bold=True, size=12)
        row += 1

        expense_start_row = row
        for category in spec['expense_categories']:
            ws[f'A{row}'] = category
            ws[f'B{row}'] = "Expense"
            values_by_category = spec.get('values_by_category') or {}
            vals = values_by_category.get(category)
            for p_idx in range(len(periods)):
                col_letter = get_column_letter(3 + p_idx)
                if isinstance(vals, list) and p_idx < len(vals):
                    ws[f'{col_letter}{row}'] = vals[p_idx]
                else:
                    ws[f'{col_letter}{row}'] = 0
            row += 1

        expense_end_row = row - 1

        # Total Expenses
        ws[f'A{row}'] = "Total Expenses"
        ws[f'A{row}'].font = Font(bold=True)
        for idx in range(3, total_col + 1):
            col_letter = get_column_letter(idx)
            ws[f'{col_letter}{row}'] = f"=SUM({get_column_letter(idx)}{expense_start_row}:{get_column_letter(idx)}{expense_end_row})"
        row += 2

        # Net Profit/Loss
        revenue_total_col = get_column_letter(total_col)
        expense_total_col = get_column_letter(total_col)
        revenue_row = revenue_end_row + 1
        expense_row = expense_end_row + 1

        ws[f'A{row}'] = "NET PROFIT / (LOSS)"
        ws[f'A{row}'].font = Font(bold=True, size=12)
        for idx in range(3, total_col + 1):
            col_letter = get_column_letter(idx)
            ws[f'{col_letter}{row}'] = f"={get_column_letter(idx)}{revenue_row}-{get_column_letter(idx)}{expense_row}"

        # Store structure info for formulas and charts
        spec['structure'] = {
            'header_row': header_row,
            'revenue_start': revenue_start_row,
            'revenue_end': revenue_end_row,
            'revenue_total_row': revenue_row,
            'expense_start': expense_start_row,
            'expense_end': expense_end_row,
            'expense_total_row': expense_row,
            'net_row': row,
            'total_col': total_col,
            'periods': periods
        }

    def _generate_periods(self, spec: Dict[str, Any]) -> List[str]:
        """Generate period labels based on specification"""
        labels = spec.get('period_labels')
        if isinstance(labels, list) and labels:
            return [str(x) for x in labels if str(x).strip()]

        periods = []
        start_date = datetime.strptime(spec['start_date'], "%Y-%m-%d")
        period_type = spec['period_type']
        count = spec['period_count']

        for i in range(count):
            if period_type == "monthly":
                date = start_date + timedelta(days=30 * i)
                periods.append(date.strftime("%b %Y"))
            elif period_type == "quarterly":
                date = start_date + timedelta(days=90 * i)
                quarter = (date.month - 1) // 3 + 1
                periods.append(f"Q{quarter} {date.year}")
            else:  # yearly
                date = start_date + timedelta(days=365 * i)
                periods.append(str(date.year))

        return periods

    def _add_formulas(self, ws, spec: Dict[str, Any]):
        """Add Excel formulas for calculations"""
        # Formulas are already added in _build_pl_structure
        # This method can be extended for additional formulas
        pass

    def _add_charts(self, ws, spec: Dict[str, Any]):
        """Add charts to the worksheet"""
        if not spec.get('include_charts', True):
            return

        structure = spec['structure']
        chart_row = structure['net_row'] + 3

        # Revenue vs Expenses Chart
        chart = BarChart()
        chart.type = "col"
        chart.style = 10
        chart.title = "Revenue vs Expenses"
        chart.y_axis.title = "Amount"
        chart.x_axis.title = "Period"

        # Data ranges
        periods = structure['periods']
        data_cols = [get_column_letter(i) for i in range(3, 3 + len(periods))]

        # Revenue data
        revenue_data = Reference(
            ws,
            min_col=3,
            min_row=structure['revenue_total_row'],
            max_col=3 + len(periods) - 1,
            max_row=structure['revenue_total_row']
        )

        # Expense data
        expense_data = Reference(
            ws,
            min_col=3,
            min_row=structure['expense_total_row'],
            max_col=3 + len(periods) - 1,
            max_row=structure['expense_total_row']
        )

        # Categories
        cats = Reference(
            ws,
            min_col=3,
            min_row=structure['header_row'],
            max_col=3 + len(periods) - 1,
            max_row=structure['header_row']
        )

        chart.add_data(revenue_data, titles_from_data=True)
        chart.add_data(expense_data, titles_from_data=True)
        chart.set_categories(cats)

        # Position chart
        ws.add_chart(chart, f"A{chart_row}")

    def _format_worksheet(self, ws, spec: Dict[str, Any]):
        """Apply formatting to the worksheet"""

        # Header row formatting
        header_row = spec['structure']['header_row']
        for cell in ws[header_row]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color=self.theme_colors['header'], end_color=self.theme_colors['header'], fill_type="solid")
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )

        # Column widths
        ws.column_dimensions['A'].width = 25
        ws.column_dimensions['B'].width = 15
        for idx in range(3, spec['structure']['total_col'] + 1):
            col_letter = get_column_letter(idx)
            ws.column_dimensions[col_letter].width = 15

        # Number formatting
        for row in ws.iter_rows(min_row=header_row + 1, max_row=spec['structure']['net_row']):
            for cell in row[2:]:  # Skip first two columns
                if cell.value and isinstance(cell.value, (int, float)):
                    cell.number_format = f'$#,##0.00'

        # Revenue rows - green
        for row in range(spec['structure']['revenue_start'], spec['structure']['revenue_end'] + 1):
            for cell in ws[row]:
                if cell.column > 2:  # Data columns
                    cell.fill = PatternFill(start_color='E8F5E9', end_color='E8F5E9', fill_type="solid")

        # Expense rows - light red
        for row in range(spec['structure']['expense_start'], spec['structure']['expense_end'] + 1):
            for cell in ws[row]:
                if cell.column > 2:
                    cell.fill = PatternFill(start_color='FFEBEE', end_color='FFEBEE', fill_type="solid")

        # Net row - highlight
        net_row = spec['structure']['net_row']
        for cell in ws[net_row]:
            cell.font = Font(bold=True, size=12)
            if cell.column > 2:
                cell.fill = PatternFill(start_color='FFF9C4', end_color='FFF9C4', fill_type="solid")
