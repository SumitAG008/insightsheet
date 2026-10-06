"""
Sample bank-vs-books files for the UK and India, with every kind of case planted, so the page can be
tried without real data and the tests can check each pass and each exception type. All names and
numbers are invented.
"""
from __future__ import annotations

import csv
import io
from datetime import date, timedelta
from typing import Dict, List, Tuple

START = date(2026, 9, 1)


def _csv(headers: List[str], rows: List[List]) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    w.writerows(rows)
    return buf.getvalue().encode("utf-8")


def _d(n: int, fmt: str) -> str:
    return (START + timedelta(days=n)).strftime(fmt)


def uk() -> Dict[str, Tuple[str, bytes]]:
    """Barclays-style statement (date, type, description, paid out, paid in) vs Xero-style bank ledger (signed amounts)."""
    bank, books = [], []
    # 1. reference matches (invoice numbers in the narrative)
    for i, (who, inv, amt, day) in enumerate([("ACME SUPPLIES LTD", "INV-20431", 1250.00, 1), ("NORTHWIND TRADING", "INV-20432", 980.40, 2),
                                              ("BRIGHT OFFICE CO", "INV-20433", 312.75, 3), ("HALE CONSULTING", "INV-20434", 4500.00, 5)]):
        bank.append([_d(day, "%d/%m/%Y"), "FPS", f"{who} {inv}", "", f"{amt:.2f}"])
        books.append([_d(day - 1, "%d/%m/%Y"), f"Receipt {inv}", who, inv, f"{-amt:.2f}"])
    # 2. amount + date (no shared reference)
    bank.append([_d(6, "%d/%m/%Y"), "DD", "BRITISH GAS 8812", "245.18", ""])
    books.append([_d(6, "%d/%m/%Y"), "Gas bill September", "British Gas", "", "245.18"])
    bank.append([_d(8, "%d/%m/%Y"), "DD", "VODAFONE LTD", "89.99", ""])
    books.append([_d(9, "%d/%m/%Y"), "Mobile phones", "Vodafone", "", "89.99"])
    # 3. fuzzy: same amount, name variations, a few days apart beyond the date window
    bank.append([_d(10, "%d/%m/%Y"), "BACS", "MAPLE & OAK INTERIORS", "1875.00", ""])
    books.append([_d(3, "%d/%m/%Y"), "Office refit deposit", "Maple and Oak Interiors Ltd", "", "1875.00"])
    # 4. one-to-many: one BACS receipt pays three invoices
    bank.append([_d(12, "%d/%m/%Y"), "BACS", "GREENFIELD RETAIL PLC REMITTANCE", "", "6420.50"])
    for inv, amt in (("INV-20440", 2100.00), ("INV-20441", 1820.50), ("INV-20442", 2500.00)):
        books.append([_d(12, "%d/%m/%Y"), f"Receipt {inv}", "Greenfield Retail PLC", inv, f"{-amt:.2f}"])
    # 5. group: two bank lines and three book lines under one reference
    bank.append([_d(14, "%d/%m/%Y"), "FPS", "CITYLINE PROJECT PRJ7781 PART 1", "", "3000.00"])
    bank.append([_d(15, "%d/%m/%Y"), "FPS", "CITYLINE PROJECT PRJ7781 PART 2", "", "2000.00"])
    for amt in (1500.00, 1500.00, 2000.00):
        books.append([_d(14, "%d/%m/%Y"), "Cityline milestone PRJ7781", "Cityline", "PRJ7781", f"{-amt:.2f}"])
    # Exceptions
    bank.append([_d(16, "%d/%m/%Y"), "FPS", "SUNRISE FOODS INV-20450", "", "747.50"])            # fee: book says 750.00
    books.append([_d(16, "%d/%m/%Y"), "Receipt INV-20450", "Sunrise Foods", "INV-20450", "-750.00"])
    bank.append([_d(17, "%d/%m/%Y"), "FPS", "PEAK FITNESS INV-20451", "", "500.00"])              # partial: invoice 1,200
    books.append([_d(17, "%d/%m/%Y"), "Receipt INV-20451", "Peak Fitness", "INV-20451", "-1200.00"])
    bank.append([_d(20, "%d/%m/%Y"), "CHG", "ACCOUNT FEE SEPTEMBER", "35.00", ""])               # not in books
    books.append([_d(25, "%d/%m/%Y"), "Cheque 100234 to Lewis Builders", "Lewis Builders", "100234", "2300.00"])  # unpresented cheque
    books.append([_d(26, "%d/%m/%Y"), "Gas bill September", "British Gas", "", "245.18"])        # duplicate posting
    bank.append([_d(2, "%d/%m/%Y"), "SO", "RENT QUARTER CLEARVIEW PROPERTIES", "4000.00", ""])   # timing: booked 31 Aug... far
    books.append([_d(-40, "%d/%m/%Y"), "Rent quarter", "Clearview Properties", "", "4000.00"])
    a_headers = ["Date", "Type", "Description", "Paid out", "Paid in"]
    b_headers = ["Date", "Description", "Contact", "Reference", "Amount"]
    return {"a": ("barclays_statement_sep.csv", _csv(a_headers, bank)), "b": ("xero_bank_ledger_sep.csv", _csv(b_headers, books))}


