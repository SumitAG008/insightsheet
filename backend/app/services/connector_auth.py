"""
Token-based authentication for the Unified Reporting API connector.

Enterprise systems accept these instead of IP allowlisting:
  - OAuth 2.0 client credentials (RFC 6749 4.4), with the client authenticated by
    client_secret_post, client_secret_basic or private_key_jwt (RFC 7523 section 2.2,
    signed with the customer's key; certificate thumbprint in x5t for Entra ID).
  - OAuth 2.0 refresh token (RFC 6749 section 6): Workday API clients, QuickBooks, Xero.
  - OAuth 2.0 JWT bearer grant (RFC 7523 section 2.1): Salesforce, Google service accounts.
  - OAuth 2.0 SAML 2.0 bearer grant (RFC 7522): SAP SuccessFactors, SAP BTP, S/4HANA.
    The assertion is signed here with the customer's X.509 key (RSA-SHA256,
    exclusive C14N, enveloped signature placed after Issuer), or a pre-signed
    assertion from the customer's IdP can be passed through.

Keys, secrets and tokens are used for one request only. They are never stored,
never logged and never included in error messages.
"""
import base64
import hashlib
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode

TOKEN_GRANTS = {
    "oauth2_client_credentials": "client_credentials",
    "oauth2_refresh_token": "refresh_token",
    "oauth2_jwt_bearer": "urn:ietf:params:oauth:grant-type:jwt-bearer",
    "oauth2_saml_bearer": "urn:ietf:params:oauth:grant-type:saml2-bearer",
}
CLIENT_AUTH = ("client_secret_post", "client_secret_basic", "private_key_jwt", "none")
JWT_ALGS = ("RS256", "RS384", "RS512", "PS256", "ES256")
ASSERTION_LIFETIME = 300  # seconds; short-lived by design
SECRET_FIELDS = ("password", "token", "key_value", "client_secret", "refresh_token", "private_key", "passphrase", "assertion")


class AuthConfigError(ValueError):
    """Bad or missing authentication settings, described without revealing any secret."""


def _s(auth: Dict[str, Any], key: str) -> str:
    v = auth.get(key)
    return "" if v is None else str(v).strip()


def _need(auth: Dict[str, Any], *keys: str) -> None:
    missing = [k.replace("_", " ") for k in keys if not _s(auth, k)]
    if missing:
        raise AuthConfigError(f"Missing {', '.join(missing)} for this authentication method.")


def load_private_key(pem: str, passphrase: str = ""):
    from cryptography.hazmat.primitives import serialization

    try:
        return serialization.load_pem_private_key(pem.encode(), password=passphrase.encode() if passphrase else None)
    except TypeError:
        raise AuthConfigError("The private key is encrypted: enter its passphrase.")
    except Exception:
        # Never echo the key or the underlying parser message.
        raise AuthConfigError("The private key could not be read. Paste a PEM key (-----BEGIN PRIVATE KEY-----) and its passphrase if it has one.")


def load_certificate(pem: str):
    from cryptography import x509

    try:
        return x509.load_pem_x509_certificate(pem.encode())
    except Exception:
        raise AuthConfigError("The certificate could not be read. Paste a PEM certificate (-----BEGIN CERTIFICATE-----).")


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _jwt(claims: Dict[str, Any], auth: Dict[str, Any]) -> str:
    import jwt as pyjwt
    from cryptography.hazmat.primitives import serialization

    _need(auth, "private_key")
    alg = _s(auth, "algorithm") or "RS256"
    if alg not in JWT_ALGS:
        raise AuthConfigError("Unsupported signing algorithm.")
    key = load_private_key(_s(auth, "private_key"), _s(auth, "passphrase"))
    headers: Dict[str, Any] = {"typ": "JWT"}
    if _s(auth, "key_id"):
        headers["kid"] = _s(auth, "key_id")
    if _s(auth, "certificate"):
        der = load_certificate(_s(auth, "certificate")).public_bytes(serialization.Encoding.DER)
        headers["x5t"] = _b64url(hashlib.sha1(der).digest())  # noqa: S324 - thumbprint format required by Entra ID
        headers["x5t#S256"] = _b64url(hashlib.sha256(der).digest())
    try:
        return pyjwt.encode(claims, key, algorithm=alg, headers=headers)
    except Exception:
        raise AuthConfigError("The key does not match the signing algorithm.")


