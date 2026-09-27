"""The connector endpoints through the real FastAPI app (skipped where the full backend can't be imported)."""
import os
import secrets
import tempfile

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
from fastapi.testclient import TestClient  # noqa: E402

from app.services import api_connector_service as svc  # noqa: E402

SECRET = f"fake-{secrets.token_hex(8)}"  # generated per run


@pytest.fixture()
def client():
    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": "endpoint-test@example.com"}
    svc._calls.clear()
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()
    svc._calls.clear()


def test_requires_login():
    c = TestClient(main.app)
    assert c.post("/api/unified-reporting/connector/fetch", json={"url": "https://api.example.com/x"}).status_code in (401, 403)
    assert c.get("/api/unified-reporting/connector/presets").status_code in (401, 403)


def test_presets_and_egress(client):
    body = client.get("/api/unified-reporting/connector/presets").json()
    assert {p["id"] for p in body["presets"]} >= {"successfactors", "msgraph", "workday", "salesforce", "stripe"}
    assert set(body["egress"]) == {"static_ip", "ips"}


def test_rejects_unsafe_targets_with_400(client):
    r = client.post("/api/unified-reporting/connector/fetch", json={"url": "https://127.0.0.1/x"})
    assert r.status_code == 400 and "private" in r.json()["detail"]
    r = client.post("/api/unified-reporting/connector/fetch", json={"url": "http://example.com/x"})
    assert r.status_code == 400


def test_validation_errors_never_echo_secrets(client):
    r = client.post("/api/unified-reporting/connector/fetch", json={"url": "x", "auth": {"type": "basic", "password": SECRET}})
    assert r.status_code == 422 and SECRET not in r.text
    r = client.post("/api/unified-reporting/connector/fetch", json={"url": "https://api.example.com/x", "auth": SECRET})
    assert r.status_code == 400 and SECRET not in r.text


def test_rate_limited(client, monkeypatch):
    async def fake_fetch(config):
        return {"columns": [], "rows": [], "row_count": 0, "pages": 1, "truncated": False, "records_path": "", "paging": "none", "new_refresh_token": None}

    monkeypatch.setattr(main, "fetch_records", fake_fetch)
    codes = [client.post("/api/unified-reporting/connector/fetch", json={"url": "https://api.example.com/x"}).status_code for _ in range(31)]
    assert codes[:30] == [200] * 30 and codes[30] == 429


def test_successfactors_saml_bearer_through_the_endpoint(client, monkeypatch):
    """Endpoint -> connector -> signed SAML assertion -> token endpoint -> OData, with only the network mocked."""
    import base64
    from urllib.parse import parse_qs

    import httpx
    from signxml import XMLVerifier

    from tests.test_connector_auth import CERT_PEM, RSA_PEM

    def handler(request):
        if request.url.path == "/oauth/token":
            form = {k: v[0] for k, v in parse_qs(request.content.decode()).items()}
            XMLVerifier().verify(base64.b64decode(form["assertion"]), x509_cert=CERT_PEM)
            assert form["company_id"] == "ACME01" and form["grant_type"].endswith("saml2-bearer")
            return httpx.Response(200, json={"access_token": "sf-token", "token_type": "Bearer", "expires_in": 3600})
        assert request.headers["authorization"] == "Bearer sf-token"
        return httpx.Response(200, json={"d": {"results": [{"userId": "E1", "department": "Sales"}, {"userId": "E2", "department": "HR"}]}})

    real = svc.fetch_records
    monkeypatch.setattr(main, "fetch_records", lambda config: real(config, resolver=lambda h, p: ["93.184.216.34"], transport=httpx.MockTransport(handler)))
    r = client.post("/api/unified-reporting/connector/fetch", json={
        "url": "https://api4.successfactors.com/odata/v2/EmpJob?$format=json", "paging": "odata",
        "auth": {"type": "oauth2_saml_bearer", "token_url": "https://api4.successfactors.com/oauth/token", "client_id": "SFKEY",
                 "company_id": "ACME01", "subject": "apiuser", "issuer": "www.successfactors.com", "audience": "www.successfactors.com",
                 "api_key_attribute": True, "client_auth": "none", "private_key": RSA_PEM, "certificate": CERT_PEM},
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["row_count"] == 2 and body["records_path"] == "d.results"
    assert "PRIVATE KEY" not in r.text and "sf-token" not in r.text
