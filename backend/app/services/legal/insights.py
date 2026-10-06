"""
Reports and suggestions for meldra Legal, computed from the firm's own diary.

Suggestions are rules plus one learned number: how likely a hearing is to be adjourned, estimated from the
firm's own history for that matter and that court (a smoothed rate: (adjourned + 1) / (hearings + 2),
blending the matter's history with its court's). It helps a lawyer plan a day with several listings.
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from app.services.legal import profiles
from app.services.legal.statutes import COMMENCEMENT, find_in_text


def _dmy(iso: str) -> str:
    """dd/mm/yyyy, the format courts and firms use in both countries."""
    try:
        return date.fromisoformat(str(iso)[:10]).strftime("%d/%m/%Y")
    except ValueError:
        return str(iso)


def adjournment_model(hearings: List[Dict[str, Any]], matters_by_id: Dict[int, Dict[str, Any]]) -> Dict[str, Any]:
    by_matter: Dict[int, List[int]] = defaultdict(lambda: [0, 0])
    by_court: Dict[str, List[int]] = defaultdict(lambda: [0, 0])
    total = [0, 0]
    for h in hearings:
        if not h.get("outcome"):
            continue
        adj = 1 if h["outcome"] in ("adjourned", "not_reached") else 0
        m = matters_by_id.get(h["matter_id"]) or {}
        by_matter[h["matter_id"]][0] += adj
        by_matter[h["matter_id"]][1] += 1
        by_court[m.get("court_code") or ""][0] += adj
        by_court[m.get("court_code") or ""][1] += 1
        total[0] += adj
        total[1] += 1
    return {"matter": by_matter, "court": by_court, "total": total}


def adjournment_likelihood(model: Dict[str, Any], matter: Dict[str, Any]) -> Optional[float]:
    base_a, base_n = model["total"]
    if base_n < 3:
        return None
    prior = (base_a + 1) / (base_n + 2)
    ca, cn = model["court"].get(matter.get("court_code") or "", [0, 0])
    court_rate = (ca + 2 * prior) / (cn + 2)
    ma, mn = model["matter"].get(matter["id"], [0, 0])
    rate = (ma + 2 * court_rate) / (mn + 2)
    return round(rate, 2)


def today_board(matters: List[Dict[str, Any]], hearings: List[Dict[str, Any]], day: date, lawyer: Optional[str] = None) -> Dict[str, Any]:
    by_id = {m["id"]: m for m in matters}
    model = adjournment_model(hearings, by_id)
    rows = []
    for m in matters:
        if m["status"] != "open" or m["next_hearing"] != day.isoformat():
            continue
        if lawyer and (m.get("lawyer_email") or "") != lawyer:
            continue
        last = next((h for h in hearings if h["matter_id"] == m["id"]), None)
        rows.append({
            "matter": m,
            "last_hearing": last,
            "adjournment_likelihood": adjournment_likelihood(model, m),
            "links": profiles.court_links(m["country"], m["court_code"], m.get("references") or {}, m.get("title") or ""),
        })
    rows.sort(key=lambda r: (r["matter"].get("court_name") or "", (r["last_hearing"] or {}).get("item_no") or ""))
    # A clash: the same lawyer listed in two different courts on the same day.
    courts_by_lawyer: Dict[str, set] = defaultdict(set)
    for r in rows:
        if r["matter"].get("lawyer_email"):
            courts_by_lawyer[r["matter"]["lawyer_email"]].add(r["matter"].get("court_code"))
    clashes = [{"lawyer_email": k, "courts": sorted(c for c in v if c)} for k, v in courts_by_lawyer.items() if len(v) > 1]
    return {"date": day.isoformat(), "hearings": rows, "clashes": clashes}


def reports(matters: List[Dict[str, Any]], hearings: List[Dict[str, Any]], tasks: List[Dict[str, Any]], today: date, ageing_years: int = 3) -> Dict[str, Any]:
    open_m = [m for m in matters if m["status"] == "open"]
    by_court = Counter(m.get("court_name") or "Not set" for m in open_m)
    by_stage = Counter(m.get("stage") or "not_set" for m in open_m)
    adj = Counter()
    adj_by_court = Counter()
    by_id = {m["id"]: m for m in matters}
    for h in hearings:
        if h.get("outcome") in ("adjourned", "not_reached"):
            adj[h["matter_id"]] += 1
            adj_by_court[(by_id.get(h["matter_id"]) or {}).get("court_name") or "Not set"] += 1
    buckets = {"< 1 year": 0, "1–3 years": 0, "3–5 years": 0, "5+ years": 0, "Filing date not set": 0}
    ageing = []
    for m in open_m:
        if not m.get("filed_on"):
            buckets["Filing date not set"] += 1
            continue
        yrs = (today - date.fromisoformat(m["filed_on"])).days / 365.25
        key = "< 1 year" if yrs < 1 else "1–3 years" if yrs < 3 else "3–5 years" if yrs < 5 else "5+ years"
        buckets[key] += 1
        if yrs >= ageing_years:
            ageing.append({"id": m["id"], "title": m.get("title"), "court_name": m.get("court_name"), "years": round(yrs, 1)})
    ageing.sort(key=lambda a: -a["years"])
    horizon = (today + timedelta(days=30)).isoformat()
    workload: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"open_matters": 0, "hearings_next_30_days": 0, "open_tasks": 0})
    for m in open_m:
        who = m.get("lawyer_email") or "Unassigned"
        workload[who]["open_matters"] += 1
        if m.get("next_hearing") and today.isoformat() <= m["next_hearing"] <= horizon:
            workload[who]["hearings_next_30_days"] += 1
    for t in tasks:
        if not t["done"]:
            workload[t.get("assignee_email") or "Unassigned"]["open_tasks"] += 1
    billed = sum(float(m.get("fees_billed") or 0) for m in matters)
    collected = sum(float(m.get("fees_collected") or 0) for m in matters)
    outstanding = sorted(
        [{"id": m["id"], "title": m.get("title"), "client": m.get("client"), "outstanding": round(float(m.get("fees_billed") or 0) - float(m.get("fees_collected") or 0), 2)}
         for m in matters if float(m.get("fees_billed") or 0) > float(m.get("fees_collected") or 0)],
        key=lambda r: -r["outstanding"],
    )
    return {
        "totals": {"open": len(open_m), "disposed": sum(1 for m in matters if m["status"] != "open"), "hearings_recorded": len(hearings),
                   "adjournments": sum(adj.values())},
        "by_court": [{"label": k, "count": v} for k, v in by_court.most_common()],
        "by_stage": [{"label": k, "count": v} for k, v in by_stage.most_common()],
        "adjournments_by_court": [{"label": k, "count": v} for k, v in adj_by_court.most_common()],
        "most_adjourned": [{"id": k, "title": (by_id.get(k) or {}).get("title"), "count": v} for k, v in adj.most_common(10)],
        "ageing_buckets": [{"label": k, "count": v} for k, v in buckets.items()],
        "ageing_cases": ageing[:20],
        "workload": [{"lawyer": k, **v} for k, v in sorted(workload.items(), key=lambda kv: -kv[1]["open_matters"])],
        "fees": {"billed": round(billed, 2), "collected": round(collected, 2), "outstanding": round(billed - collected, 2),
                 "collection_rate": round(collected / billed, 3) if billed else None, "top_outstanding": outstanding[:10]},
    }


def suggestions(matters: List[Dict[str, Any]], hearings: List[Dict[str, Any]], tasks: List[Dict[str, Any]], today: date,
                ageing_years: int = 3, me: Optional[str] = None) -> List[Dict[str, Any]]:
    """Ordered, actionable nudges. Each has a severity (high, medium, low), a message key and the matter it concerns."""
    out: List[Dict[str, Any]] = []
    by_id = {m["id"]: m for m in matters}
    model = adjournment_model(hearings, by_id)
    tomorrow = (today + timedelta(days=1)).isoformat()
    t_iso = today.isoformat()
    open_tasks_by_matter = defaultdict(list)
    for t in tasks:
        if not t["done"] and t.get("matter_id"):
            open_tasks_by_matter[t["matter_id"]].append(t)
    last_by_matter: Dict[int, Dict[str, Any]] = {}
    for h in hearings:  # newest first
        last_by_matter.setdefault(h["matter_id"], h)

    for m in matters:
        if m["status"] != "open":
            continue
        title = m.get("title") or "Matter"
        nh = m.get("next_hearing")
        if not nh:
            out.append({"key": "no_next_date", "severity": "high", "matter_id": m["id"], "title": title,
                        "text": "No next hearing date. Add it from the court's order or cause list."})
        elif nh < t_iso:
            last = last_by_matter.get(m["id"])
            if not last or (last.get("date") or "") < nh:
                out.append({"key": "outcome_missing", "severity": "high", "matter_id": m["id"], "title": title, "date": nh,
                            "text": "The hearing date has passed with no outcome recorded. Add what happened and the next date."})
        elif nh == tomorrow:
            p = adjournment_likelihood(model, m)
            msg = "Listed tomorrow."
            if p is not None and p >= 0.6:
                msg += f" Adjourned in {round(p * 100)}% of similar hearings, so plan cover or a short mention."
            elif not open_tasks_by_matter.get(m["id"]):
                msg += " No preparation task yet."
            out.append({"key": "tomorrow", "severity": "medium", "matter_id": m["id"], "title": title, "date": nh, "text": msg,
                        "likelihood": p})
        # Repeated adjournments in a row.
        streak = 0
        for h in [h for h in hearings if h["matter_id"] == m["id"]]:
            if h.get("outcome") in ("adjourned", "not_reached"):
                streak += 1
            else:
                break
        if streak >= 3:
            out.append({"key": "adjourned_streak", "severity": "medium", "matter_id": m["id"], "title": title, "count": streak,
                        "text": f"Adjourned {streak} times in a row. Consider an application for an early or fixed date."})
        if m.get("filed_on"):
            yrs = (today - date.fromisoformat(m["filed_on"])).days / 365.25
            if yrs >= ageing_years:
                out.append({"key": "ageing", "severity": "low", "matter_id": m["id"], "title": title, "years": round(yrs, 1),
                            "text": f"Pending for {round(yrs, 1)} years. Review with the client."})
        if m["country"] == "IN" and m.get("sections"):
            refs = find_in_text(str(m["sections"]))
            od = m.get("offence_date")
            old_refs = [r for r in refs if re.search(r"IPC|Penal|Cr\.?P\.?C|Criminal Procedure|Evidence|IEA", r["matched"], re.I)]
            if old_refs and od and str(od) >= COMMENCEMENT.isoformat():
                refs = old_refs
                pairs = ", ".join(f"{r['old_act']} {r['old_section']} → {r['new_act']} {r['new_section']}" for r in refs[:3])
                out.append({"key": "new_codes", "severity": "medium", "matter_id": m["id"], "title": title,
                            "text": f"Offence on or after 1 July 2024 but old sections are recorded: {pairs}. Check the charge."})
        if float(m.get("fees_billed") or 0) > float(m.get("fees_collected") or 0) and m.get("stage") in ("judgment", "reserved", "execution", "enforcement"):
            out.append({"key": "fees_due", "severity": "low", "matter_id": m["id"], "title": title,
                        "text": "Fees are outstanding on a matter near its end. Send a reminder before judgment."})

    week = (today + timedelta(days=7)).isoformat()
    for t in tasks:
        if t["done"] or not t.get("due_date"):
            continue
        m = by_id.get(t.get("matter_id")) or {}
        if t["due_date"] < t_iso:
            out.append({"key": "task_overdue", "severity": "high", "matter_id": t.get("matter_id"), "task_id": t["id"],
                        "title": m.get("title") or t["title"], "text": f"Overdue: {t['title']} (due {_dmy(t['due_date'])})."})
        elif t["due_date"] <= week:
            sev = "high" if t["kind"] == "deadline" else "medium"
            extra = " The date is not confirmed yet." if t["kind"] == "deadline" and not t.get("confirmed_by") else ""
            out.append({"key": "task_due", "severity": sev, "matter_id": t.get("matter_id"), "task_id": t["id"],
                        "title": m.get("title") or t["title"], "text": f"Due {_dmy(t['due_date'])}: {t['title']}.{extra}"})

    board = today_board(matters, hearings, today)
    for c in board["clashes"]:
        if not me or c["lawyer_email"] == me:
            out.append({"key": "clash", "severity": "high", "lawyer_email": c["lawyer_email"],
                        "text": f"{c['lawyer_email']} is listed in {len(c['courts'])} courts today. Arrange cover."})

    rank = {"high": 0, "medium": 1, "low": 2}
    out.sort(key=lambda s: (rank[s["severity"]], s.get("date") or ""))
    return out[:50]