def client_assertion(auth: Dict[str, Any], token_url: str) -> str:
    """private_key_jwt client authentication (RFC 7523 section 2.2 / OIDC)."""
    now = int(time.time())
    cid = _s(auth, "client_id")
    aud = _s(auth, "client_assertion_audience") or token_url
    return _jwt({"iss": cid, "sub": cid, "aud": aud, "jti": str(uuid.uuid4()),
                 "iat": now, "nbf": now - 30, "exp": now + ASSERTION_LIFETIME}, auth)


def jwt_bearer_assertion(auth: Dict[str, Any], token_url: str) -> str:
    """JWT used as the authorization grant (RFC 7523 section 2.1)."""
    _need(auth, "client_id", "subject")
    now = int(time.time())
    claims = {"iss": _s(auth, "issuer") or _s(auth, "client_id"), "sub": _s(auth, "subject"),
              "aud": _s(auth, "audience") or token_url, "jti": str(uuid.uuid4()),
              "iat": now, "nbf": now - 30, "exp": now + ASSERTION_LIFETIME}
    if _s(auth, "scope") and auth.get("scope_in_assertion"):
        claims["scope"] = _s(auth, "scope")
    return _jwt(claims, auth)


def _iso(t: datetime) -> str:
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def saml_assertion(auth: Dict[str, Any], token_url: str, now: Optional[datetime] = None) -> str:
    """Build and sign a SAML 2.0 bearer assertion; returns it base64-encoded."""
    from lxml import etree
    from signxml import SignatureConstructionMethod, XMLSigner

    _need(auth, "subject", "private_key")
    now = now or datetime.now(timezone.utc)
    issuer = _s(auth, "issuer") or _s(auth, "client_id")
    audience = _s(auth, "audience") or token_url
    recipient = _s(auth, "recipient") or token_url
    if not issuer:
        raise AuthConfigError("Missing issuer for the SAML assertion.")
    saml = "urn:oasis:names:tc:SAML:2.0:assertion"
    ds = "http://www.w3.org/2000/09/xmldsig#"
    E = lambda tag, parent=None, **attrs: (etree.SubElement(parent, f"{{{saml}}}{tag}", **attrs)  # noqa: E731
                                           if parent is not None else etree.Element(f"{{{saml}}}{tag}", nsmap={"saml2": saml}, **attrs))
    aid = f"_{uuid.uuid4().hex}"
    not_before = _iso(now - timedelta(seconds=60))
    not_after = _iso(now + timedelta(seconds=ASSERTION_LIFETIME))
    root = E("Assertion", ID=aid, IssueInstant=_iso(now), Version="2.0")
    E("Issuer", root).text = issuer
    # Placeholder so the signature lands right after Issuer, as the SAML schema requires.
    etree.SubElement(root, f"{{{ds}}}Signature", Id="placeholder", nsmap={"ds": ds})
    subj = E("Subject", root)
    E("NameID", subj, Format=_s(auth, "name_id_format") or "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified").text = _s(auth, "subject")
    conf = E("SubjectConfirmation", subj, Method="urn:oasis:names:tc:SAML:2.0:cm:bearer")
    E("SubjectConfirmationData", conf, NotOnOrAfter=not_after, Recipient=recipient)
    cond = E("Conditions", root, NotBefore=not_before, NotOnOrAfter=not_after)
    E("Audience", E("AudienceRestriction", cond)).text = audience
    authn = E("AuthnStatement", root, AuthnInstant=_iso(now), SessionIndex=aid)
    E("AuthnClassRef", E("AuthnContext", authn)).text = "urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport"
    # SuccessFactors expects the OAuth client ID as the "api_key" attribute.
    if auth.get("api_key_attribute") and _s(auth, "client_id"):
        attr = E("Attribute", E("AttributeStatement", root), Name="api_key")
        E("AttributeValue", attr).text = _s(auth, "client_id")

    key = load_private_key(_s(auth, "private_key"), _s(auth, "passphrase"))
    cert = None
    if _s(auth, "certificate"):
        from cryptography.hazmat.primitives import serialization
        cert = [load_certificate(_s(auth, "certificate")).public_bytes(serialization.Encoding.PEM).decode()]
    try:
        signer = XMLSigner(method=SignatureConstructionMethod.enveloped, signature_algorithm="rsa-sha256",
                           digest_algorithm="sha256", c14n_algorithm="http://www.w3.org/2001/10/xml-exc-c14n#")
        signed = signer.sign(root, key=key, cert=cert, reference_uri=aid)
    except Exception:
        raise AuthConfigError("The SAML assertion could not be signed with this key (an RSA key is required).")
    return base64.b64encode(etree.tostring(signed)).decode()


