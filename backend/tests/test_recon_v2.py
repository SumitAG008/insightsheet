"""Reconciliation v2: UK and Indian exports, every matching pass, every exception type, carry-forward and Claude guard rails."""
import io
import json
import os
import tempfile

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
from fastapi.testclient import TestClient  # noqa: E402

from app.services.recon import engine, parse, samples  # noqa: E402

USER = {"email": "finance@firm.example", "role": "user"}


@pytest.fixture(autouse=True)
def _auth():
    main.app.dependency_overrides[main.get_current_user] = lambda: USER
    yield
    main.app.dependency_overrides.clear()


client = TestClient(main.app)


def row(side, i, d, amt, ref="", desc="", cp=""):
    return {"id": f"{side}{i}", "side": side, "source_row": i, "date": d, "amount": amt, "reference": ref, "description": desc, "counterparty": cp,
            "currency": "", "keys": parse.reference_keys(ref, desc), "names": parse.name_tokens(cp, desc)}


# --- parsing --------------------------------------------------------------------------------------
@pytest.mark.parametrize("raw,expected", [
    ("1,50,000.00", 150000.0), ("₹ 5,000", 5000.0), ("Rs. 10/-", 10.0), ("(1,234.50)", -1234.5), ("1234.50 Dr", -1234.5),
    ("2,500.00 Cr", 2500.0), ("-£12.30", -12.3), ("£1,000", 1000.0), ("100-", -100.0), ("", None), ("-", None), ("abc", None),
])
def test_amounts_uk_and_india(raw, expected):
    assert parse.parse_amount(raw) == expected


def test_dates_day_first_and_month_names():
    assert parse.parse_date("05/03/2026").isoformat() == "2026-03-05"
    assert parse.parse_date("05-Mar-2026").isoformat() == "2026-03-05"
    assert parse.parse_date("5 March 26").isoformat() == "2026-03-05"
    assert parse.parse_date("2026-03-05").isoformat() == "2026-03-05"
    assert parse.detect_date_order(["03/25/2026"]) == "MDY"
    assert parse.parse_date("03/25/2026", "MDY").isoformat() == "2026-03-25"


def test_reference_keys_from_narrations():
    assert "412345678901" in parse.reference_keys("", "NEFT CR-HDFC0001234-SHARMA TRADERS-412345678901")
    assert "603412345678" in parse.reference_keys("", "UPI-RAVI KUMAR-ravi@okhdfc-UPI/603412345678")
    assert "INV-20431" in parse.reference_keys("", "ACME SUPPLIES LTD INV-20431")
    assert "214" in parse.reference_keys("000214", "") and "214" in parse.reference_keys("Chq 214", "")
    assert parse.reference_keys("", "Payment on 12/09/2026") == []


# --- passes ---------------------------------------------------------------------------------------
def test_reference_then_amount_date_and_ambiguity_left_for_a_person():
    a = [row("A", 1, "2026-09-01", 100.0, "INV1001"), row("A", 2, "2026-09-05", 50.0), row("A", 3, "2026-09-10", 75.0), row("A", 4, "2026-09-10", 75.0)]
    b = [row("B", 1, "2026-09-03", 100.0, "INV1001"), row("B", 2, "2026-09-06", 50.0), row("B", 3, "2026-09-10", 75.0)]
    res = engine.reconcile(a, b, engine.Options(factor=1))
    by = {tuple(m["a"]): m["pass"] for m in res["matches"]}
    assert by[("A1",)] == "reference" and by[("A2",)] == "amount_date"
    # Two equally good A candidates for one B: neither is matched automatically.
    assert ("A3",) not in by and ("A4",) not in by
    assert res["summary"]["proof_ok"]


def test_fuzzy_one_to_many_and_group():
    a = [row("A", 1, "2026-09-20", 1875.0, desc="MAPLE & OAK INTERIORS"), row("A", 2, "2026-09-12", 6420.5, desc="GREENFIELD RETAIL REMITTANCE"),
         row("A", 3, "2026-09-14", 3000.0, desc="CITYLINE PRJ7781 PART 1"), row("A", 4, "2026-09-15", 2000.0, desc="CITYLINE PRJ7781 PART 2")]
    b = [row("B", 1, "2026-09-05", 1875.0, desc="Office refit", cp="Maple and Oak Interiors Ltd"),
         row("B", 2, "2026-09-10", 2100.0, "INV-1", cp="Greenfield Retail"), row("B", 3, "2026-09-10", 1820.5, "INV-2", cp="Greenfield Retail"),
         row("B", 4, "2026-09-11", 2500.0, "INV-3", cp="Greenfield Retail"),
         row("B", 5, "2026-09-14", 1700.0, "PRJ7781"), row("B", 6, "2026-09-14", 1600.0, "PRJ7781"), row("B", 7, "2026-09-14", 1700.0, "PRJ7781")]
    res = engine.reconcile(a, b, engine.Options(factor=1, passes=("reference", "amount_date", "fuzzy", "one_to_many", "group")))
    passes = {m["pass"]: m for m in res["matches"]}
    assert passes["fuzzy"]["a"] == ["A1"]
    assert sorted(passes["one_to_many"]["b"]) == ["B2", "B3", "B4"]
    assert sorted(passes["group"]["a"]) == ["A3", "A4"] and sorted(passes["group"]["b"]) == ["B5", "B6", "B7"]
    assert not res["exceptions"]


