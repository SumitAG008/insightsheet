"""
Sample firms for demos and the showcase. All names are invented. Dates are relative to today so the
daily list, reminders and reports always have something to show.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List

IN_FIRM = "Mehra & Rao Associates, New Delhi (sample)"
GB_FIRM = "Ashworth Lane Solicitors, Manchester (sample)"

# (title, client, court, refs, stage, lawyer, next_in_days, filed_years_ago, billed, collected, sections, offence_date, history)
# history: list of (days_ago, outcome, purpose)
_IN = [
    ("Kapoor Textiles Pvt Ltd v Sunrise Exports", "Kapoor Textiles Pvt Ltd", "DLHC", {"cnr": "DLHC010045672021", "case_type": "CS(COMM)", "case_number": "412", "case_year": "2021"},
     "evidence", "anita@mehrarao.example", 0, 4.6, 450000, 300000, None, None,
     [(35, "adjourned", "Plaintiff evidence"), (70, "adjourned", "Plaintiff evidence"), (110, "adjourned", "Plaintiff evidence"), (150, "heard", "Framing of issues")]),
    ("State v Rakesh Yadav", "Rakesh Yadav", "DIST", {"cnr": "DLST020012342024", "case_type": "SC", "case_number": "118", "case_year": "2024"},
     "bail", "vikram@mehrarao.example", 0, 0.9, 120000, 120000, "Sections 103, 3(5) BNS", "2024-09-14",
     [(14, "adjourned", "Bail arguments"), (30, "heard", "Bail application")]),
    ("Gupta v Gupta", "Meera Gupta", "FAMILY", {"cnr": "DLSE030076542023", "case_type": "HMA", "case_number": "77", "case_year": "2023"},
     "evidence", "anita@mehrarao.example", 1, 2.4, 90000, 45000, "Section 13(1)(ia) Hindu Marriage Act", None,
     [(28, "adjourned", "Respondent evidence"), (56, "adjourned", "Respondent evidence"), (90, "adjourned", "Respondent evidence")]),
    ("Sharma Builders v DDA", "Sharma Builders", "DLHC", {"cnr": "DLHC010098762022", "case_type": "W.P.(C)", "case_number": "8812", "case_year": "2022"},
     "arguments", "vikram@mehrarao.example", 1, 3.8, 600000, 600000, None, None,
     [(21, "part_heard", "Final arguments"), (60, "heard", "Final arguments")]),
    ("Bansal v Alpha Finance Ltd", "Rohit Bansal", "CONSUMER", {"case_type": "CC", "case_number": "302", "case_year": "2022"},
     "evidence", "neha@mehrarao.example", 3, 3.2, 60000, 20000, None, None,
     [(40, "adjourned", "Evidence by affidavit"), (85, "heard", "Evidence by affidavit")]),
    ("Northstar Logistics v Insolvency Resolution Professional", "Northstar Logistics", "NCLT", {"case_type": "IA", "case_number": "1544", "case_year": "2025"},
     "interim", "neha@mehrarao.example", 6, 0.6, 350000, 200000, None, None,
     [(20, "heard", "Reply of RP")]),
    ("State v Imran Sheikh", "Imran Sheikh", "CJM", {"cnr": "DLCT010054322019", "case_type": "Ct. Cases", "case_number": "5541", "case_year": "2019"},
     "evidence", "vikram@mehrarao.example", -2, 6.9, 75000, 50000, "Sections 420, 406 IPC", "2018-11-02",
     [(30, "adjourned", "Prosecution evidence"), (75, "not_reached", "Prosecution evidence"), (120, "adjourned", "Prosecution evidence")]),
    ("Arora Estates v Malhotra", "Arora Estates", "CIVIL", {"cnr": "DLSW010022112020", "case_type": "CS", "case_number": "221", "case_year": "2020"},
     "pleadings", "neha@mehrarao.example", None, 5.5, 110000, 110000, None, None,
     [(45, "adjourned", "Written statement")]),
    ("Singh v Union of India", "Harpreet Singh", "SC", {"case_type": "SLP(C)", "case_number": "10233", "case_year": "2025"},
     "filing", "anita@mehrarao.example", 12, 0.3, 500000, 250000, None, None, []),
    ("ICICI Bank v Jain Traders", "Jain Traders", "DRT", {"case_type": "OA", "case_number": "889", "case_year": "2023"},
     "reserved", "neha@mehrarao.example", 20, 2.1, 140000, 60000, None, None,
     [(25, "reserved", "Final arguments"), (60, "heard", "Final arguments")]),
    ("State v Pooja Verma", "Pooja Verma", "DIST", {"cnr": "DLND010066712025", "case_type": "Bail Matters", "case_number": "2210", "case_year": "2025"},
     "bail", "vikram@mehrarao.example", 2, 0.1, 50000, 50000, "Sections 318(4), 61(2) BNS", "2025-06-30",
     [(7, "adjourned", "Anticipatory bail - reply of State")]),
    ("Desai v Desai (disposed)", "Kiran Desai", "FAMILY", {"case_type": "HMA", "case_number": "15", "case_year": "2021"},
     "judgment", "anita@mehrarao.example", None, 4.0, 80000, 80000, None, None,
     [(60, "disposed", "Judgment")]),
]

_GB = [
    ("Pennine Fabrication Ltd v Calder Steel plc", "Pennine Fabrication Ltd", "TCC", {"claim_number": "HT-2024-000412", "hearing_centre": "Manchester", "track": "multi"},
     "disclosure", "j.hale@ashworthlane.example", 0, 1.4, 48000, 30000,
     [(42, "heard", "Case management conference"), (120, "heard", "Costs and case management conference")]),
    ("Okafor v Northern Rail Services Ltd", "Grace Okafor", "ET", {"claim_number": "2412345/2025", "hearing_centre": "Manchester Employment Tribunal"},
     "witness", "s.ward@ashworthlane.example", 1, 0.8, 12500, 6000,
     [(30, "adjourned", "Preliminary hearing"), (75, "heard", "Preliminary hearing (case management)")]),
    ("Bennett v Harlow Motors", "Peter Bennett", "CC", {"claim_number": "K00MA412", "hearing_centre": "Manchester Civil Justice Centre", "track": "fast"},
     "allocation", "s.ward@ashworthlane.example", 0, 0.7, 6200, 6200,
     [(25, "adjourned", "Directions hearing")]),
    ("Re Whitworth Holdings Ltd", "Whitworth Holdings Ltd", "CH", {"claim_number": "CR-2025-001877", "hearing_centre": "Rolls Building"},
     "issued", "j.hale@ashworthlane.example", 5, 0.2, 22000, 10000, []),
    ("Clarke v Clarke", "Emma Clarke", "FC", {"claim_number": "MA24D01234", "hearing_centre": "Manchester Family Court"},
     "ptr", "r.iqbal@ashworthlane.example", 3, 1.1, 9500, 4000,
     [(35, "adjourned", "FDR appointment"), (80, "heard", "First appointment")]),
    ("Morrison Foods Ltd v Delta Packaging Ltd", "Morrison Foods Ltd", "COMM", {"claim_number": "CL-2023-000233", "hearing_centre": "Rolls Building", "track": "multi"},
     "trial", "j.hale@ashworthlane.example", 14, 2.3, 95000, 70000,
     [(60, "heard", "Pre-trial review"), (180, "heard", "CMC")]),
    ("Hughes v Stockport MBC", "Daniel Hughes", "CC", {"claim_number": "J7QZ12A4", "hearing_centre": "Stockport County Court", "track": "small claims"},
     "defence", "r.iqbal@ashworthlane.example", -3, 0.4, 1800, 900, []),
    ("Patel v Lancashire Care NHS Trust", "Sunita Patel", "KB", {"claim_number": "KB-2023-002981", "hearing_centre": "Manchester", "track": "multi"},
     "witness", "r.iqbal@ashworthlane.example", 9, 2.6, 41000, 41000,
     [(50, "adjourned", "CCMC"), (110, "adjourned", "CCMC"), (170, "adjourned", "CCMC")]),
    ("R v Thompson", "Liam Thompson", "CROWN", {"claim_number": "T20257041", "hearing_centre": "Manchester Crown Court (Minshull St)"},
     "ptr", "s.ward@ashworthlane.example", 2, 0.5, 7000, 3500,
     [(21, "heard", "PTPH")]),
    ("Fielding v Fielding (settled)", "Mark Fielding", "FC", {"claim_number": "MA23D00811"},
     "judgment", "r.iqbal@ashworthlane.example", None, 2.0, 8000, 8000,
     [(90, "disposed", "Final hearing")]),
]


def build(country: str, today: date) -> Dict[str, Any]:
    matters: List[Dict[str, Any]] = []
    if country == "GB":
        for (title, client, court, refs, stage, lawyer, nxt, yrs, billed, coll, hist) in _GB:
            matters.append(_m("GB", title, client, court, refs, stage, lawyer, nxt, yrs, billed, coll, None, None, hist, today))
        tasks = [
            {"title": "Serve defence (agreed extension)", "kind": "deadline", "rule_id": "gb_defence_28", "trigger": -20, "matter": 6},
            {"title": "Exchange witness statements", "kind": "task", "due": 6, "matter": 7},
            {"title": "Agree trial bundle index", "kind": "task", "due": 4, "matter": 5},
            {"title": "ET3 response deadline check", "kind": "deadline", "rule_id": "gb_et3", "trigger": -24, "matter": 1},
        ]
        return {"firm_name": GB_FIRM, "matters": matters, "tasks": tasks}
    for (title, client, court, refs, stage, lawyer, nxt, yrs, billed, coll, sections, od, hist) in _IN:
        matters.append(_m("IN", title, client, court, refs, stage, lawyer, nxt, yrs, billed, coll, sections, od, hist, today))
    tasks = [
        {"title": "File written statement", "kind": "deadline", "rule_id": "in_ws_cpc", "trigger": -26, "matter": 7},
        {"title": "Prepare evidence affidavit of PW-2", "kind": "task", "due": -1, "matter": 0},
        {"title": "Compile SLP paper book", "kind": "task", "due": 5, "matter": 8},
        {"title": "Appeal against decree (limitation)", "kind": "deadline", "rule_id": "in_appeal_hc", "trigger": -80, "matter": 11},
    ]
    return {"firm_name": IN_FIRM, "matters": matters, "tasks": tasks}


def _m(country, title, client, court, refs, stage, lawyer, nxt, yrs, billed, coll, sections, od, hist, today):
    status = "disposed" if hist and hist[0][1] == "disposed" else "open"
    p, _, r = title.partition(" v ")
    return {
        "payload": {
            "country": country, "title": title, "client": client, "court_code": court, "references": refs, "stage": stage,
            "status": status, "lawyer_email": lawyer,
            "next_hearing": (today + timedelta(days=nxt)).isoformat() if (nxt is not None and status == "open") else None,
            "filed_on": (today - timedelta(days=int(yrs * 365.25))).isoformat(), "fees_billed": billed, "fees_collected": coll,
            "petitioner": p or None, "respondent": r.replace(" (disposed)", "").replace(" (settled)", "") or None,
            "sections": sections, "offence_date": od,
        },
        "history": [{"date": (today - timedelta(days=d)).isoformat(), "outcome": o, "purpose": pur} for d, o, pur in hist],
    }
