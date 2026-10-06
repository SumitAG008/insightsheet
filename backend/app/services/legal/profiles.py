"""
Country profiles for meldra Legal. The diary is the same everywhere; a profile supplies what differs:
the courts it knows, the case reference format, the deadline rules, the court and case-law links,
currency and where the data should be stored.

Deadline rules only ever produce a *suggested* date that a person confirms. They are not legal advice.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

SUPPORTED = ("IN", "GB")
DEFAULT_COUNTRY = "IN"

STAGES = {
    "IN": [
        ("filing", "Filing / admission"), ("notice", "Notice / service"), ("pleadings", "Pleadings (WS / reply)"),
        ("issues", "Framing of issues"), ("evidence", "Evidence"), ("arguments", "Final arguments"),
        ("reserved", "Judgment reserved"), ("judgment", "Judgment / order"), ("execution", "Execution"),
        ("bail", "Bail"), ("interim", "Interim application"),
    ],
    "GB": [
        ("pre_action", "Pre-action"), ("issued", "Claim issued"), ("served", "Served"),
        ("defence", "Defence"), ("allocation", "Allocation / directions"), ("disclosure", "Disclosure"),
        ("witness", "Witness statements / experts"), ("ptr", "Pre-trial review"), ("trial", "Trial"),
        ("reserved", "Judgment reserved"), ("judgment", "Judgment"), ("enforcement", "Enforcement"),
    ],
}

OUTCOMES = ["adjourned", "heard", "part_heard", "reserved", "disposed", "not_reached"]

COURTS: Dict[str, List[Dict[str, str]]] = {
    "IN": [
        {"code": "SC", "name": "Supreme Court of India", "level": "apex"},
        {"code": "DLHC", "name": "Delhi High Court", "level": "high"},
        {"code": "BHC", "name": "Bombay High Court", "level": "high"},
        {"code": "MHC", "name": "Madras High Court", "level": "high"},
        {"code": "CHC", "name": "Calcutta High Court", "level": "high"},
        {"code": "KHC", "name": "Karnataka High Court", "level": "high"},
        {"code": "AHC", "name": "Allahabad High Court", "level": "high"},
        {"code": "PHHC", "name": "Punjab & Haryana High Court", "level": "high"},
        {"code": "TSHC", "name": "Telangana High Court", "level": "high"},
        {"code": "GHC", "name": "Gujarat High Court", "level": "high"},
        {"code": "RHC", "name": "Rajasthan High Court", "level": "high"},
        {"code": "KERHC", "name": "Kerala High Court", "level": "high"},
        {"code": "MPHC", "name": "Madhya Pradesh High Court", "level": "high"},
        {"code": "HC_OTHER", "name": "Other High Court", "level": "high"},
        {"code": "DIST", "name": "District & Sessions Court", "level": "district"},
        {"code": "CIVIL", "name": "Civil Judge / Civil Court", "level": "district"},
        {"code": "CJM", "name": "Magistrate Court (CJM / JMFC / MM)", "level": "district"},
        {"code": "COMM", "name": "Commercial Court", "level": "district"},
        {"code": "FAMILY", "name": "Family Court", "level": "district"},
        {"code": "NCLT", "name": "NCLT", "level": "tribunal"},
        {"code": "NCLAT", "name": "NCLAT", "level": "tribunal"},
        {"code": "NCDRC", "name": "NCDRC (National Consumer Commission)", "level": "tribunal"},
        {"code": "CONSUMER", "name": "State / District Consumer Commission", "level": "tribunal"},
        {"code": "DRT", "name": "Debts Recovery Tribunal", "level": "tribunal"},
        {"code": "ITAT", "name": "Income Tax Appellate Tribunal", "level": "tribunal"},
        {"code": "RERA", "name": "RERA Authority / Tribunal", "level": "tribunal"},
        {"code": "ARB", "name": "Arbitral Tribunal", "level": "tribunal"},
    ],
    "GB": [
        {"code": "UKSC", "name": "UK Supreme Court", "level": "apex"},
        {"code": "EWCA_CIV", "name": "Court of Appeal (Civil Division)", "level": "appeal"},
        {"code": "EWCA_CRIM", "name": "Court of Appeal (Criminal Division)", "level": "appeal"},
        {"code": "KB", "name": "High Court, King's Bench Division", "level": "high"},
        {"code": "CH", "name": "High Court, Chancery Division", "level": "high"},
        {"code": "COMM", "name": "Commercial Court", "level": "high"},
        {"code": "TCC", "name": "Technology and Construction Court", "level": "high"},
        {"code": "FAM_HC", "name": "High Court, Family Division", "level": "high"},
        {"code": "CC", "name": "County Court", "level": "county"},
        {"code": "FC", "name": "Family Court", "level": "county"},
        {"code": "CROWN", "name": "Crown Court", "level": "criminal"},
        {"code": "MAGS", "name": "Magistrates' Court", "level": "criminal"},
        {"code": "ET", "name": "Employment Tribunal", "level": "tribunal"},
        {"code": "EAT", "name": "Employment Appeal Tribunal", "level": "tribunal"},
        {"code": "FTT", "name": "First-tier Tribunal", "level": "tribunal"},
        {"code": "UT", "name": "Upper Tribunal", "level": "tribunal"},
    ],
}

# Fields shown on a matter's reference card, by country.
REFERENCE_FIELDS = {
    "IN": [
        {"key": "cnr", "label": "CNR number", "hint": "16 characters, e.g. DLHC010012342023"},
        {"key": "case_type", "label": "Case type", "hint": "e.g. W.P.(C), CS(OS), CRL.M.C., O.S."},
        {"key": "case_number", "label": "Case number", "hint": "e.g. 1234"},
        {"key": "case_year", "label": "Year", "hint": "e.g. 2024"},
        {"key": "bench", "label": "Bench / court room", "hint": "e.g. Court 12, Hon'ble Justice ..."},
    ],
    "GB": [
        {"key": "claim_number", "label": "Claim / case number", "hint": "e.g. KB-2025-001234, K00MA123, 2401234/2025"},
        {"key": "hearing_centre", "label": "Hearing centre", "hint": "e.g. Manchester Civil Justice Centre"},
        {"key": "track", "label": "Track", "hint": "small claims, fast, intermediate, multi"},
        {"key": "judge", "label": "Judge", "hint": "e.g. HHJ Smith, DJ Patel"},
    ],
}

CNR_RE = re.compile(r"^[A-Z]{4}\d{12}$")
GB_CLAIM_RES = [
    re.compile(r"^(KB|QB|CH|BL|HC|CL|HT|IL|PT|BR|FS|CR|LM|CC)-\d{4}-\d{6}$"),  # High Court / B&PC (CE-File)
    re.compile(r"^[A-Z0-9]{8}$"),  # County Court (e.g. K00MA123, J7QZ12A4)
    re.compile(r"^\d{7}/\d{4}$"),  # Employment Tribunal (e.g. 2401234/2025)
]


def normalise_country(country: Optional[str]) -> str:
    c = str(country or "").strip().upper()
    if c == "UK":
        c = "GB"
    return c if c in SUPPORTED else DEFAULT_COUNTRY


def country_for_region(region: Optional[str]) -> str:
    """Default profile from the visitor's location. India first; the UK for GB; everyone else gets India
    until more profiles exist (they can switch manually)."""
    r = str(region or "").strip().upper()
    return "GB" if r in ("GB", "UK") else "IN"


def court(country: str, code: Optional[str]) -> Optional[Dict[str, str]]:
    for c in COURTS.get(normalise_country(country), []):
        if c["code"] == code:
            return c
    return None


def court_name(country: str, code: Optional[str]) -> str:
    c = court(country, code)
    return c["name"] if c else (code or "")


def validate_reference(country: str, refs: Dict[str, Any]) -> List[str]:
    """Warnings (never errors) about the reference format; firms keep odd legacy numbers."""
    warnings: List[str] = []
    refs = refs or {}
    if normalise_country(country) == "IN":
        cnr = str(refs.get("cnr") or "").strip().upper().replace(" ", "").replace("-", "")
        if cnr and not CNR_RE.match(cnr):
            warnings.append("The CNR number is usually 16 characters: 4 letters then 12 digits.")
        year = str(refs.get("case_year") or "").strip()
        if year and not re.match(r"^(19|20)\d{2}$", year):
            warnings.append("The case year should be four digits, e.g. 2024.")
    else:
        claim = str(refs.get("claim_number") or "").strip().upper()
        if claim and not any(r.match(claim) for r in GB_CLAIM_RES):
            warnings.append("This does not look like a High Court, County Court or Employment Tribunal number.")
    return warnings


def clean_cnr(value: Any) -> str:
    return str(value or "").strip().upper().replace(" ", "").replace("-", "")


def display_reference(country: str, refs: Dict[str, Any]) -> str:
    refs = refs or {}
    if normalise_country(country) == "IN":
        core = " ".join(str(refs.get(k) or "").strip() for k in ("case_type", "case_number") if refs.get(k)).strip()
        if refs.get("case_year"):
            core = f"{core}/{refs['case_year']}" if core else str(refs["case_year"])
        return core or clean_cnr(refs.get("cnr"))
    return str(refs.get("claim_number") or "").strip()


def court_links(country: str, court_code: Optional[str], refs: Dict[str, Any], title: str = "") -> List[Dict[str, str]]:
    """Direct links only. We do not scrape court websites."""
    refs = refs or {}
    links: List[Dict[str, str]] = []
    if normalise_country(country) == "IN":
        cnr = clean_cnr(refs.get("cnr"))
        if court_code == "SC":
            links.append({"label": "Supreme Court case status", "url": "https://www.sci.gov.in/case-status-case-no/", "kind": "status"})
        links.append({
            "label": "eCourts case status (search by CNR)" if cnr else "eCourts case status",
            "url": "https://services.ecourts.gov.in/ecourtindia_v6/",
            "kind": "status",
            "copy": cnr,
        })
        if court_code and court_code not in ("SC",) and (court(country, court_code) or {}).get("level") == "high":
            links.append({"label": "High Court services (eCourts)", "url": "https://hcservices.ecourts.gov.in/hcservices/main.php", "kind": "status", "copy": cnr})
        if court_code in ("NCLT", "NCLAT"):
            links.append({"label": "NCLT / NCLAT case status", "url": "https://nclt.gov.in/case-status", "kind": "status"})
        links.append({"label": "Judgments and orders (eCourts judgment search)", "url": "https://judgments.ecourts.gov.in/", "kind": "judgments"})
        if title:
            links.append({"label": "Search Indian Kanoon", "url": f"https://indiankanoon.org/search/?formInput={quote_plus(title)}", "kind": "caselaw"})
        links.append({"label": "India Code (Acts and rules)", "url": "https://www.indiacode.nic.in/", "kind": "legislation"})
    else:
        if court_code in ("KB", "CH", "COMM", "TCC", "FAM_HC", "EWCA_CIV"):
            links.append({"label": "Royal Courts of Justice daily cause lists", "url": "https://www.gov.uk/government/collections/royal-courts-of-justice-and-rolls-building-daily-court-lists", "kind": "listing"})
            links.append({"label": "CE-File (High Court e-filing)", "url": "https://efile.cefile-app.com/login", "kind": "filing", "copy": str(refs.get("claim_number") or "")})
        if court_code == "ET":
            links.append({"label": "Employment Tribunal decisions", "url": "https://www.gov.uk/employment-tribunal-decisions", "kind": "judgments"})
        links.append({"label": "Find a court or tribunal", "url": "https://www.find-court-tribunal.service.gov.uk/", "kind": "court"})
        q = title or str(refs.get("claim_number") or "")
        links.append({
            "label": "Find Case Law (National Archives)",
            "url": "https://caselaw.nationalarchives.gov.uk/search" + (f"?query={quote_plus(q)}" if q else ""),
            "kind": "caselaw",
        })
        links.append({"label": "legislation.gov.uk", "url": "https://www.legislation.gov.uk/", "kind": "legislation"})
    return links


def profile(country: str) -> Dict[str, Any]:
    from app.services.legal.deadlines import rules_for

    c = normalise_country(country)
    common = {
        "country": c,
        "courts": COURTS[c],
        "stages": [{"code": k, "label": v} for k, v in STAGES[c]],
        "outcomes": OUTCOMES,
        "reference_fields": REFERENCE_FIELDS[c],
        "deadline_rules": rules_for(c),
        "date_format": "dd/mm/yyyy",
    }
    if c == "IN":
        return {
            **common,
            "name": "India",
            "currency": "INR",
            "currency_symbol": "₹",
            "languages": ["en", "hi"],
            "data_rules": "Digital Personal Data Protection Act 2023. Stored encrypted, kept per firm, in or near India.",
            "reminders": ["email", "whatsapp_later"],
            "ageing_years": 3,
        }
    return {
        **common,
        "name": "United Kingdom",
        "currency": "GBP",
        "currency_symbol": "£",
        "languages": ["en"],
        "data_rules": "UK GDPR and SRA confidentiality. Stored encrypted, kept per firm, in the UK or EU.",
        "reminders": ["email", "calendar"],
        "ageing_years": 1,
    }