def test_opposite_signs_are_detected():
    a = [row("A", 1, "2026-09-01", 500.0), row("A", 2, "2026-09-02", -80.0)]
    b = [row("B", 1, "2026-09-01", -500.0), row("B", 2, "2026-09-02", 80.0)]
    res = engine.reconcile(a, b)
    assert res["factor"] == -1 and res["summary"]["matched_a"] == 2


def test_forced_pairs_from_accepted_suggestions():
    a = [row("A", 1, "2026-09-01", 100.0)]
    b = [row("B", 1, "2026-10-30", 99.0)]
    res = engine.reconcile(a, b, engine.Options(factor=1, forced=[(["A1"], ["B1"])]))
    assert res["matches"][0]["pass"] == "manual" and res["matches"][0]["difference"] == 1.0
    assert res["summary"]["proof_ok"]


# --- the samples: every exception type, both countries ---------------------------------------------
def _sample(country, **opts):
    s = samples.SAMPLES[country]()
    sides = {}
    for k in ("a", "b"):
        h, rows = parse.read_table(*s[k])
        sides[k], _ = parse.normalise(rows, parse.detect_roles(h, rows), k.upper())
    return engine.reconcile(sides["a"], sides["b"], engine.Options(period_end="2026-09-30", **opts))


def test_uk_sample():
    res = _sample("uk")
    kinds = {(e["side"], e["kind"]) for e in res["exceptions"]}
    assert {("A", "fee"), ("A", "partial"), ("A", "timing"), ("A", "missing_other"), ("B", "uncleared"), ("B", "duplicate")} <= kinds
    assert res["summary"]["by_pass"]["reference"] >= 4 and res["summary"]["by_pass"]["one_to_many"] >= 1 and res["summary"]["by_pass"]["fuzzy"] >= 1
    assert res["summary"]["proof_ok"] and res["factor"] == -1


def test_india_sample():
    res = _sample("in")
    kinds = {(e["side"], e["kind"]) for e in res["exceptions"]}
    assert {("A", "tds"), ("A", "next_period"), ("B", "uncleared"), ("B", "duplicate")} <= kinds
    charges = [e for e in res["exceptions"] if "CHGS" in e["description"]]
    assert charges and "Bank charge" in charges[0]["hint"]
    assert res["summary"]["by_pass"]["reference"] >= 4  # UTRs and cheque numbers
    assert res["summary"]["proof_ok"]


# --- API: run, report, carry forward, explain ------------------------------------------------------
def _files(country):
    s = samples.SAMPLES[country]()
    return {"file_a": (s["a"][0], s["a"][1], "text/csv"), "file_b": (s["b"][0], s["b"][1], "text/csv")}


def test_api_inspect_run_report_and_carry_forward():
    s = samples.SAMPLES["in"]()
    ins = client.post("/api/recon/inspect", files={"file": (s["a"][0], s["a"][1], "text/csv")}).json()
    assert ins["roles"]["debit"] == "Withdrawal Amt." and ins["readable"] == 10
    cfg = json.dumps({"preset": "bank_gl", "label_a": "HDFC", "label_b": "Tally", "options": {"period_end": "2026-09-30"}})
    r = client.post("/api/recon/run", files=_files("in"), data={"config": cfg})
    assert r.status_code == 200, r.text
    res = r.json()
    assert res["summary"]["proof_ok"] and res["rows"]["A1"]["amount"] == 150000.0
    x = client.post("/api/recon/run", files=_files("in"), data={"config": cfg, "output": "xlsx"})
    assert x.status_code == 200 and x.content[:2] == b"PK"
    oi = client.post("/api/recon/run", files=_files("in"), data={"config": cfg, "output": "open_items"})
    assert oi.status_code == 200 and b"side,date,amount" in oi.content
    # Next month: last month's open items come back and are reconciled again.
    nxt = client.post("/api/recon/run", files={**_files("in"), "open_items": ("open_items.csv", oi.content, "text/csv")}, data={"config": cfg}).json()
    assert nxt["carried"]["a"] + nxt["carried"]["b"] == len(res["exceptions"])
    assert any(e["carried"] for e in nxt["exceptions"])


def test_api_rejects_a_file_with_no_amounts():
    bad = io.BytesIO(b"Date,Name,Notes\n01/09/2026,a,b\n").getvalue()
    r = client.post("/api/recon/run", files={"file_a": ("a.csv", bad, "text/csv"), "file_b": ("b.csv", bad, "text/csv")})
    assert r.status_code == 400 and "amount" in r.json()["detail"].lower()


def test_explain_only_returns_engine_candidates(monkeypatch):
    from app.services import ai_service

    async def fake(prompt, **kw):
        return {"items": [{"id": "A1", "explanation": "Bank fee", "suggest": ["B9", "B1"], "confidence": "high"},
                          {"id": "ZZZ", "explanation": "invented"}], "summary": "ok"}

    monkeypatch.setattr(ai_service, "invoke_llm", fake)
    exc = [{"id": "A1", "side": "A", "date": "2026-09-01", "amount": 747.5, "reference": "", "description": "", "hint": "",
            "candidates": [{"id": "B1", "date": "2026-09-01", "amount": -750.0, "reference": "", "description": "", "difference": 2.5, "days_apart": 0}]}]
    out = client.post("/api/recon/explain", json={"exceptions": exc}).json()
    assert [i["id"] for i in out["items"]] == ["A1"] and out["items"][0]["suggest"] == ["B1"]  # B9 was never a candidate
