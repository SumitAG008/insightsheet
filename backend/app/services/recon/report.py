"""
Outputs of a reconciliation: an Excel workbook (summary with the proof, matches, exceptions, the
open items) and an open-items file to bring back next month so they carry forward. Nothing is kept
on the server: next month's run reads the open items back from that file.
"""
from __future__ import annotations

import io
from datetime import date
from typing import Any, Dict, List, Optional

import pandas as pd

from app.services.recon.engine import PASS_TEXT
from app.services.recon.parse import parse_amount, parse_date, reference_keys, name_tokens

OPEN_ITEM_COLUMNS = ["side", "date", "amount", "reference", "description", "counterparty", "currency", "first_seen", "kind"]
KIND_TEXT = {
    "fee": "Likely fee / charge", "partial": "Partial or short payment", "timing": "Timing difference", "duplicate": "Possible duplicate",
    "next_period": "Next period", "missing_other": "Not on the other side", "tds": "TDS / withholding deducted", "uncleared": "Cheque not yet cleared",
}


def _row_lookup(rows: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {r["id"]: r for r in rows}


def open_items(result: Dict[str, Any], as_of: Optional[str]) -> List[Dict[str, Any]]:
    out = []
    for e in result["exceptions"]:
        first = e.get("first_seen") or e.get("date")
        age = (date.fromisoformat(as_of) - date.fromisoformat(first)).days if as_of and first else None
        out.append({"side": e["side"], "date": e["date"], "amount": e["amount"], "reference": e["reference"], "description": e["description"],
                    "counterparty": e.get("counterparty", ""), "currency": "", "first_seen": first, "kind": e["kind"], "age_days": age})
    return out


def read_open_items(filename: str, content: bytes) -> Dict[str, List[Dict[str, Any]]]:
    """Last month's open-items file → rows for side A and side B, marked as carried forward."""
    from app.services.recon.parse import read_table

    headers, rows = read_table(filename, content)
    lower = {h.lower(): h for h in headers}
    if "side" not in lower or "amount" not in lower:
        raise ValueError("This is not a meldra open-items file (it needs 'side' and 'amount' columns).")
    out: Dict[str, List[Dict[str, Any]]] = {"A": [], "B": []}
    for i, r in enumerate(rows):
        side = str(r.get(lower["side"]) or "").strip().upper()[:1]
        amt = parse_amount(r.get(lower["amount"]))
        if side not in ("A", "B") or amt is None:
            continue
        d = parse_date(r.get(lower.get("date", "")), "DMY") if lower.get("date") else None
        first = parse_date(r.get(lower.get("first_seen", "")), "DMY") if lower.get("first_seen") else None
        ref = str(r.get(lower.get("reference", "")) or "") if lower.get("reference") else ""
        desc = str(r.get(lower.get("description", "")) or "") if lower.get("description") else ""
        cp = str(r.get(lower.get("counterparty", "")) or "") if lower.get("counterparty") else ""
        out[side].append({
            "id": f"{side}C{len(out[side]) + 1}", "side": side, "source_row": i + 2, "date": d.isoformat() if d else None,
            "amount": round(amt, 2), "reference": ref, "description": desc[:300], "counterparty": cp, "currency": "",
            "keys": reference_keys(ref, desc), "names": name_tokens(cp, desc), "carried": True,
            "first_seen": (first or d).isoformat() if (first or d) else None,
        })
    return out


def workbook(result: Dict[str, Any], a_rows: List[Dict[str, Any]], b_rows: List[Dict[str, Any]], labels: Dict[str, str],
             as_of: Optional[str], explanations: Optional[Dict[str, Any]] = None) -> bytes:
    A, B = _row_lookup(a_rows), _row_lookup(b_rows)
    s = result["summary"]
    expl = {it["id"]: it for it in (explanations or {}).get("items", [])}
    summary = [
        ["meldra reconciliation", ""],
        ["Side A", labels.get("a", "A")], ["Side B", labels.get("b", "B")], ["As of", as_of or ""],
        ["Amounts compared", "same sign" if result["factor"] == 1 else "opposite sign (a credit on one side is a debit on the other)"],
        [], ["Items", "A", "B"], ["Total", s["rows_a"], s["rows_b"]], ["Matched", s["matched_a"], s["matched_b"]],
        ["Open", s["rows_a"] - s["matched_a"], s["rows_b"] - s["matched_b"]], ["Match rate", f"{s['match_rate']:.1%}", ""],
        [], ["Proof", "Amount"], ["Total of A", s["total_a"]], ["Total of B (as compared)", s["total_b"]], ["Difference A − B", s["difference"]],
        ["  explained by open items in A", s["open_a"]], ["  less open items in B", -s["open_b"]], ["  differences accepted on matches", s["matched_differences"]],
        ["Proof", "agrees" if s["proof_ok"] else "DOES NOT AGREE: check the data"],
        [], ["Matched by", "Count"], *[[PASS_TEXT.get(k, k), v] for k, v in s["by_pass"].items() if v],
        [], ["Open items by type", "Count"], *[[KIND_TEXT.get(k, k), v] for k, v in s["by_kind"].items()],
    ]
    if explanations and explanations.get("summary"):
        summary += [[], ["AI summary (check before signing off)", explanations["summary"]]]
    matches = []
    for m in result["matches"]:
        for side, ids, rows in (("A", m["a"], A), ("B", m["b"], B)):
            for i in ids:
                r = rows[i]
                matches.append({"match": m["id"], "how": PASS_TEXT.get(m["pass"], m["pass"]), "side": side, "date": r["date"], "amount": r["amount"],
                                "reference": r["reference"], "description": r["description"], "source row": r["source_row"], "match difference": m["difference"], "note": m["why"]})
    exc = []
    for e in result["exceptions"]:
        x = expl.get(e["id"], {})
        exc.append({"id": e["id"], "side": e["side"], "date": e["date"], "amount": e["amount"], "reference": e["reference"], "description": e["description"],
                    "type": KIND_TEXT.get(e["kind"], e["kind"]), "engine note": e["hint"], "AI explanation": x.get("explanation", ""), "AI action": x.get("action", ""),
                    "candidates": "; ".join(f"{c['id']} {c['amount']:,.2f} {c['date'] or ''}" for c in e["candidates"]), "carried forward": "yes" if e.get("carried") else "", "source row": e["source_row"]})
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        pd.DataFrame(summary).to_excel(w, sheet_name="Summary", index=False, header=False)
        pd.DataFrame(matches or [{"match": "", "note": "No matches"}]).to_excel(w, sheet_name="Matched", index=False)
        pd.DataFrame(exc or [{"id": "", "type": "No open items"}]).to_excel(w, sheet_name="Open items", index=False)
        pd.DataFrame(open_items(result, as_of) or [{c: "" for c in OPEN_ITEM_COLUMNS}]).to_excel(w, sheet_name="Carry forward", index=False)
    return buf.getvalue()


def open_items_csv(result: Dict[str, Any], as_of: Optional[str]) -> bytes:
    df = pd.DataFrame(open_items(result, as_of), columns=[*OPEN_ITEM_COLUMNS, "age_days"])
    return df.to_csv(index=False).encode("utf-8")
