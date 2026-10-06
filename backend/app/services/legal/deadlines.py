"""
Deadline rules. Each gives a *suggested* date from a trigger date (service, judgment, cause of action).
A person must confirm it; the confirmation and who made it are recorded. Never shown as legal advice.

Weekend roll-forward: if the suggested date falls on a Saturday or Sunday, it moves to Monday and says so
(India: Limitation Act s.4 when the court is closed; England & Wales: CPR 2.8 for court-office days).
Court holidays are not known here, which is one reason a person confirms every date.
"""
from __future__ import annotations

import calendar
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

DISCLAIMER = "Suggested date only. Check the rule, the facts and any court holidays, then confirm. Not legal advice."

# unit: days | months | years. offset applied after the period (e.g. ET claim: 3 months less one day).
RULES: Dict[str, List[Dict[str, Any]]] = {
    "IN": [
        {"id": "in_ws_cpc", "label": "Written statement (CPC Order VIII Rule 1)", "trigger": "Date of service of summons", "n": 30, "unit": "days",
         "note": "Extendable up to 90 days by the court; commercial suits have a hard limit of 120 days."},
        {"id": "in_appeal_hc", "label": "First appeal to High Court (Limitation Act, Art. 116(a))", "trigger": "Date of decree", "n": 90, "unit": "days",
         "note": "Time to obtain the certified copy is excluded (s.12)."},
        {"id": "in_appeal_dist", "label": "Appeal to any other court (Limitation Act, Art. 116(b))", "trigger": "Date of decree", "n": 30, "unit": "days",
         "note": "Time to obtain the certified copy is excluded (s.12)."},
        {"id": "in_slp", "label": "Special Leave Petition to Supreme Court", "trigger": "Date of High Court judgment", "n": 90, "unit": "days",
         "note": "60 days from refusal of a certificate of fitness, where one was sought."},
        {"id": "in_review", "label": "Review petition (Limitation Act, Art. 124)", "trigger": "Date of decree or order", "n": 30, "unit": "days", "note": ""},
        {"id": "in_ni138_notice", "label": "Cheque bounce demand notice (NI Act s.138(b))", "trigger": "Date of bank's return memo", "n": 30, "unit": "days", "note": ""},
        {"id": "in_ni138_complaint", "label": "Cheque bounce complaint (NI Act s.142)", "trigger": "Date notice was received by the drawer",
         "n": 45, "unit": "days", "note": "15 days to pay after the notice, then one month to file the complaint."},
        {"id": "in_consumer", "label": "Consumer complaint (Consumer Protection Act 2019, s.69)", "trigger": "Date cause of action arose", "n": 2, "unit": "years", "note": ""},
        {"id": "in_money_suit", "label": "Suit for money / contract (Limitation Act, 3-year articles)", "trigger": "Date cause of action arose", "n": 3, "unit": "years",
         "note": "The exact article depends on the claim; check the start point it uses."},
        {"id": "in_execution", "label": "Execution of a decree (Limitation Act, Art. 136)", "trigger": "Date decree became enforceable", "n": 12, "unit": "years", "note": ""},
        {"id": "in_ibc_appeal", "label": "Appeal to NCLAT (IBC s.61)", "trigger": "Date of NCLT order", "n": 30, "unit": "days", "note": "NCLAT may allow a further 15 days."},
    ],
    "GB": [
        {"id": "gb_aos", "label": "Acknowledgment of service (CPR 10.3)", "trigger": "Deemed service of particulars of claim", "n": 14, "unit": "days", "note": ""},
        {"id": "gb_defence_14", "label": "Defence, no acknowledgment (CPR 15.4(1)(a))", "trigger": "Deemed service of particulars of claim", "n": 14, "unit": "days", "note": ""},
        {"id": "gb_defence_28", "label": "Defence after acknowledgment (CPR 15.4(1)(b))", "trigger": "Deemed service of particulars of claim", "n": 28, "unit": "days",
         "note": "The parties may agree a further 28 days (CPR 15.5); tell the court."},
        {"id": "gb_poc", "label": "Serve particulars of claim (CPR 7.4)", "trigger": "Service of the claim form", "n": 14, "unit": "days", "note": "Must also be no later than the last day for serving the claim form."},
        {"id": "gb_claim_form", "label": "Serve claim form in the jurisdiction (CPR 7.5)", "trigger": "Date of issue", "n": 4, "unit": "months",
         "note": "The step required must be taken before 12:00 midnight on the calendar day four months after issue."},
        {"id": "gb_appeal_ca", "label": "Appellant's notice to the appeal court (CPR 52.12)", "trigger": "Date of the decision", "n": 21, "unit": "days", "note": "Unless the lower court directs a different period."},
        {"id": "gb_et1", "label": "Employment Tribunal claim (most claims)", "trigger": "Date of the act complained of", "n": 3, "unit": "months", "offset_days": -1,
         "note": "ACAS early conciliation pauses the clock; add that time before confirming."},
        {"id": "gb_et3", "label": "Employment Tribunal response, ET3", "trigger": "Date the tribunal sent the claim", "n": 28, "unit": "days", "note": ""},
        {"id": "gb_eat", "label": "Appeal to the EAT", "trigger": "Date written reasons were sent", "n": 42, "unit": "days", "note": ""},
        {"id": "gb_lim_contract", "label": "Limitation: contract or tort (Limitation Act 1980 ss.2, 5)", "trigger": "Date cause of action accrued", "n": 6, "unit": "years", "note": ""},
        {"id": "gb_lim_pi", "label": "Limitation: personal injury (Limitation Act 1980 s.11)", "trigger": "Date of injury or date of knowledge", "n": 3, "unit": "years", "note": ""},
    ],
}


def rules_for(country: str) -> List[Dict[str, Any]]:
    return [dict(r) for r in RULES.get(country, [])]


def find_rule(rule_id: str) -> Optional[Dict[str, Any]]:
    for rules in RULES.values():
        for r in rules:
            if r["id"] == rule_id:
                return r
    return None


def _add_months(d: date, months: int) -> date:
    y, m = divmod(d.month - 1 + months, 12)
    year, month = d.year + y, m + 1
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


def suggest(rule_id: str, trigger: date) -> Dict[str, Any]:
    rule = find_rule(rule_id)
    if rule is None:
        raise ValueError(f"Unknown deadline rule: {rule_id}")
    n, unit = int(rule["n"]), rule["unit"]
    if unit == "days":
        due = trigger + timedelta(days=n)
    elif unit == "months":
        due = _add_months(trigger, n)
    else:
        due = _add_months(trigger, 12 * n)
    due += timedelta(days=int(rule.get("offset_days") or 0))
    rolled = None
    if due.weekday() >= 5:
        moved = due + timedelta(days=7 - due.weekday())
        rolled = f"Moved from {due.strftime('%d/%m/%Y')} (a {due.strftime('%A')}) to the next working day."
        due = moved
    return {
        "rule_id": rule["id"],
        "label": rule["label"],
        "trigger_label": rule["trigger"],
        "trigger_date": trigger.isoformat(),
        "suggested_date": due.isoformat(),
        "period": f"{n} {unit}" + (" less one day" if rule.get("offset_days") == -1 else ""),
        "note": rule.get("note") or "",
        "rolled": rolled,
        "disclaimer": DISCLAIMER,
    }
