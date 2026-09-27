"""
Token-based connector authentication: every grant is exercised against a mock
token endpoint that verifies signatures the way the real identity provider would.
"""
import asyncio
import base64
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs

import httpx
import jwt as pyjwt
import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from cryptography.x509.oid import NameOID
from lxml import etree
from signxml import XMLVerifier

from app.services.api_connector_service import ConnectorError, allow_call, egress_info, fetch_records, public_presets, redact
from app.services.connector_auth import AuthConfigError, public_auth_settings, saml_assertion, token_request

PUBLIC = lambda host, port: ["93.184.216.34"]  # noqa: E731
TOKEN_URL = "https://login.example.com/oauth/token"
API_URL = "https://api.example.com/v1/items"
SAML = {"s": "urn:oasis:names:tc:SAML:2.0:assertion", "ds": "http://www.w3.org/2000/09/xmldsig#"}


def _keypair(kind="rsa", passphrase=None):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048) if kind == "rsa" else ec.generate_private_key(ec.SECP256R1())
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "meldra-test")])
    now = datetime.now(timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now - timedelta(days=1))
            .not_valid_after(now + timedelta(days=30)).sign(key, hashes.SHA256()))
    enc = serialization.BestAvailableEncryption(passphrase.encode()) if passphrase else serialization.NoEncryption()
    key_pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, enc).decode()
    cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode()
    return key, key_pem, cert, cert_pem


RSA_KEY, RSA_PEM, RSA_CERT, CERT_PEM = _keypair()


def run(coro):
    return asyncio.run(coro)


def api_and_token(on_token, records=None):
    """Mock transport: token endpoint handled by on_token(form, request); API returns records if the bearer token is right."""
    seen = {"token_calls": 0, "api_auth": []}

    def handler(request: httpx.Request):
        if request.headers["host"] == "login.example.com":
            seen["token_calls"] += 1
            form = {k: v[0] for k, v in parse_qs(request.content.decode()).items()}
            return on_token(form, request)
        seen["api_auth"].append(request.headers.get("authorization"))
        if request.headers.get("authorization") != "Bearer good-token":
            return httpx.Response(401, json={})
        return httpx.Response(200, json={"value": records or [{"id": 1, "department": "Sales"}]})

    return httpx.MockTransport(handler), seen


def fetch(auth, transport):
    return run(fetch_records({"url": API_URL, "auth": auth}, resolver=PUBLIC, transport=transport))


# ---------------- OAuth 2.0 client credentials ----------------

def test_client_credentials_with_secret_in_body():
    def on_token(form, req):
        assert form == {"grant_type": "client_credentials", "client_id": "cid", "client_secret": "csecret", "scope": "api/.default"}
        assert "authorization" not in req.headers
        return httpx.Response(200, json={"access_token": "good-token", "token_type": "Bearer"})

    t, seen = api_and_token(on_token)
    out = fetch({"type": "oauth2_client_credentials", "token_url": TOKEN_URL, "client_id": "cid", "client_secret": "csecret", "scope": "api/.default"}, t)
    assert out["row_count"] == 1 and seen["api_auth"] == ["Bearer good-token"]


def test_client_credentials_with_basic_client_auth_and_audience():
    def on_token(form, req):
        assert req.headers["authorization"] == "Basic " + base64.b64encode(b"cid:csecret").decode()
        assert "client_secret" not in form and form["audience"] == "https://api.example.com"
        return httpx.Response(200, json={"access_token": "good-token"})

    t, _ = api_and_token(on_token)
    fetch({"type": "oauth2_client_credentials", "token_url": TOKEN_URL, "client_id": "cid", "client_secret": "csecret",
           "client_auth": "client_secret_basic", "audience": "https://api.example.com"}, t)


