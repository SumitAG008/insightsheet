"""
Citation checking. Finds the case citations in a draft, puts each in a standard form, flags ones that
look wrong, merges duplicates and links each to where it can be checked.

Optional live verification:
  * UK neutral citations: the judgment's page on Find Case Law (The National Archives, Open Justice Licence).
  * India: the Indian Kanoon API, when INDIAN_KANOON_API_TOKEN is set (a paid, licensed source).
Without a source a citation is "not verified", never "verified". We never invent a citation.
"""
from __future__ import annotations

import re
from datetime import date
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

# --- India -----------------------------------------------------------------------------------
_IN_PATTERNS = [
    ("SCC", re.compile(r"\((\d{4})\)\s*(\d{1,2})\s*SCC\s*(\d{1,5})", re.I)),
    ("SCC OnLine", re.compile(r"(\d{4})\s*SCC\s*OnLine\s*([A-Z][A-Za-z]{0,6})\s*(\d{1,6})", re.I)),
    ("AIR", re.compile(r"AIR\s*(\d{4})\s*(SC|[A-Z][A-Za-z]{1,6})\s*(\d{1,5})")),
    ("SCR", re.compile(r"\[(\d{4})\]\s*(\d{1,2}|Supp(?:l)?\.?)\s*SCR\s*(\d{1,5})", re.I)),
    ("INSC", re.compile(r"(\d{4})\s*INSC\s*(\d{1,5})")),
    ("HC neutral", re.compile(r"(\d{4}):([A-Z]{2,6}(?:-[A-Z]{1,4})?):(\d{1,6})(?:-DB)?")),
    ("MANU", re.compile(r"MANU/([A-Z]{2,4})/(\d{1,5})/(\d{4})")),
]

# --- UK --------------------------------------------------------------------------------------
_UK_NEUTRAL = re.compile(
    r"\[(\d{4})\]\s*(UKSC|UKPC|UKHL|EWCA\s+(?:Civ|Crim)|EWHC|UKUT|UKFTT|EAT|EWFC|EWCOP)\s*(\d{1,5})"
    r"(?:\s*\((KB|QB|Ch|Comm|Fam|Admin|TCC|Pat|IPEC|Costs|SCCO|Admlty|Mercantile|IAC|LC|AAC|TCC|GRC|TC)\))?",
    re.I,
)
_UK_REPORT = re.compile(r"\[(\d{4})\]\s*(\d{1,2}\s*)?(AC|QB|KB|Ch|Fam|WLR|All\s*ER|Lloyd's\s*Rep|ICR|IRLR)\s*(\d{1,5})", re.I)

_FCL = "https://caselaw.nationalarchives.gov.uk"


def _fcl_path(year: str, court: str, num: str, div: Optional[str]) -> Optional[str]:
    c = re.sub(r"\s+", " ", court).upper()
    simple = {"UKSC": "uksc", "UKPC": "ukpc", "EAT": "eat", "EWFC": "ewfc", "EWCOP": "ewcop", "UKFTT": "ukftt"}
    if c in simple:
        base = simple[c]
        if c == "UKFTT" and div:
            return f"ukftt/{div.lower()}/{year}/{num}"
        return f"{base}/{year}/{num}"
    if c == "EWCA CIV":
        return f"ewca/civ/{year}/{num}"
    if c == "EWCA CRIM":
        return f"ewca/crim/{year}/{num}"
    if c == "EWHC" and div:
        return f"ewhc/{div.lower()}/{year}/{num}"
    if c == "UKUT" and div:
        return f"ukut/{div.lower()}/{year}/{num}"
    return None  # UKHL and others pre-date Find Case Law coverage


def _plausible_year(y: str) -> bool:
    try:
        return 1860 <= int(y) <= date.today().year
    except ValueError:
        return False


