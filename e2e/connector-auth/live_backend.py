"""
Run the real meldra backend with only the outside world (identity providers and
business APIs) simulated. The simulated IdPs verify SAML signatures and JWTs with
a freshly generated test certificate, exactly as SuccessFactors / Entra ID would.
Test use only: it signs everyone in as e2e@example.com.
"""
import base64, os, sys, tempfile
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "backend"))
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.gettempdir()}/meldra_e2e.db"

import httpx, jwt as pyjwt, uvicorn
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from signxml import XMLVerifier

OUT = os.environ.get("E2E_OUT", os.path.join(HERE, ".out"))
K = os.path.join(OUT, "keys")
os.makedirs(K, exist_ok=True)
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "meldra-e2e")])
now = datetime.now(timezone.utc)
cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(1)
        .not_valid_before(now - timedelta(days=1)).not_valid_after(now + timedelta(days=5)).sign(key, hashes.SHA256()))
CERT = cert.public_bytes(serialization.Encoding.PEM).decode()
open(f"{K}/key.pem", "w").write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode())
open(f"{K}/cert.pem", "w").write(CERT)
LOG = f"{K}/idp.log"
open(LOG, "w").close()

def log(msg):
    with open(LOG, "a") as f:
        f.write(msg + "\n")

def handler(req: httpx.Request):
    host, path = req.headers["host"], req.url.path
    form = {k: v[0] for k, v in parse_qs(req.content.decode()).items()} if req.method == "POST" else {}
    try:
        if host == "api4.successfactors.com" and path == "/oauth/token":
            XMLVerifier().verify(base64.b64decode(form["assertion"]), x509_cert=CERT)
            assert form["company_id"] == "ACME01" and form["client_id"] == "SFAPIKEY"
            log("SF token: SAML signature VERIFIED")
            return httpx.Response(200, json={"access_token": "sf-token"})
        if host == "api4.successfactors.com":
            assert req.headers.get("authorization") == "Bearer sf-token"
            if "skiptoken" in str(req.url):
                return httpx.Response(200, json={"d": {"results": [{"userId": "E3", "department": "Finance", "costCenter": "CC30", "startDate": "/Date(1717200000000)/"}]}})
            return httpx.Response(200, json={"d": {"results": [
                {"userId": "E1", "department": "Sales", "costCenter": "CC10", "startDate": "/Date(1704067200000)/"},
                {"userId": "E2", "department": "HR", "costCenter": "CC20", "startDate": "/Date(1709251200000)/"}],
                "__next": "https://api4.successfactors.com/odata/v2/EmpJob?$format=json&$skiptoken=2"}})
        if host == "login.microsoftonline.com":
            h = pyjwt.get_unverified_header(form["client_assertion"])
            pyjwt.decode(form["client_assertion"], key.public_key(), algorithms=["RS256"], audience=f"https://{host}{path}")
            assert "x5t" in h and "client_secret" not in form
            log("Graph token: private_key_jwt VERIFIED (x5t present)")
            return httpx.Response(200, json={"access_token": "graph-token"})
        if host == "graph.microsoft.com":
            assert req.headers.get("authorization") == "Bearer graph-token"
            return httpx.Response(200, json={"value": [{"id": "u1", "displayName": "Ann", "department": "Sales"}, {"id": "u2", "displayName": "Bo", "department": "HR"}]})
        if host == "oauth.platform.intuit.com":
            assert form["refresh_token"].startswith("rt-") and req.headers["authorization"].startswith("Basic ")
            log("Intuit token: refresh grant OK, rotating")
            return httpx.Response(200, json={"access_token": "qb-token", "refresh_token": form["refresh_token"] + "-rotated"})
        if host == "quickbooks.api.intuit.com":
            assert req.headers.get("authorization") == "Bearer qb-token"
            return httpx.Response(200, json={"QueryResponse": {"Invoice": [{"Id": "1", "TotalAmt": 120.5, "CustomerRef": {"name": "Acme"}}]}})
    except Exception as e:  # a failed check is reported to the caller as the IdP would
        log(f"REJECTED {host}{path}: {type(e).__name__} {e}")
        return httpx.Response(401, json={"error": "invalid_grant", "error_description": "signature or claims rejected"})
    return httpx.Response(404, json={})

from app import main
from app.services import api_connector_service as svc
real = svc.fetch_records
main.fetch_records = lambda config: real(config, resolver=lambda h, p: ["93.184.216.34"], transport=httpx.MockTransport(handler))
main.app.dependency_overrides[main.get_current_user] = lambda: {"email": "e2e@example.com"}
uvicorn.run(main.app, host="127.0.0.1", port=8001, log_level="warning")