@pytest.mark.parametrize("kind,alg", [("rsa", "RS256"), ("rsa", "PS256"), ("ec", "ES256")])
def test_client_credentials_with_private_key_jwt(kind, alg):
    key, key_pem, cert, cert_pem = (RSA_KEY, RSA_PEM, RSA_CERT, CERT_PEM) if kind == "rsa" else _keypair("ec")

    def on_token(form, req):
        assert form["client_assertion_type"] == "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
        assert "client_secret" not in form
        header = pyjwt.get_unverified_header(form["client_assertion"])
        der = cert.public_bytes(serialization.Encoding.DER)
        # Entra ID matches the certificate by its SHA-1 thumbprint in x5t.
        assert header["x5t"] == base64.urlsafe_b64encode(hashlib.sha1(der).digest()).rstrip(b"=").decode()
        assert header["kid"] == "k1" and header["alg"] == alg
        claims = pyjwt.decode(form["client_assertion"], key.public_key(), algorithms=[alg], audience=TOKEN_URL)
        assert claims["iss"] == claims["sub"] == "cid" and claims["exp"] - claims["iat"] <= 300 and claims["jti"]
        return httpx.Response(200, json={"access_token": "good-token"})

    t, _ = api_and_token(on_token)
    fetch({"type": "oauth2_client_credentials", "token_url": TOKEN_URL, "client_id": "cid", "client_auth": "private_key_jwt",
           "private_key": key_pem, "certificate": cert_pem, "key_id": "k1", "algorithm": alg}, t)


def test_encrypted_private_key_needs_passphrase():
    _, enc_pem, _, _ = _keypair(passphrase="pw123")
    auth = {"type": "oauth2_client_credentials", "token_url": TOKEN_URL, "client_id": "cid", "client_auth": "private_key_jwt", "private_key": enc_pem}
    t, seen = api_and_token(lambda f, r: httpx.Response(200, json={"access_token": "good-token"}))
    with pytest.raises(ConnectorError, match="passphrase"):
        fetch(auth, t)
    assert seen["token_calls"] == 0
    fetch({**auth, "passphrase": "pw123"}, t)


# ---------------- refresh token ----------------

def test_refresh_token_returns_rotated_token_without_storing_it():
    def on_token(form, req):
        assert form["grant_type"] == "refresh_token" and form["refresh_token"] == "rt-old"
        return httpx.Response(200, json={"access_token": "good-token", "refresh_token": "rt-new"})

    t, _ = api_and_token(on_token)
    out = fetch({"type": "oauth2_refresh_token", "token_url": TOKEN_URL, "client_id": "cid", "client_secret": "cs",
                 "client_auth": "client_secret_basic", "refresh_token": "rt-old"}, t)
    assert out["new_refresh_token"] == "rt-new"

    t2, _ = api_and_token(lambda f, r: httpx.Response(200, json={"access_token": "good-token", "refresh_token": "rt-old"}))
    same = fetch({"type": "oauth2_refresh_token", "token_url": TOKEN_URL, "refresh_token": "rt-old"}, t2)
    assert same["new_refresh_token"] is None


# ---------------- JWT bearer grant (Salesforce) ----------------

def test_jwt_bearer_grant():
    def on_token(form, req):
        assert form["grant_type"] == "urn:ietf:params:oauth:grant-type:jwt-bearer"
        claims = pyjwt.decode(form["assertion"], RSA_KEY.public_key(), algorithms=["RS256"], audience="https://login.salesforce.com")
        assert claims["iss"] == "consumer-key" and claims["sub"] == "integration@acme.com"
        assert "audience" not in form  # audience belongs in the assertion only
        return httpx.Response(200, json={"access_token": "good-token"})

    t, _ = api_and_token(on_token)
    fetch({"type": "oauth2_jwt_bearer", "token_url": TOKEN_URL, "client_id": "consumer-key", "subject": "integration@acme.com",
           "audience": "https://login.salesforce.com", "private_key": RSA_PEM}, t)


# ---------------- SAML 2.0 bearer grant (SuccessFactors / SAP) ----------------

def _verify_saml(b64):
    xml = base64.b64decode(b64)
    verified = XMLVerifier().verify(xml, x509_cert=CERT_PEM).signed_xml
    root = etree.fromstring(xml)
    return root, verified