def token_request(auth_type: str, auth: Dict[str, Any], token_url: str) -> Tuple[Dict[str, str], bytes]:
    """Headers and form body for the token endpoint call."""
    if auth_type not in TOKEN_GRANTS:
        raise AuthConfigError("Not a token-based authentication method.")
    form: Dict[str, str] = {"grant_type": TOKEN_GRANTS[auth_type]}
    headers = {"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"}
    client_auth = _s(auth, "client_auth") or ("client_secret_post" if _s(auth, "client_secret") else "none")
    if client_auth not in CLIENT_AUTH:
        raise AuthConfigError("Unknown client authentication method.")

    if auth_type == "oauth2_client_credentials":
        _need(auth, "client_id")
        if client_auth == "none":
            raise AuthConfigError("Client credentials need a client secret or a private key.")
    elif auth_type == "oauth2_refresh_token":
        _need(auth, "refresh_token")
        form["refresh_token"] = _s(auth, "refresh_token")
    elif auth_type == "oauth2_jwt_bearer":
        form["assertion"] = jwt_bearer_assertion(auth, token_url)
    elif auth_type == "oauth2_saml_bearer":
        form["assertion"] = _s(auth, "assertion") or saml_assertion(auth, token_url)
        if _s(auth, "company_id"):
            form["company_id"] = _s(auth, "company_id")  # SuccessFactors

    for k in ("scope", "audience", "resource"):
        # For JWT/SAML grants, audience is the assertion's audience, not a token parameter.
        if k == "audience" and auth_type in ("oauth2_jwt_bearer", "oauth2_saml_bearer"):
            continue
        if _s(auth, k):
            form[k] = _s(auth, k)

    cid = _s(auth, "client_id")
    if client_auth == "client_secret_basic":
        _need(auth, "client_id", "client_secret")
        pair = f"{cid}:{_s(auth, 'client_secret')}".encode()
        headers["Authorization"] = "Basic " + base64.b64encode(pair).decode()
    elif client_auth == "client_secret_post":
        _need(auth, "client_id", "client_secret")
        form["client_id"] = cid
        form["client_secret"] = _s(auth, "client_secret")
    elif client_auth == "private_key_jwt":
        _need(auth, "client_id")
        form["client_id"] = cid
        form["client_assertion_type"] = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
        form["client_assertion"] = client_assertion(auth, token_url)
    elif cid:
        form["client_id"] = cid  # public client (e.g. SuccessFactors SAML bearer)
    return headers, urlencode(form).encode()


def public_auth_settings(auth: Dict[str, Any]) -> Dict[str, Any]:
    """The non-secret part of an auth config, safe to keep for a later refresh."""
    return {k: v for k, v in (auth or {}).items() if k not in SECRET_FIELDS and k != "certificate"}
