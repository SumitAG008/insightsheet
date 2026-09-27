"""
Unified Reporting test pack: four exports from four systems that only make sense together.

  employees.csv      SuccessFactors (HR)     Employee ID, Name, Department, Country, Salary (£), Status, Hire Date
  expenses.csv       Concur (expenses)       Claim ID, Employee ID, Date, Category, Amount (£)
  budget.xlsx        Finance (budget)        Department, Month, Amount (£)
  opportunities.xlsx Salesforce (CRM)        Opportunity ID, Owner Employee ID, Customer, Stage, Close Date, Amount (£)

Expenses and opportunities only carry an employee ID: the department comes from HR, through
a link Meldra suggests (Employee ID / Owner Employee ID → HR Employee ID). The budget is by
department and month, so it lines up with expenses on both. The expected answers below are
computed here from the same data, so anyone can check Meldra's numbers.

Writes public/unified-reporting-test-pack/ (served by the app) and expected.json.
"""
import csv
import json
import os
import random
from collections import defaultdict
from datetime import date

from openpyxl import Workbook

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "unified-reporting-test-pack")
os.makedirs(OUT, exist_ok=True)
rng = random.Random(2026)

DEPTS = ["Sales", "Engineering", "Finance", "People", "Operations"]
COUNTRIES = ["UK", "Germany", "USA"]
FIRST = ["Ava", "Ben", "Chloe", "Dev", "Ella", "Finn", "Grace", "Hugo", "Isla", "Jack", "Kai", "Lena", "Max", "Nina", "Omar",
         "Priya", "Quinn", "Rosa", "Sam", "Tara", "Umar", "Vera", "Will", "Zoe"]

employees = []
for i, name in enumerate(FIRST):
    dept = DEPTS[i % len(DEPTS)]
    employees.append({
        "Employee ID": f"E{1001 + i}", "Name": f"{name} {chr(65 + (i * 7) % 26)}.", "Department": dept,
        "Country": COUNTRIES[i % 3], "Salary (£)": 38000 + 2500 * ((i * 5) % 11) + (8000 if dept == "Engineering" else 0),
        "Status": "Left" if i in (4, 17) else "Active", "Hire Date": date(2019 + i % 6, 1 + (i * 3) % 12, 1 + i % 27).isoformat(),
    })
dept_of = {e["Employee ID"]: e["Department"] for e in employees}

expenses = []
cats = ["Travel", "Hotels", "Meals", "Training", "Software"]
for n in range(90):
    emp = employees[rng.randrange(len(employees))]["Employee ID"]
    d = date(2026, 1 + rng.randrange(6), 1 + rng.randrange(28))
    expenses.append({"Claim ID": f"CL-{5000 + n}", "Employee ID": emp, "Date": d.strftime("%d/%m/%Y"),
                     "Category": cats[rng.randrange(len(cats))], "Amount (£)": f"£{rng.randint(20, 900)}.{rng.choice(['00', '50', '99'])}"})

budget = [{"Department": d, "Month": date(2026, mth, 1), "Amount (£)": 2500 + 500 * DEPTS.index(d) + 100 * mth} for d in DEPTS for mth in range(1, 7)]

stages = ["Prospecting", "Proposal", "Negotiation", "Closed won", "Closed lost"]
customers = ["Acme Ltd", "Globex", "Initech", "Umbrella", "Stark Industries", "Wayne Enterprises"]
opps = []
for n in range(40):
    owner = rng.choice([e for e in employees if e["Department"] in ("Sales", "Operations", "Finance")])["Employee ID"]
    opps.append({"Opportunity ID": f"OP-{700 + n}", "Owner Employee ID": owner, "Customer": customers[n % len(customers)],
                 "Stage": stages[rng.randrange(len(stages))], "Close Date": date(2026, 1 + rng.randrange(9), 1 + rng.randrange(28)),
                 "Amount (£)": rng.randint(5, 120) * 1000})

# ---------- files ----------
def write_csv(name, rows):
    with open(os.path.join(OUT, name), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)


def write_xlsx(name, sheet, rows):
    wb = Workbook()
    ws = wb.active
    ws.title = sheet
    ws.append(list(rows[0]))
    for r in rows:
        ws.append(list(r.values()))
    for cell in ws["B" if sheet == "Budget" else "E"][1:]:
        cell.number_format = "yyyy-mm-dd"
    wb.save(os.path.join(OUT, name))


write_csv("employees.csv", employees)
write_csv("expenses.csv", expenses)
write_xlsx("budget.xlsx", "Budget", budget)
write_xlsx("opportunities.xlsx", "Opportunities", opps)

# ---------- expected answers (independent of Meldra) ----------
money = lambda s: float(str(s).replace("£", "").replace(",", ""))  # noqa: E731
by = lambda rows, key, val: {k: round(v, 2) for k, v in sorted(_sum(rows, key, val).items())}  # noqa: E731


def _sum(rows, key, val):
    out = defaultdict(float)
    for r in rows:
        out[key(r)] += val(r)
    return out


exp_by_dept = by(expenses, lambda r: dept_of[r["Employee ID"]], lambda r: money(r["Amount (£)"]))
budget_by_dept = by(budget, lambda r: r["Department"], lambda r: r["Amount (£)"])
exp_by_month = by(expenses, lambda r: f"2026-{r['Date'][3:5]}", lambda r: money(r["Amount (£)"]))
budget_by_month = by(budget, lambda r: r["Month"].strftime("%Y-%m"), lambda r: r["Amount (£)"])
opp_by_dept = by(opps, lambda r: dept_of[r["Owner Employee ID"]], lambda r: r["Amount (£)"])
active = [e for e in employees if e["Status"] == "Active"]
salary_by_dept = by(active, lambda r: r["Department"], lambda r: r["Salary (£)"])
heads = defaultdict(int)
for e in active:
    heads[e["Department"]] += 1