def test_saml_bearer_grant_successfactors():
    captured = {}

    def on_token(form, req):
        captured.update(form)
        root, signed = _verify_saml(form["assertion"])  # raises if the signature is wrong
        assert signed.get("ID") == root.get("ID")
        return httpx.Response(200, json={"access_token": "good-token"})

    t, _ = api_and_token(on_token)
    fetch({"type": "oauth2_saml_bearer", "token_url": TOKEN_URL, "client_id": "SFAPIKEY", "company_id": "ACME01",
           "subject": "apiuser", "issuer": "www.successfactors.com", "audience": "www.successfactors.com",
           "api_key_attribute": True, "private_key": RSA_PEM, "certificate": CERT_PEM, "client_auth": "none"}, t)
    assert captured["grant_type"] == "urn:ietf:params:oauth:grant-type:saml2-bearer"
    assert captured["company_id"] == "ACME01" and captured["client_id"] == "SFAPIKEY" and "client_secret" not in captured
    root = etree.fromstring(base64.b64decode(captured["assertion"]))
    assert [etree.QName(c).localname for c in root][:3] == ["Issuer", "Signature", "Subject"]  # schema order
    assert root.findtext("s:Issuer", namespaces=SAML) == "www.successfactors.com"
    assert root.findtext("s:Subject/s:NameID", namespaces=SAML) == "apiuser"
    assert root.findtext("s:Conditions/s:AudienceRestriction/s:Audience", namespaces=SAML) == "www.successfactors.com"
    data = root.find("s:Subject/s:SubjectConfirmation/s:SubjectConfirmationData", namespaces=SAML)
    assert data.get("Recipient") == TOKEN_URL
    assert root.findtext("s:AttributeStatement/s:Attribute[@Name='api_key']/s:AttributeValue", namespaces=SAML) == "SFAPIKEY"
    cond = root.find("s:Conditions", namespaces=SAML)
    start = datetime.strptime(cond.get("NotBefore"), "%Y-%m-%dT%H:%M:%SZ")
    end = datetime.strptime(cond.get("NotOnOrAfter"), "%Y-%m-%dT%H:%M:%SZ")
    assert timedelta(0) < end - start <= timedelta(minutes=6)


def test_saml_signature_detects_tampering():
    b64 = saml_assertion({"subject": "apiuser", "client_id": "c", "private_key": RSA_PEM}, TOKEN_URL)
    xml = base64.b64decode(b64).replace(b">apiuser<", b">admin<")
    with pytest.raises(Exception):
        XMLVerifier().verify(xml, x509_cert=CERT_PEM)


def test_pre_signed_saml_assertion_is_passed_through():
    def on_token(form, req):
        assert form["assertion"] == "PRESIGNED" and form["company_id"] == "ACME01"
        return httpx.Response(200, json={"access_token": "good-token"})

    t, _ = api_and_token(on_token)
    fetch({"type": "oauth2_saml_bearer", "token_url": TOKEN_URL, "client_id": "k", "company_id": "ACME01", "assertion": "PRESIGNED"}, t)


def test_saml_requires_rsa_key_and_subject():
    _, ec_pem, _, _ = _keypair("ec")
    with pytest.raises(AuthConfigError, match="RSA"):
        saml_assertion({"subject": "u", "client_id": "c", "private_key": ec_pem}, TOKEN_URL)
    with pytest.raises(AuthConfigError, match="subject"):
        saml_assertion({"client_id": "c", "private_key": RSA_PEM}, TOKEN_URL)


# ---------------- errors, secrets and safety ----------------

def test_token_errors_show_oauth_code_but_never_secrets(caplog):
    def on_token(form, req):
        return httpx.Response(401, json={"error": "invalid_client", "error_description": "bad secret csecret-XYZ for cid"})

    t, seen = api_and_token(on_token)
    caplog.set_level(logging.DEBUG)
    with pytest.raises(ConnectorError) as e:
        fetch({"type": "oauth2_client_credentials", "token_url": TOKEN_URL, "client_id": "cid", "client_secret": "csecret-XYZ"}, t)
    assert "invalid_client" in str(e.value) and "csecret-XYZ" not in str(e.value)
    assert "csecret-XYZ" not in caplog.text
    assert seen["api_auth"] == []  # the API is never called without a token


def test_bad_key_message_does_not_echo_key():
    junk = "-----BEGIN PRIVATE KEY-----\nTOPSECRETNOTAKEY\n-----END PRIVATE KEY-----"
    with pytest.raises(AuthConfigError) as e:
        token_request("oauth2_jwt_bearer", {"client_id": "c", "subject": "u", "private_key": junk}, TOKEN_URL)
    assert "TOPSECRET" not in str(e.value)


