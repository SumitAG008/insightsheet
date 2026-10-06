"""
Old and new Indian criminal laws. From 1 July 2024 the Bharatiya Nyaya Sanhita (BNS) replaced the IPC,
the Bharatiya Nagarik Suraksha Sanhita (BNSS) replaced the CrPC and the Bharatiya Sakshya Adhiniyam (BSA)
replaced the Indian Evidence Act. Searching an old section also finds the new one, and the reverse.

This is a lookup of the most-used sections, not the full comparison table. Always check the official
correspondence table published by the Ministry of Home Affairs before relying on a mapping.
"""
from __future__ import annotations

import re
from datetime import date
from typing import Dict, List, Optional

COMMENCEMENT = date(2024, 7, 1)

ACTS = {
    "IPC": {"new": "BNS", "old_name": "Indian Penal Code, 1860", "new_name": "Bharatiya Nyaya Sanhita, 2023"},
    "CRPC": {"new": "BNSS", "old_name": "Code of Criminal Procedure, 1973", "new_name": "Bharatiya Nagarik Suraksha Sanhita, 2023"},
    "IEA": {"new": "BSA", "old_name": "Indian Evidence Act, 1872", "new_name": "Bharatiya Sakshya Adhiniyam, 2023"},
}

# (old section, new section, subject)
MAP: Dict[str, List[tuple]] = {
    "IPC": [
        ("34", "3(5)", "Common intention"), ("120B", "61(2)", "Criminal conspiracy"), ("124A", "152", "Sedition (replaced by acts endangering sovereignty)"),
        ("147", "191(2)", "Rioting"), ("148", "191(3)", "Rioting, armed with deadly weapon"), ("149", "190", "Unlawful assembly, common object"),
        ("302", "103", "Murder"), ("304", "105", "Culpable homicide not amounting to murder"), ("304A", "106", "Death by negligence"),
        ("304B", "80", "Dowry death"), ("306", "108", "Abetment of suicide"), ("307", "109", "Attempt to murder"),
        ("323", "115(2)", "Voluntarily causing hurt"), ("324", "118(1)", "Hurt by dangerous weapons"), ("341", "126(2)", "Wrongful restraint"),
        ("342", "127(2)", "Wrongful confinement"), ("354", "74", "Assault to outrage modesty"), ("354A", "75", "Sexual harassment"),
        ("354D", "78", "Stalking"), ("363", "137(2)", "Kidnapping"), ("366", "87", "Kidnapping a woman to compel marriage"),
        ("376", "64", "Rape"), ("379", "303(2)", "Theft"), ("380", "305", "Theft in a dwelling house"), ("392", "309(4)", "Robbery"),
        ("395", "310(2)", "Dacoity"), ("406", "316(2)", "Criminal breach of trust"), ("409", "316(5)", "Criminal breach of trust by public servant"),
        ("420", "318(4)", "Cheating and dishonestly inducing delivery of property"), ("427", "324(4)", "Mischief causing damage"),
        ("447", "329(3)", "Criminal trespass"), ("448", "329(4)", "House-trespass"), ("465", "336(2)", "Forgery"),
        ("467", "338", "Forgery of valuable security, will"), ("468", "336(3)", "Forgery for cheating"), ("471", "340(2)", "Using a forged document as genuine"),
        ("498A", "85", "Cruelty by husband or relatives"), ("500", "356(2)", "Defamation"), ("506", "351(2)", "Criminal intimidation"),
        ("509", "79", "Insulting the modesty of a woman"),
    ],
    "CRPC": [
        ("41", "35", "Arrest without warrant"), ("41A", "35(3)", "Notice of appearance"), ("107", "126", "Security for keeping the peace"),
        ("125", "144", "Maintenance of wives, children and parents"), ("144", "163", "Urgent orders in cases of nuisance"), ("145", "164", "Dispute as to land or water"),
        ("154", "173", "FIR / information in cognizable cases"), ("156(3)", "175(3)", "Magistrate's order to investigate"), ("161", "180", "Examination of witnesses by police"),
        ("164", "183", "Recording of confessions and statements"), ("167", "187", "Remand / detention during investigation"), ("173", "193", "Police report (charge sheet)"),
        ("190", "210", "Cognizance by Magistrate"), ("197", "218", "Prosecution of judges and public servants"), ("200", "223", "Examination of complainant"),
        ("204", "227", "Issue of process"), ("227", "250", "Discharge (sessions)"), ("239", "262", "Discharge (warrant cases)"),
        ("311", "348", "Power to summon material witness"), ("313", "351", "Examination of the accused"), ("320", "359", "Compounding of offences"),
        ("340", "379", "Procedure for offences against administration of justice"), ("357", "395", "Order to pay compensation"), ("374", "415", "Appeals from convictions"),
        ("389", "430", "Suspension of sentence pending appeal"), ("397", "438", "Revision"), ("401", "442", "High Court's powers of revision"),
        ("436", "478", "Bail in bailable offences"), ("437", "480", "Bail in non-bailable offences"), ("438", "482", "Anticipatory bail"),
        ("439", "483", "Special powers of High Court / Sessions regarding bail"), ("482", "528", "Inherent powers of High Court"),
    ],
    "IEA": [
        ("3", "2", "Definitions"), ("24", "22", "Confession caused by inducement, threat or promise"), ("25", "23(1)", "Confession to police officer"),
        ("27", "23(2) proviso", "Information leading to discovery"), ("32", "26", "Statements of persons who cannot be called (dying declaration)"),
        ("45", "39", "Opinions of experts"), ("65B", "63", "Admissibility of electronic records (certificate)"), ("101", "104", "Burden of proof"),
        ("106", "109", "Burden of proving fact especially within knowledge"), ("113A", "117", "Presumption as to abetment of suicide by a married woman"),
        ("113B", "118", "Presumption as to dowry death"), ("114", "119", "Court may presume existence of certain facts"), ("115", "121", "Estoppel"),
        ("118", "124", "Who may testify"), ("133", "138", "Accomplice"), ("145", "148", "Cross-examination as to previous statements in writing"),
        ("165", "168", "Judge's power to put questions or order production"),
    ],
}

