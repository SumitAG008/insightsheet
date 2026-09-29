"""Lakehouse endpoints through the real FastAPI app (skipped where the full backend can't be imported)."""
import os
import secrets
import tempfile
import uuid

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_lakehouse_endpoints.db')}")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
from fastapi.testclient import TestClient  # noqa: E402

from app.services.lakehouse import store  # noqa: E402

SECRET = f"fake-{secrets.token_hex(8)}"  # test credentials are generated per run
CSV = "Department,Month,Amount\nSales,2026-01-15,\"£1,000\"\nHR,2026-02-03,250\nSales,2026-02-20,500\n"


@pytest.fixture()
def lake(tmp_path, monkeypatch):
    monkeypatch.setenv("LAKEHOUSE_CATALOG", "sql")
    monkeypatch.setenv("LAKEHOUSE_WAREHOUSE", f"file://{tmp_path}/wh")
    monkeypatch.setenv("LAKEHOUSE_NAMESPACE_PREFIX", f"ep{uuid.uuid4().hex[:6]}")
    store.reset_catalog()
    yield
    for u in ("ann@example.com", "bob@example.com"):
        try:
            store.drop_all(u)
        except Exception:
            pass
    store.reset_catalog()
    main.app.dependency_overrides.clear()


def as_user(email):
    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": email}
    return TestClient(main.app)


def test_login_required_and_off_by_default(monkeypatch):
    main.app.dependency_overrides.clear()
    c = TestClient(main.app)
    assert c.get("/api/lakehouse/sources").status_code in (401, 403)
    monkeypatch.delenv("LAKEHOUSE_CATALOG", raising=False)
    c = as_user("ann@example.com")
    assert c.get("/api/lakehouse/status").json()["enabled"] is False
    assert c.get("/api/lakehouse/sources").status_code == 503
    main.app.dependency_overrides.clear()


def test_upload_query_edit_delete(lake):
    c = as_user("ann@example.com")
    assert c.get("/api/lakehouse/status").json()["enabled"] is True
    r = c.post("/api/lakehouse/upload", files={"file": ("costs.csv", CSV, "text/csv")}, data={"system": "SAP S/4"})
    assert r.status_code == 200, r.text
    [src] = r.json()["sources"]
    assert src["system"] == "SAP S/4" and src["row_count"] == 3 and src["month_range"] == ["2026-01", "2026-02"]
    assert [s["table"] for s in c.get("/api/lakehouse/sources").json()["sources"]] == [src["table"]]

    agg = c.post("/api/lakehouse/aggregate", json={"series": [{"table": src["table"], "measure": "amount", "group_by": "department"}]})
    assert agg.status_code == 200
    assert {g["g"]: g["sum"] for g in agg.json()["results"][0]["groups"]} == {"Sales": 1500, "HR": 250}

    p = c.patch(f"/api/lakehouse/sources/{src['table']}", json={"system": "SAP", "columns": [{"name": "Department", "key": "dept"}]})
    assert p.status_code == 200 and p.json()["source"]["system"] == "SAP"
    bad = c.post("/api/lakehouse/aggregate", json={"series": [{"table": src["table"], "group_by": "department"}]})
    assert bad.status_code == 400 and "Unknown column" in bad.json()["detail"]

    pv = c.get(f"/api/lakehouse/sources/{src['table']}/preview").json()
    assert pv["columns"] == ["Department", "Month", "Amount"] and len(pv["rows"]) == 3

    assert c.delete(f"/api/lakehouse/sources/{src['table']}").status_code == 200
    assert c.get("/api/lakehouse/sources").json()["sources"] == []


def test_accounts_cannot_see_each_other(lake):
    ann = as_user("ann@example.com")
    [src] = ann.post("/api/lakehouse/upload", files={"file": ("a.csv", CSV, "text/csv")}).json()["sources"]
    bob = as_user("bob@example.com")
    assert bob.get("/api/lakehouse/sources").json()["sources"] == []
    for r in (bob.post("/api/lakehouse/aggregate", json={"series": [{"table": src["table"], "group_by": "department"}]}),
              bob.get(f"/api/lakehouse/sources/{src['table']}/preview"),
              bob.delete(f"/api/lakehouse/sources/{src['table']}"),
              bob.patch(f"/api/lakehouse/sources/{src['table']}", json={"system": "x"})):
        assert r.status_code == 400 and r.json()["detail"] == "Unknown table."
    ann = as_user("ann@example.com")
    assert len(ann.get("/api/lakehouse/sources").json()["sources"]) == 1


def test_rows_endpoint_strips_secrets_from_origin(lake):
    c = as_user("ann@example.com")
    r = c.post("/api/lakehouse/rows", json={
        "name": "Workers", "system": "SuccessFactors", "kind": "api", "columns": ["userId", "fte"],
        "rows": [{"userId": "E1", "fte": 1}],
        "origin": {"type": "api", "url": "https://api4.successfactors.com/x", "password": SECRET,
                   "auth": {"type": "oauth2_saml_bearer", "client_id": "K", "private_key": "-----BEGIN PRIVATE KEY-----", "client_secret": SECRET}},
    })
    assert r.status_code == 200, r.text
    origin = r.json()["source"]["origin"]
    assert origin["auth"] == {"type": "oauth2_saml_bearer", "client_id": "K"} and "password" not in origin


def test_upload_limits(lake, monkeypatch):
    c = as_user("ann@example.com")
    monkeypatch.setenv("LAKEHOUSE_MAX_UPLOAD_MB", "1")
    big = "a,b\n" + "x,1\n" * 300_000  # about 1.2 MB
    assert c.post("/api/lakehouse/upload", files={"file": ("big.csv", big, "text/csv")}).status_code == 413
    r = c.post("/api/lakehouse/upload", files={"file": ("x.exe", "MZ", "application/octet-stream")})
    assert r.status_code == 400 and "upload a" in r.json()["detail"]


def test_sql_endpoint(lake):
    ann = as_user("ann@example.com")
    [src] = ann.post("/api/lakehouse/upload", files={"file": ("costs.csv", CSV, "text/csv")}).json()["sources"]
    r = ann.post("/api/lakehouse/sql", json={"sql": "SELECT department, SUM(amount) AS total FROM costs GROUP BY 1 ORDER BY 2 DESC", "tables": {"costs": src["table"]}})
    assert r.status_code == 200, r.text
    assert r.json()["columns"] == ["department", "total"] and r.json()["rows"] == [["Sales", 1500.0], ["HR", 250.0]]
    bad = ann.post("/api/lakehouse/sql", json={"sql": "DROP TABLE costs", "tables": {"costs": src["table"]}})
    assert bad.status_code == 400 and "Only SELECT" in bad.json()["detail"]
    bob = as_user("bob@example.com")
    other = bob.post("/api/lakehouse/sql", json={"sql": "SELECT * FROM costs", "tables": {"costs": src["table"]}})
    assert other.status_code == 400 and other.json()["detail"] == "Unknown table."