def test_token_url_must_be_public_https():
    t, seen = api_and_token(lambda f, r: httpx.Response(200, json={"access_token": "good-token"}))
    for bad, msg in [("http://login.example.com/token", "https"), ("https://{tenant}.example.com/token", "placeholders")]:
        with pytest.raises(ConnectorError, match=msg):
            fetch({"type": "oauth2_client_credentials", "token_url": bad, "client_id": "c", "client_secret": "s"}, t)
    with pytest.raises(ConnectorError, match="private"):
        run(fetch_records({"url": API_URL, "auth": {"type": "oauth2_client_credentials", "token_url": "https://idp.internal/token", "client_id": "c", "client_secret": "s"}},
                          resolver=lambda h, p: ["10.0.0.8"] if h == "idp.internal" else ["93.184.216.34"], transport=t))
    with pytest.raises(ConnectorError, match="token URL"):
        fetch({"type": "oauth2_refresh_token", "refresh_token": "x"}, t)
    assert seen["token_calls"] == 0


def test_missing_fields_are_named():
    with pytest.raises(AuthConfigError, match="client secret"):
        token_request("oauth2_client_credentials", {"client_id": "c", "client_auth": "client_secret_post"}, TOKEN_URL)
    with pytest.raises(AuthConfigError, match="refresh token"):
        token_request("oauth2_refresh_token", {}, TOKEN_URL)


def test_redact_and_public_settings():
    auth = {"type": "oauth2_saml_bearer", "client_id": "cid", "private_key": RSA_PEM, "client_secret": "s3cr3t", "token_url": TOKEN_URL, "passphrase": "pp12"}
    assert redact("x s3cr3t y pp12", auth) == "x *** y ***"
    kept = public_auth_settings(auth)
    assert set(kept) == {"type", "client_id", "token_url"}


def test_stripe_style_last_id_paging():
    data = [{"id": f"ch_{i}", "amount": i} for i in range(5)]

    def handler(request):
        after = request.url.params.get("starting_after")
        start = next((i + 1 for i, d in enumerate(data) if d["id"] == after), 0)
        page = data[start:start + 2]
        return httpx.Response(200, json={"object": "list", "data": page, "has_more": start + 2 < len(data)})

    out = run(fetch_records({"url": "https://api.stripe.com/v1/charges?limit=2", "paging": "last_id", "records_path": "data",
                             "auth": {"type": "bearer", "token": "rk_test"}}, resolver=PUBLIC, transport=httpx.MockTransport(handler)))
    assert [r["id"] for r in out["rows"]] == [d["id"] for d in data] and out["pages"] == 3


def test_rate_limit_per_user():
    for i in range(30):
        assert allow_call("rl@example.com", now=1000.0 + i)
    assert not allow_call("rl@example.com", now=1031.0)
    assert allow_call("other@example.com", now=1031.0)
    assert allow_call("rl@example.com", now=1000.0 + 601)  # window has moved on


def test_egress_info(monkeypatch):
    monkeypatch.delenv("CONNECTOR_EGRESS_PROXY", raising=False)
    assert egress_info() == {"static_ip": False, "ips": []}
    monkeypatch.setenv("CONNECTOR_EGRESS_PROXY", "http://proxy.example.com:8080")
    monkeypatch.setenv("CONNECTOR_EGRESS_IPS", "203.0.113.10, 203.0.113.11")
    assert egress_info() == {"static_ip": True, "ips": ["203.0.113.10", "203.0.113.11"]}


def test_presets_use_token_auth_and_have_no_secrets():
    presets = {p["id"]: p for p in public_presets()}
    assert presets["successfactors"]["auth"] == "oauth2_saml_bearer"
    assert presets["salesforce"]["auth"] == "oauth2_jwt_bearer"
    assert presets["workday"]["auth"] == "oauth2_refresh_token"
    assert presets["msgraph"]["auth_defaults"]["client_auth"] == "private_key_jwt"
    text = str(presets)
    for secret in ("client_secret", "password", "private_key", "refresh_token\":"):
        assert f"'{secret}':" not in text