def india() -> Dict[str, Tuple[str, bytes]]:
    """HDFC-style statement (Narration, Chq./Ref.No., Withdrawal/Deposit, lakh commas) vs Tally bank book (Dr/Cr)."""
    def inr(x: float) -> str:
        whole, frac = f"{x:.2f}".split(".")
        if len(whole) > 3:
            head, tail = whole[:-3], whole[-3:]
            groups = []
            while len(head) > 2:
                groups.insert(0, head[-2:])
                head = head[:-2]
            if head:
                groups.insert(0, head)
            whole = ",".join(groups + [tail])
        return f"{whole}.{frac}"

    bank, books = [], []
    for who, utr, amt, day in (("SHARMA TRADERS", "412345678901", 150000.00, 1), ("GUPTA AND SONS", "412345678902", 87500.00, 2),
                               ("KRISHNA ENTERPRISES", "412345678903", 23600.00, 3)):
        bank.append([_d(day, "%d/%m/%y"), f"NEFT CR-HDFC0001234-{who}-{utr}", utr, _d(day, "%d/%m/%y"), "", inr(amt)])
        books.append([_d(day, "%d-%b-%Y"), who.title(), "Receipt", utr, inr(amt) + " Dr"])
    bank.append([_d(4, "%d/%m/%y"), "UPI-RAVI KUMAR-ravi@okhdfc-UPI/603412345678", "603412345678", _d(4, "%d/%m/%y"), "", inr(4500.00)])
    books.append([_d(4, "%d-%b-%Y"), "Ravi Kumar", "Receipt", "UPI 603412345678", inr(4500.00) + " Dr"])
    bank.append([_d(6, "%d/%m/%y"), "ACH D- TP ACH BAJAJ FINANCE-EMI", "000000123", _d(6, "%d/%m/%y"), inr(18250.00), ""])
    books.append([_d(6, "%d-%b-%Y"), "Bajaj Finance Loan EMI", "Payment", "", inr(18250.00) + " Cr"])
    bank.append([_d(9, "%d/%m/%y"), "CHQ PAID-MICR CTS-NAVRANG PRINTERS", "000214", _d(9, "%d/%m/%y"), inr(42000.00), ""])
    books.append([_d(5, "%d-%b-%Y"), "Navrang Printers", "Payment", "Chq 214", inr(42000.00) + " Cr"])
    # one-to-many: one RTGS for three bills
    bank.append([_d(11, "%d/%m/%y"), "RTGS CR-SBIN0000456-MEHTA INDUSTRIES PVT LTD-SBINR52026091100", "SBINR52026091100", _d(11, "%d/%m/%y"), "", inr(530000.00)])
    for bill, amt in (("BILL/2526/118", 200000.00), ("BILL/2526/121", 180000.00), ("BILL/2526/125", 150000.00)):
        books.append([_d(11, "%d-%b-%Y"), "Mehta Industries Pvt Ltd", "Receipt", bill, inr(amt) + " Dr"])
    # Exceptions: TDS short payment, bank charges, cheque not presented, duplicate, timing
    bank.append([_d(13, "%d/%m/%y"), "NEFT CR-ICIC0000777-ORBIT TECH SOLUTIONS-INV2526045", "INV2526045", _d(13, "%d/%m/%y"), "", inr(98000.00)])
    books.append([_d(13, "%d-%b-%Y"), "Orbit Tech Solutions", "Receipt", "INV2526045", inr(100000.00) + " Dr"])   # 2% TDS deducted
    bank.append([_d(15, "%d/%m/%y"), "NEFT CHGS INCL GST", "", _d(15, "%d/%m/%y"), inr(29.50), ""])
    bank.append([_d(30, "%d/%m/%y"), "SMS CHARGES QTR", "", _d(30, "%d/%m/%y"), inr(17.70), ""])
    books.append([_d(27, "%d-%b-%Y"), "Ajanta Steel", "Payment", "Chq 219", inr(65000.00) + " Cr"])           # not presented
    books.append([_d(28, "%d-%b-%Y"), "Bajaj Finance Loan EMI", "Payment", "", inr(18250.00) + " Cr"])        # duplicate
    bank_h = ["Date", "Narration", "Chq./Ref.No.", "Value Dt", "Withdrawal Amt.", "Deposit Amt."]
    books_h = ["Date", "Particulars", "Vch Type", "Vch No.", "Amount"]
    title = b"HDFC BANK LTD\nStatement of account for the period 01/09/2026 to 30/09/2026\n\n"
    return {"a": ("hdfc_statement_sep.csv", title + _csv(bank_h, bank)), "b": ("tally_bank_book_sep.csv", _csv(books_h, books))}


SAMPLES = {"uk": uk, "in": india}
