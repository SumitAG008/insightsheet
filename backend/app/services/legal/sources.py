"""
Case-law sources meldra Legal is allowed to use.

  Find Case Law (UK)  Public API of The National Archives, free under the Open Justice Licence.
                      Search: GET https://caselaw.nationalarchives.gov.uk/atom.xml?query=...
  Indian Kanoon (IN)  Paid API, used only when INDIAN_KANOON_API_TOKEN is set (the firm's or meldra's licence).
                      POST https://api.indiankanoon.org/search/  formInput=...&pagenum=0

Other licensed providers (Manupatra, SCC Online, CaseMine) plug in here when a licence is signed.
Nothing here scrapes court websites.
"""
from __future__ import annotations

import os
import re
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx

FCL_BASE = os.getenv("FIND_CASE_LAW_BASE", "https://caselaw.nationalarchives.gov.uk")
IK_BASE = os.getenv("INDIAN_KANOON_API_BASE", "https://api.indiankanoon.org")
_UA = {"User-Agent": "meldra-legal/1.0 (+https://meldra.ai)"}
_ATOM = {"a": "http://www.w3.org/2005/Atom", "tna": "https://caselaw.nationalarchives.gov.uk"}


def indian_kanoon_enabled() -> bool:
    return bool((os.getenv("INDIAN_KANOON_API_TOKEN") or "").strip())


def status() -> List[Dict[str, Any]]:
    return [
        {"id": "fcl", "name": "Find Case Law (The National Archives)", "country": "GB", "enabled": True, "licence": "Open Justice Licence (free)"},
        {"id": "indiankanoon", "name": "Indian Kanoon API", "country": "IN", "enabled": indian_kanoon_enabled(), "licence": "Paid API (token required)"},
        {"id": "ecourts", "name": "eCourts / Supreme Court judgments", "country": "IN", "enabled": True, "licence": "Direct links only"},
        {"id": "manupatra", "name": "Manupatra", "country": "IN", "enabled": False, "licence": "Partnership needed"},
        {"id": "scconline", "name": "SCC Online", "country": "IN", "enabled": False, "licence": "Partnership needed"},
        {"id": "casemine", "name": "CaseMine", "country": "IN", "enabled": False, "licence": "Partnership needed"},
    ]


def fcl_search(query: str, page: int = 1, timeout: float = 8.0) -> List[Dict[str, Any]]:
    url = f"{FCL_BASE}/atom.xml?" + urlencode({"query": query, "page": max(1, int(page)), "per_page": 10, "order": "-relevance"})
    with httpx.Client(timeout=timeout, headers=_UA, follow_redirects=True) as c:
        r = c.get(url)
        r.raise_for_status()
    root = ET.fromstring(r.content)
    out = []
    for e in root.findall("a:entry", _ATOM):
        link = ""
        for ln in e.findall("a:link", _ATOM):
            if ln.get("rel") in (None, "alternate") and not ln.get("type"):
                link = ln.get("href") or link
        cite = e.findtext("tna:identifier[@type='ukncn']", default="", namespaces=_ATOM) or ""
        out.append({
            "title": (e.findtext("a:title", default="", namespaces=_ATOM) or "").strip(),
            "citation": cite.strip(),
            "court": (e.findtext("a:author/a:name", default="", namespaces=_ATOM) or "").strip(),
            "date": (e.findtext("a:published", default="", namespaces=_ATOM) or "")[:10],
            "url": link,
            "source": "Find Case Law",
        })
    return out


def fcl_exists(url: str, timeout: float = 6.0) -> Optional[bool]:
    with httpx.Client(timeout=timeout, headers=_UA, follow_redirects=True) as c:
        r = c.get(url)
    if r.status_code == 200:
        return True
    if r.status_code == 404:
        return False
    return None


def fcl_text(url: str, timeout: float = 10.0) -> str:
    """Plain text of a judgment for summarising (from its data.xml, Akoma Ntoso)."""
    xml_url = url.rstrip("/") + "/data.xml"
    with httpx.Client(timeout=timeout, headers=_UA, follow_redirects=True) as c:
        r = c.get(xml_url)
        r.raise_for_status()
    root = ET.fromstring(r.content)
    text = " ".join(t.strip() for t in root.itertext() if t and t.strip())
    return re.sub(r"\s+", " ", text)


def indian_kanoon_search(query: str, page: int = 0, timeout: float = 8.0) -> List[Dict[str, Any]]:
    token = (os.getenv("INDIAN_KANOON_API_TOKEN") or "").strip()
    if not token:
        return []
    with httpx.Client(timeout=timeout, headers={**_UA, "Authorization": f"Token {token}", "Accept": "application/json"}) as c:
        r = c.post(f"{IK_BASE}/search/", data={"formInput": query, "pagenum": int(page)})
        r.raise_for_status()
        data = r.json()
    out = []
    for d in data.get("docs") or []:
        tid = d.get("tid")
        out.append({
            "title": re.sub(r"<[^>]+>", "", str(d.get("title") or "")),
            "citation": str(d.get("citation") or ""),
            "court": str(d.get("docsource") or ""),
            "date": str(d.get("publishdate") or ""),
            "snippet": re.sub(r"<[^>]+>", "", str(d.get("headline") or ""))[:400],
            "url": f"https://indiankanoon.org/doc/{tid}/" if tid else "",
            "doc_id": tid,
            "source": "Indian Kanoon",
        })
    return out


def search(country: str, query: str, page: int = 1) -> Dict[str, Any]:
    """Search the allowed sources for this country. Returns results plus where else to look."""
    from urllib.parse import quote_plus

    q = (query or "").strip()
    results: List[Dict[str, Any]] = []
    errors: List[str] = []
    searched: List[str] = []
    if country == "GB":
        try:
            results = fcl_search(q, page=page)
            searched.append("Find Case Law (UK courts and tribunals, 2001 onwards)")
        except Exception:  # noqa: BLE001
            errors.append("Find Case Law could not be reached. Try the link below.")
        more = [{"label": "Open this search on Find Case Law", "url": f"{FCL_BASE}/search?query={quote_plus(q)}"},
                {"label": "BAILII", "url": "https://www.bailii.org/form/search_cases.html"}]
    else:
        if indian_kanoon_enabled():
            try:
                results = indian_kanoon_search(q, page=max(0, page - 1))
                searched.append("Indian Kanoon (licensed API)")
            except Exception:  # noqa: BLE001
                errors.append("Indian Kanoon could not be reached. Try the links below.")
        more = [{"label": "Search Indian Kanoon", "url": f"https://indiankanoon.org/search/?formInput={quote_plus(q)}"},
                {"label": "eCourts judgment search", "url": "https://judgments.ecourts.gov.in/"},
                {"label": "Supreme Court judgments", "url": "https://www.sci.gov.in/judgements-judgement-date/"}]
    return {"query": q, "country": country, "results": results, "searched": searched, "errors": errors, "more": more,
            "live": bool(searched)}