_ALIASES = {
    "IPC": "IPC", "INDIAN PENAL CODE": "IPC", "BNS": "BNS",
    "CRPC": "CRPC", "CR.P.C.": "CRPC", "CR.P.C": "CRPC", "CODE OF CRIMINAL PROCEDURE": "CRPC", "BNSS": "BNSS",
    "IEA": "IEA", "EVIDENCE ACT": "IEA", "INDIAN EVIDENCE ACT": "IEA", "BSA": "BSA",
}
_NEW_TO_OLD = {v["new"]: k for k, v in ACTS.items()}

_SEC = r"\d{1,3}[A-Z]?(?:\(\d+\))?"
# One section or a list ("420, 406 IPC", "420/406 IPC", "302 and 34 IPC") followed by the Act.
_REF_RE = re.compile(
    r"(?:\b(?:s(?:ec(?:tion)?s?)?\.?|u/s\.?|under\s+sections?)\s*)?"
    rf"((?:{_SEC}\s*(?:,|/|&|and)\s*)*{_SEC})\s*(?:of\s+(?:the\s+)?)?"
    r"(IPC|Indian Penal Code|BNSS|BNS|Cr\.?P\.?C\.?|CrPC|Code of Criminal Procedure|BSA|IEA|(?:Indian\s+)?Evidence Act)\b",
    re.I,
)
_SPLIT_RE = re.compile(_SEC, re.I)


def _norm_section(s: str) -> str:
    return re.sub(r"\s+", "", str(s or "")).upper()


def _act_key(name: str) -> Optional[str]:
    n = re.sub(r"\s+", " ", str(name or "")).strip().upper()
    n = n.replace("CR.P.C.", "CRPC").replace("CR.P.C", "CRPC").replace("CRP.C.", "CRPC")
    return _ALIASES.get(n) or _ALIASES.get(n.replace(".", ""))


def lookup(act: str, section: str) -> Optional[Dict[str, str]]:
    key = _act_key(act)
    sec = _norm_section(section)
    if key in MAP:
        for old, new, subject in MAP[key]:
            if _norm_section(old) == sec or _norm_section(old) == re.sub(r"\(.*\)$", "", sec):
                return _row(key, old, new, subject)
    elif key in _NEW_TO_OLD:
        old_key = _NEW_TO_OLD[key]
        for old, new, subject in MAP[old_key]:
            if _norm_section(new) == sec or re.sub(r"\(.*\)$", "", _norm_section(new)) == sec:
                return _row(old_key, old, new, subject)
    return None


def _row(old_key: str, old: str, new: str, subject: str) -> Dict[str, str]:
    a = ACTS[old_key]
    return {"old_act": old_key if old_key != "CRPC" else "CrPC", "old_section": old, "new_act": a["new"], "new_section": new,
            "subject": subject, "old_name": a["old_name"], "new_name": a["new_name"]}


def find_in_text(text: str) -> List[Dict[str, str]]:
    """Every old/new criminal-law section mentioned in free text, with its counterpart."""
    found, seen = [], set()
    for m in _REF_RE.finditer(text or ""):
        for sec in _SPLIT_RE.findall(m.group(1)):
            row = lookup(m.group(2), sec)
            if row:
                k = (row["old_act"], row["old_section"])
                if k not in seen:
                    seen.add(k)
                    found.append({**row, "matched": m.group(0).strip()})
    return found


def search(query: str, limit: int = 25) -> List[Dict[str, str]]:
    q = (query or "").strip()
    if not q:
        return []
    hits = find_in_text(q)
    if hits:
        return hits[:limit]
    ql = q.lower()
    bare = _norm_section(q)
    out = []
    for key, rows in MAP.items():
        for old, new, subject in rows:
            if ql in subject.lower() or bare in (_norm_section(old), _norm_section(new)):
                out.append(_row(key, old, new, subject))
    return out[:limit]


def which_law(offence_date: Optional[date]) -> str:
    if offence_date is None:
        return "Check the date of the offence: the new codes apply to offences on or after 1 July 2024."
    if offence_date >= COMMENCEMENT:
        return "The offence is on or after 1 July 2024, so the BNS / BNSS / BSA apply."
    return "The offence is before 1 July 2024, so the IPC applies to the offence; check the transitional provisions (BNSS s.531) for procedure."
