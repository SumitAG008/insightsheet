"""
Ready-made reconciliations. Each sets which side is which, how amounts compare (same or opposite
sign), the date windows and which passes run. Everything can be changed on the page.
"""
from typing import Any, Dict, List

PRESETS: List[Dict[str, Any]] = [
    {
        "id": "bank_gl", "label": "Bank statement vs cash book / ledger",
        "a": "Bank statement", "b": "Cash book or bank ledger (Tally, Xero, Sage, SAP…)",
        "factor": None, "date_window": 4, "ref_window": 60, "fuzzy_window": 31,
        "uk": "Barclays / HSBC / Lloyds CSV vs Xero, Sage or QuickBooks bank ledger",
        "in": "HDFC / ICICI / SBI statement vs Tally bank book (UPI, NEFT, IMPS, RTGS, cheques)",
    },
    {
        "id": "supplier_statement", "label": "Supplier statement vs purchase ledger",
        "a": "Supplier statement", "b": "Your purchase ledger for that supplier",
        "factor": None, "date_window": 7, "ref_window": 120, "fuzzy_window": 45,
        "uk": "Invoices, credit notes and payments by invoice number",
        "in": "Bills and payments, including TDS deducted and short payments",
    },
    {
        "id": "cash_application", "label": "Customer payments vs open invoices",
        "a": "Payments received (bank or remittances)", "b": "Open sales invoices",
        "factor": 1, "date_window": 30, "ref_window": 180, "fuzzy_window": 90, "many_window": 120,
        "uk": "One BACS payment clearing several invoices",
        "in": "One NEFT/RTGS payment for several bills, net of TDS",
    },
    {
        "id": "cards", "label": "Card statement vs expense claims",
        "a": "Corporate card statement", "b": "Expense claims / receipts",
        "factor": None, "date_window": 5, "ref_window": 60, "fuzzy_window": 31,
        "uk": "Amex / Barclaycard vs expense system", "in": "Corporate card vs expense reports",
    },
    {
        "id": "payment_processor", "label": "Payment processor payouts vs sales",
        "a": "Payouts to the bank (net)", "b": "Sales or orders (gross)",
        "factor": 1, "date_window": 7, "ref_window": 60, "fuzzy_window": 31, "many_window": 10, "tol_pct": 0.035,
        "uk": "Stripe, PayPal, SumUp payouts net of fees", "in": "Razorpay, PayU, Paytm settlements net of MDR and GST",
    },
    {
        "id": "payroll_gl", "label": "Payroll report vs payroll journal",
        "a": "Payroll register / report", "b": "Payroll journal in the ledger",
        "factor": None, "date_window": 5, "ref_window": 45, "fuzzy_window": 31,
        "uk": "Net pay, PAYE, NIC and pension per period", "in": "Net pay, PF, ESI, PT and TDS per month",
    },
    {
        "id": "subledger_gl", "label": "Sub-ledger vs general ledger control account",
        "a": "Sub-ledger (AR, AP, fixed assets)", "b": "GL control account",
        "factor": 1, "date_window": 3, "ref_window": 45, "fuzzy_window": 31,
        "uk": "Sales ledger vs debtors control", "in": "Sundry debtors / creditors vs control ledger",
    },
    {
        "id": "intercompany", "label": "Intercompany balances",
        "a": "Entity A: receivable from B", "b": "Entity B: payable to A",
        "factor": -1, "date_window": 10, "ref_window": 90, "fuzzy_window": 45, "tol_pct": 0.0,
        "uk": "Group recharges and management fees", "in": "Holding / subsidiary recharges, including branch transfers",
    },
]

PRESET_BY_ID = {p["id"]: p for p in PRESETS}