def extract(text: str) -> List[Dict[str, Any]]:
    """Every citation in the text, deduplicated, in order of first appearance."""
    t = text or ""
    found: List[Dict[str, Any]] = []
    seen = set()

    def add(item: Dict[str, Any], start: int) -> None:
        key = item["normalised"].lower()
        if key in seen:
            for f in found:
                if f["normalised"].lower() == key:
                    f["count"] += 1
            return
        seen.add(key)
        item["count"] = 1
        item["_pos"] = start
        found.append(item)

    for m in _UK_NEUTRAL.finditer(t):
        year, court, num, div = m.group(1), re.sub(r"\s+", " ", m.group(2)), m.group(3), m.group(4)
        court_fmt = court.upper().replace("CIV", "Civ").replace("CRIM", "Crim")
        norm = f"[{year}] {court_fmt} {num}" + (f" ({div})" if div else "")
        path = _fcl_path(year, court, num, div)
        issues = []
        if not _plausible_year(year):
            issues.append("The year is not plausible.")
        if court.upper() in ("EWHC", "UKUT") and not div:
            issues.append("A High Court or Upper Tribunal citation needs its division, e.g. (KB), (Ch), (IAC).")
        if court.upper() == "UKHL" and int(year) > 2009:
            issues.append("The House of Lords stopped sitting judicially in 2009; check the court.")
        if court.upper() == "UKSC" and int(year) < 2009:
            issues.append("The UK Supreme Court began in October 2009; check the court.")
        add({
            "country": "GB", "type": "UK neutral citation", "raw": m.group(0), "normalised": norm, "year": year,
            "issues": issues, "check_url": f"{_FCL}/{path}" if path else f"{_FCL}/search?query={quote_plus(norm)}",
            "status": "format_problem" if issues else "not_verified",
        }, m.start())

    for m in _UK_REPORT.finditer(t):
        year, vol, series, page = m.group(1), (m.group(2) or "").strip(), re.sub(r"\s+", " ", m.group(3)), m.group(4)
        norm = f"[{year}] {vol + ' ' if vol else ''}{series} {page}"
        issues = [] if _plausible_year(year) else ["The year is not plausible."]
        if series.upper() == "KB" and 1952 < int(year) < 2022:
            issues.append("The King's Bench reports were the Queen's Bench (QB) between 1952 and 2022.")
        add({
            "country": "GB", "type": "UK law report", "raw": m.group(0), "normalised": norm, "year": year, "issues": issues,
            "check_url": f"{_FCL}/search?query={quote_plus(norm)}", "status": "format_problem" if issues else "not_verified",
        }, m.start())

    for kind, rx in _IN_PATTERNS:
        for m in rx.finditer(t):
            g = m.groups()
            issues: List[str] = []
            if kind == "SCC":
                year, vol, page = g
                norm = f"({year}) {int(vol)} SCC {int(page)}"
                if int(vol) > 15:
                    issues.append("SCC rarely has more than 12–14 volumes a year; check the volume.")
                if int(year) < 1969:
                    issues.append("SCC reports begin in 1969; check the report series.")
            elif kind == "SCC OnLine":
                year, court, num = g
                norm = f"{year} SCC OnLine {court} {int(num)}"
            elif kind == "AIR":
                year, court, page = g
                norm = f"AIR {year} {court} {int(page)}"
            elif kind == "SCR":
                year, vol, page = g
                norm = f"[{year}] {vol} SCR {int(page)}"
            elif kind == "INSC":
                year, num = g
                norm = f"{year} INSC {int(num)}"
                if int(year) < 2023:
                    issues.append("Supreme Court neutral citations (INSC) are used from 2023; older judgments were given them later, so check.")
            elif kind == "HC neutral":
                year, court, num = g
                norm = f"{year}:{court}:{int(num)}"
            else:
                court, num, year = g
                norm = f"MANU/{court}/{int(num):04d}/{year}"
            year = g[0] if kind != "MANU" else g[2]
            if not _plausible_year(year):
                issues.append("The year is not plausible.")
            add({
                "country": "IN", "type": kind, "raw": m.group(0), "normalised": norm, "year": year, "issues": issues,
                "check_url": f"https://indiankanoon.org/search/?formInput={quote_plus(norm)}",
                "status": "format_problem" if issues else "not_verified",
            }, m.start())

    found.sort(key=lambda f: f.pop("_pos"))
    return found


def verify(items: List[Dict[str, Any]], timeout: float = 6.0) -> List[Dict[str, Any]]:
    """Look each citation up in an allowed source. Network failures leave it 'not_verified'."""
    from app.services.legal import sources

    for it in items:
        if it["status"] == "format_problem":
            continue
        try:
            if it["country"] == "GB" and it["type"] == "UK neutral citation" and "/search?" not in it["check_url"]:
                ok = sources.fcl_exists(it["check_url"], timeout=timeout)
                if ok is True:
                    it["status"], it["source"] = "verified", "Find Case Law"
                elif ok is False:
                    it["status"], it["source"] = "not_found", "Find Case Law"
                    it["issues"].append("No judgment with this citation on Find Case Law. Check the number and division.")
            elif it["country"] == "IN" and sources.indian_kanoon_enabled():
                hits = sources.indian_kanoon_search(f'"{it["normalised"]}"', timeout=timeout)
                if hits:
                    it["status"], it["source"], it["match"] = "verified", "Indian Kanoon", hits[0]
                else:
                    it["status"], it["source"] = "not_found", "Indian Kanoon"
                    it["issues"].append("Not found on Indian Kanoon. Check the citation.")
        except Exception:  # noqa: BLE001 - a source outage must not break the check
            pass
    return items


def check(text: str, live: bool = False) -> Dict[str, Any]:
    from app.services.legal.statutes import find_in_text

    items = extract(text)
    if live:
        items = verify(items)
    counts: Dict[str, int] = {}
    for it in items:
        counts[it["status"]] = counts.get(it["status"], 0) + 1
    return {"citations": items, "counts": counts, "statutes": find_in_text(text),
            "note": "A citation is shown as verified only when an allowed source confirmed it. Read the judgment before relying on it."}