exp_per_head = {d: round(exp_by_dept.get(d, 0) / heads[d], 2) for d in sorted(heads)}

questions = [
    {"id": "Q1", "ask": "expenses amount by department", "systems": "Concur + SuccessFactors (link)",
     "why": "Expenses only have an employee ID; the department comes from HR through the link.", "columns": ["amount"], "expected": {k: [v] for k, v in exp_by_dept.items()}},
    {"id": "Q2", "ask": "expenses amount vs budget amount by department", "systems": "Concur + SuccessFactors + Finance",
     "why": "Actual spend (via the HR link) against the budget file, joined on department.", "columns": ["expenses", "budget"],
     "expected": {d: [exp_by_dept.get(d, 0), budget_by_dept[d]] for d in DEPTS}},
    {"id": "Q3", "ask": "expenses amount vs budget amount by month", "systems": "Concur + Finance",
     "why": "Two systems on a shared calendar: claim dates (dd/mm/yyyy) and budget months line up as months.", "columns": ["expenses", "budget"],
     "expected": {m: [exp_by_month.get(m, 0), budget_by_month[m]] for m in sorted(budget_by_month)}},
    {"id": "Q4", "ask": "opportunities amount by department", "systems": "Salesforce + SuccessFactors (link)",
     "why": "Pipeline by the owner's department, looked up in HR.", "columns": ["amount"], "expected": {k: [v] for k, v in opp_by_dept.items()}},
    {"id": "Q5", "ask": "active employees salary by department", "systems": "SuccessFactors",
     "why": "One system, with a filter (Status is Active) taken from the question.", "columns": ["salary"], "expected": {k: [v] for k, v in salary_by_dept.items()}},
]
expected = {
    "files": ["employees.csv", "expenses.csv", "budget.xlsx", "opportunities.xlsx"],
    "links": ["expenses.employee_id → employees.employee_id", "opportunities.owner_employee_id → employees.employee_id"],
    "questions": questions,
    "ai_prompt": {"ask": "Expenses per active employee by department", "expected": exp_per_head,
                  "note": "Needs the AI planner (a ratio of two sources): expenses from Concur divided by active headcount from HR."},
    "report_prompt": "Department cost and pipeline report",
}
json.dump(expected, open(os.path.join(OUT, "expected.json"), "w"), indent=1, default=str)

# ---------- a page anyone can follow ----------
def table(q):
    head = "".join(f"<th>{c}</th>" for c in ["", *q["columns"]])
    body = "".join(f"<tr><td>{k}</td>{''.join(f'<td>£{v:,.2f}</td>' for v in vals)}</tr>" for k, vals in q["expected"].items())
    return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unified Reporting test pack</title>
<style>body{{font:15px/1.55 system-ui,sans-serif;max-width:920px;margin:32px auto;padding:0 16px;color:#0f172a}}code{{background:#f1f5f9;padding:1px 5px;border-radius:4px}}
table{{border-collapse:collapse;margin:8px 0 18px}}td,th{{border:1px solid #e2e8f0;padding:4px 10px;text-align:right}}td:first-child,th:first-child{{text-align:left}}
.q{{border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;margin:14px 0}}a.f{{display:inline-block;margin:4px 8px 4px 0;padding:6px 12px;border:1px solid #2563eb;border-radius:8px;text-decoration:none}}</style></head><body>
<h1>Unified Reporting test pack</h1>
<p>Four exports from four systems. On their own, none of them can answer the questions below; together they can.
That is what unified reporting means: Meldra links the systems and answers across them.</p>
<p>{''.join(f'<a class="f" href="{f}" download>{f}</a>' for f in expected['files'])}</p>
<h2>Test script</h2>
<ol>
<li>Open <b>Unified Reporting → Data sources</b>. Click <b>Remove all data</b> if anything is there.</li>
<li>Click <b>Choose files</b> and select <b>all four files at once</b> (Ctrl or ⌘ + click), or drop them together.</li>
<li>Check you see 4 sources: employees (24 rows), expenses (90), budget (30), opportunities (40).</li>
<li>Under <b>Links between sources</b>, click <b>Link</b> for:<br><code>{'</code><br><code>'.join(expected['links'])}</code></li>
<li>Under <b>Shared dimensions</b> you should see <code>department</code> and <code>month</code>.</li>
<li>Go to <b>Ask</b> and type each question below exactly. Compare the answer (switch to <b>Table</b>, or <b>CSV</b>) with the expected numbers.</li>
<li>Switch the composer to <b>Build a report</b> and type <code>{expected['report_prompt']}</code>: you get several charts drawing on the four systems. Click <b>Add all to dashboard</b>, then <b>Excel</b>.</li>
</ol>
{''.join(f'<div class="q"><b>{q["id"]}. <code>{q["ask"]}</code></b><br>{q["systems"]}: {q["why"]}{table(q)}</div>' for q in questions)}
<div class="q"><b>With the AI planner: <code>{expected['ai_prompt']['ask']}</code></b><br>{expected['ai_prompt']['note']}
{table({'columns': ['per active employee'], 'expected': {k: [v] for k, v in exp_per_head.items()}})}</div>
</body></html>"""
open(os.path.join(OUT, "README.html"), "w").write(html)
print(f"Test pack written to {os.path.abspath(OUT)}")
for q in questions:
    print(q["id"], q["ask"], "→", list(q["expected"].items())[:2], "…")
