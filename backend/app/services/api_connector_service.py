"""
Unified Reporting — generic API connector (REST, OData, GraphQL, SOAP/XML).

The browser cannot call most business APIs directly (CORS, secrets), so this
service fetches on the user's behalf and returns plain records that become a
Unified Reporting source, exactly like an uploaded file.

Safety rules:
  - HTTPS only. The host must resolve to public IP addresses only; the request
    is then pinned to the checked address (no DNS rebinding) with TLS still
    verified against the real host name.
  - Redirects are not followed. Paging links must stay on the same host, so
    credentials are never sent anywhere the user did not type.
  - Credentials are used for this request only: never stored, never logged.
  - Pages, rows, bytes and time are capped.
"""
import ipaddress
import json
import os
import re
import threading
from collections import deque
import socket
import time
import xml.etree.ElementTree as ET
from typing import Any, Callable, Dict, List, Optional, Tuple
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit

import httpx

from app.services.connector_auth import SECRET_FIELDS, TOKEN_GRANTS, AuthConfigError, token_request

MAX_ROWS = 200_000
MAX_PAGES = 500
MAX_RESPONSE_BYTES = 50 * 1024 * 1024
MAX_TOTAL_BYTES = 200 * 1024 * 1024
REQUEST_TIMEOUT = 30.0
TOTAL_TIMEOUT = 150.0
MAX_COLUMNS = 300
FLATTEN_DEPTH = 3

AUTH_TYPES = ("none", "basic", "bearer", "api_key", *TOKEN_GRANTS)
PAGING_TYPES = ("none", "auto", "odata", "next_url", "link_header", "offset", "page", "cursor", "last_id")
RATE_LIMIT = (30, 600)  # fetches per user per 10 minutes


def egress_proxy() -> Optional[str]:
    """Optional outbound proxy with a fixed IP, for the few systems that still require IP allowlisting."""
    return os.environ.get("CONNECTOR_EGRESS_PROXY") or None


def ca_bundle() -> Any:
    """Certificate check for outbound calls: system CAs, or a bundle for proxies that inspect TLS (CONNECTOR_CA_BUNDLE)."""
    return os.environ.get("CONNECTOR_CA_BUNDLE") or True


def egress_info() -> Dict[str, Any]:
    ips = [x.strip() for x in os.environ.get("CONNECTOR_EGRESS_IPS", "").split(",") if x.strip()]
    return {"static_ip": bool(egress_proxy() and ips), "ips": ips if egress_proxy() else []}


_calls: Dict[str, deque] = {}
_calls_lock = threading.Lock()


def allow_call(user: str, now: Optional[float] = None) -> bool:
    """Sliding-window limit so the connector can't be used as a scraper or scanner."""
    limit, window = RATE_LIMIT
    now = time.monotonic() if now is None else now
    with _calls_lock:
        q = _calls.setdefault(user, deque())
        while q and q[0] <= now - window:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(now)
        return True
BLOCKED_HEADERS = {"host", "content-length", "transfer-encoding", "connection", "cookie", "proxy-authorization"}

NO_ALLOWLIST = " Token-based, so no IP allowlisting is needed."

PRESETS: List[Dict[str, Any]] = [
    {
        "id": "rest",
        "name": "Any REST / JSON API",
        "method": "GET",
        "url": "https://api.example.com/v1/employees",
        "auth": "bearer",
        "paging": "auto",
        "records_path": "",
        "help": "Paste the endpoint that returns a list. Leave 'Records at' empty to find the list automatically.",
    },
    {
        "id": "successfactors",
        "name": "SAP SuccessFactors (OData v2)",
        "method": "GET",
        "url": "https://api{dc}.successfactors.com/odata/v2/EmpJob?$format=json&$select=userId,department,costCenter,company,startDate",
        "auth": "oauth2_saml_bearer",
        "auth_defaults": {"token_url": "https://api{dc}.successfactors.com/oauth/token", "issuer": "www.successfactors.com",
                          "audience": "www.successfactors.com", "api_key_attribute": True, "client_auth": "none"},
        "paging": "odata",
        "records_path": "d.results",
        "help": "OAuth 2.0 SAML bearer: in Admin Center > Manage OAuth2 Client Applications, register meldra with your X.509 certificate; the API key is the client ID, the subject is the API user ID." + NO_ALLOWLIST,
    },
    {
        "id": "s4hana",
        "name": "SAP S/4HANA / SAP BTP (OData)",
        "method": "GET",
        "url": "https://{host}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$format=json",
        "auth": "oauth2_client_credentials",
        "auth_defaults": {"token_url": "https://{subdomain}.authentication.{region}.hana.ondemand.com/oauth/token", "client_auth": "client_secret_basic"},
        "paging": "odata",
        "records_path": "d.results",
        "help": "Use the OAuth client of a communication arrangement (client credentials, or SAML bearer for a named user). Basic auth also works for on-premise systems." + NO_ALLOWLIST,
    },
    {
        "id": "msgraph",
        "name": "Microsoft Graph",
        "method": "GET",
        "url": "https://graph.microsoft.com/v1.0/users?$select=id,displayName,department,jobTitle,officeLocation",
        "auth": "oauth2_client_credentials",
        "auth_defaults": {"token_url": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
                          "scope": "https://graph.microsoft.com/.default", "client_auth": "private_key_jwt"},
        "paging": "odata",
        "records_path": "value",
        "help": "Register an app in Entra ID with application permissions (e.g. User.Read.All) and admin consent. Upload the certificate to the app and use its private key (recommended), or use a client secret." + NO_ALLOWLIST,
    },
    {
        "id": "workday",
        "name": "Workday report (RaaS)",
        "method": "GET",
        "url": "https://{host}/ccx/service/customreport2/{tenant}/{owner}/{report}?format=json",
        "auth": "oauth2_refresh_token",
        "auth_defaults": {"token_url": "https://{host}/ccx/oauth2/{tenant}/token", "client_auth": "client_secret_basic"},
        "paging": "none",
        "records_path": "Report_Entry",
        "help": "Register an API client for integrations in Workday (non-expiring refresh token) with access to the report's domain. Basic auth with an integration system user also works." + NO_ALLOWLIST,
    },
    {
        "id": "salesforce",
        "name": "Salesforce (SOQL query)",
        "method": "GET",
        "url": "https://{instance}.my.salesforce.com/services/data/v60.0/query?q=SELECT+Id,Name,Industry,AnnualRevenue+FROM+Account",
        "auth": "oauth2_jwt_bearer",
        "auth_defaults": {"token_url": "https://login.salesforce.com/services/oauth2/token", "audience": "https://login.salesforce.com", "client_auth": "none"},
        "paging": "next_url",
        "next_path": "nextRecordsUrl",
        "records_path": "records",
        "help": "OAuth 2.0 JWT bearer: create a connected app with your certificate, pre-authorize the integration user; client ID is the consumer key, subject is the user name. Use https://test.salesforce.com for sandboxes." + NO_ALLOWLIST,
    },
    {
        "id": "quickbooks",
        "name": "QuickBooks Online (query)",
        "method": "GET",
        "url": "https://quickbooks.api.intuit.com/v3/company/{realmId}/query?query=select%20*%20from%20Invoice&minorversion=70",
        "auth": "oauth2_refresh_token",
        "auth_defaults": {"token_url": "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", "client_auth": "client_secret_basic"},
        "headers": {"Accept": "application/json"},
        "paging": "none",
        "records_path": "QueryResponse.Invoice",
        "help": "Intuit issues a new refresh token on each use: meldra shows it after the fetch so you can keep it." + NO_ALLOWLIST,
    },
    {
        "id": "stripe",
        "name": "Stripe (payments)",
        "method": "GET",
        "url": "https://api.stripe.com/v1/charges?limit=100",
        "auth": "bearer",
        "paging": "last_id",
        "cursor_param": "starting_after",
        "records_path": "data",
        "help": "Use a restricted secret key (rk_...) with read access only." + NO_ALLOWLIST,
    },
    {
        "id": "kyriba",
        "name": "Kyriba (treasury)",
        "method": "GET",
        "url": "https://{environment}.kyriba.com/gateway/api/v1/cash-balances",
        "auth": "oauth2_client_credentials",
        "auth_defaults": {"token_url": "", "client_auth": "client_secret_basic"},
        "paging": "auto",
        "records_path": "",
        "help": "Create an API client in Kyriba and copy its token URL, client ID and secret; check the endpoint path in your Kyriba API portal." + NO_ALLOWLIST,
    },
    {
        "id": "graphql",
        "name": "GraphQL endpoint",
        "method": "POST",
        "body_type": "graphql",
        "url": "https://api.example.com/graphql",
        "body": "query { employees(first: 500) { nodes { id department salary } } }",
        "auth": "bearer",
        "paging": "none",
        "records_path": "data.employees.nodes",
        "help": "Put the query in the body. Records at points to the list inside 'data'.",
    },
    {
        "id": "soap",
        "name": "SOAP / XML API",
        "method": "POST",
        "body_type": "xml",
        "url": "https://api.example.com/soap/HumanResources",
        "headers": {"SOAPAction": ""},
        "body": "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\"><soapenv:Body></soapenv:Body></soapenv:Envelope>",
        "auth": "basic",
        "paging": "none",
        "records_path": "",
        "help": "XML is converted to records; namespaces are ignored. Set 'Records at' to the repeating element path, e.g. Envelope.Body.Response.Worker.",
    },
]


class ConnectorError(ValueError):
    """A problem the user can fix (bad URL, wrong credentials, unexpected shape)."""


Resolver = Callable[[str, int], List[str]]


def _default_resolver(host: str, port: int) -> List[str]:
    infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    return list(dict.fromkeys(i[4][0] for i in infos))


def _is_public(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip.split("%")[0])
    except ValueError:
        return False
    if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
        addr = addr.ipv4_mapped
    return addr.is_global and not addr.is_multicast


def check_url(url: str, resolver: Resolver = _default_resolver) -> Tuple[str, int, str]:
    """Return (host, port, ip) for a safe HTTPS URL, or raise ConnectorError."""
    parts = urlsplit(str(url or "").strip())
    if parts.scheme != "https":
        raise ConnectorError("Only https:// addresses are allowed.")
    if parts.username or parts.password:
        raise ConnectorError("Put credentials in the authentication fields, not in the address.")
    host = (parts.hostname or "").lower()
    if not host or "{" in host or "}" in host:
        raise ConnectorError("Replace the {placeholders} in the address with your own values.")
    try:
        port = parts.port or 443
    except ValueError:
        raise ConnectorError("The address has an invalid port.")
    try:
        ips = resolver(host, port)
    except OSError:
        raise ConnectorError(f"Could not find the server {host}.")
    if not ips:
        raise ConnectorError(f"Could not find the server {host}.")
    if not all(_is_public(ip) for ip in ips):
        raise ConnectorError("That address points to a private or internal network, which is not allowed.")
    return host, port, ips[0]


def _pinned(url: str, ip: str) -> str:
    parts = urlsplit(url)
    host = f"[{ip}]" if ":" in ip else ip
    netloc = f"{host}:{parts.port}" if parts.port else host
    return urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))


def _set_query(url: str, updates: Dict[str, Any]) -> str:
    parts = urlsplit(url)
    q = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k not in updates]
    q += [(k, str(v)) for k, v in updates.items()]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(q, safe="$,():'*"), parts.fragment))


def _clean_headers(headers: Any) -> Dict[str, str]:
    out: Dict[str, str] = {}
    if not isinstance(headers, dict):
        return out
    for k, v in list(headers.items())[:30]:
        name = str(k).strip()
        if not name or name.lower() in BLOCKED_HEADERS or not re.fullmatch(r"[A-Za-z0-9-]{1,64}", name):
            continue
        value = str(v if v is not None else "")
        if "\n" in value or "\r" in value or len(value) > 4000:
            continue
        out[name] = value
    return out



# ---------------- response shape ----------------

def _strip_ns(tag: str) -> str:
    return tag.split("}", 1)[-1].split(":", 1)[-1]


def xml_to_obj(text: str) -> Any:
    """Convert XML to nested dicts/lists. Namespaces are dropped; repeated tags become lists."""
    if re.search(r"<!DOCTYPE|<!ENTITY", text[:5000], re.IGNORECASE):
        raise ConnectorError("XML with a DOCTYPE is not accepted.")
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        raise ConnectorError("The response is not valid XML.")

    def conv(el: ET.Element) -> Any:
        kids = list(el)
        attrs = {_strip_ns(k): v for k, v in el.attrib.items()}
        if not kids:
            text_val = (el.text or "").strip()
            if attrs:
                if text_val:
                    attrs["value"] = text_val
                return attrs
            return text_val or None
        counts: Dict[str, int] = {}
        for c in kids:
            counts[_strip_ns(c.tag)] = counts.get(_strip_ns(c.tag), 0) + 1
        out: Dict[str, Any] = attrs
        for c in kids:
            k = _strip_ns(c.tag)
            if counts[k] > 1:
                out.setdefault(k, []).append(conv(c))
            else:
                out[k] = conv(c)
        return out

    return {_strip_ns(root.tag): conv(root)}


def get_path(obj: Any, path: str) -> Any:
    cur = obj
    for part in [p for p in str(path or "").split(".") if p]:
        if isinstance(cur, dict):
            if part in cur:
                cur = cur[part]
            else:
                # Tolerate case differences (XML and some APIs vary).
                match = next((k for k in cur if str(k).lower() == part.lower()), None)
                if match is None:
                    return None
                cur = cur[match]
        elif isinstance(cur, list) and part.isdigit() and int(part) < len(cur):
            cur = cur[int(part)]
        else:
            return None
    return cur


COMMON_PATHS = ("d.results", "d", "value", "records", "data", "items", "results", "Report_Entry", "rows", "entries", "elements")


def _is_record_list(v: Any) -> bool:
    return isinstance(v, list) and len(v) > 0 and sum(isinstance(x, dict) for x in v[:20]) >= min(len(v), 20) * 0.8


def find_records(payload: Any, path: str = "") -> Tuple[List[Dict[str, Any]], str]:
    """Return (records, path used). With no path, look in the usual places, then search."""
    if path:
        found = get_path(payload, path)
        if isinstance(found, dict):
            return [found], path
        if isinstance(found, list):
            return [x if isinstance(x, dict) else {"value": x} for x in found], path
        raise ConnectorError(f"Nothing was found at '{path}' in the response. Leave 'Records at' empty to detect it.")
    if _is_record_list(payload):
        return payload, ""
    for p in COMMON_PATHS:
        v = get_path(payload, p)
        if _is_record_list(v):
            return v, p
    # Breadth-first: the first sizeable list of objects anywhere in the response.
    queue: List[Tuple[Any, str]] = [(payload, "")]
    best: Optional[Tuple[List[Any], str]] = None
    steps = 0
    while queue and steps < 5000:
        node, p = queue.pop(0)
        steps += 1
        if isinstance(node, dict):
            for k, v in node.items():
                np = f"{p}.{k}" if p else str(k)
                if _is_record_list(v) and (best is None or len(v) > len(best[0])):
                    best = (v, np)
                if isinstance(v, (dict, list)):
                    queue.append((v, np))
        elif isinstance(node, list):
            for x in node[:3]:
                if isinstance(x, dict):
                    queue.append((x, p))
    if best:
        return best[0], best[1]
    if isinstance(payload, dict) and payload:
        return [payload], ""
    return [], ""


def flatten(rec: Dict[str, Any], prefix: str = "", depth: int = 0) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k, v in rec.items():
        if k in ("__metadata", "__deferred", "@odata.etag", "attributes") or str(k).startswith("@odata."):
            continue
        key = f"{prefix}.{k}" if prefix else str(k)
        if isinstance(v, dict):
            if "__deferred" in v:
                continue
            if "results" in v and isinstance(v["results"], list):  # OData v2 expanded collection
                v = v["results"]
            elif depth < FLATTEN_DEPTH:
                out.update(flatten(v, key, depth + 1))
                continue
            else:
                out[key] = json.dumps(v, default=str)[:500]
                continue
        if isinstance(v, list):
            if all(not isinstance(x, (dict, list)) for x in v):
                out[key] = ", ".join("" if x is None else str(x) for x in v)[:500]
            else:
                out[key] = f"{len(v)} items"
            continue
        out[key] = v
    return out


def odata_date(v: Any) -> Any:
    """OData v2 dates look like /Date(1700000000000)/; turn them into ISO dates."""
    if isinstance(v, str):
        m = re.fullmatch(r"/Date\((-?\d+)(?:[+-]\d+)?\)/", v)
        if m:
            return time.strftime("%Y-%m-%d", time.gmtime(int(m.group(1)) / 1000))
    return v


def to_table(records: List[Dict[str, Any]]) -> Tuple[List[str], List[Dict[str, Any]]]:
    rows = [{k: odata_date(v) for k, v in flatten(r).items()} for r in records]
    columns: List[str] = []
    seen = set()
    for r in rows[:2000]:
        for k in r:
            if k not in seen and len(columns) < MAX_COLUMNS:
                seen.add(k)
                columns.append(k)
    keep = set(columns)
    rows = [{k: v for k, v in r.items() if k in keep} for r in rows]
    return columns, rows


# ---------------- fetching ----------------

def _parse_link_header(value: str) -> Optional[str]:
    for part in (value or "").split(","):
        m = re.match(r'\s*<([^>]+)>\s*;(.*)', part)
        if m and re.search(r'rel="?next"?', m.group(2)):
            return m.group(1)
    return None


def _odata_next(payload: Any) -> Optional[str]:
    if not isinstance(payload, dict):
        return None
    for k in ("@odata.nextLink", "odata.nextLink", "__next"):
        if isinstance(payload.get(k), str):
            return payload[k]
    d = payload.get("d")
    if isinstance(d, dict) and isinstance(d.get("__next"), str):
        return d["__next"]
    return None


class _Fetcher:
    def __init__(self, client: httpx.AsyncClient, resolver: Resolver, origin_host: str, deadline: float, pin: bool = True):
        self.client = client
        self.resolver = resolver
        self.origin_host = origin_host
        self.deadline = deadline
        self.total_bytes = 0
        # Direct egress: connect to the IP that passed the public-address check (no DNS rebinding).
        # Through an egress proxy: connect by host name; the proxy resolves it and must refuse private networks.
        self.pin = pin

    async def send(self, method: str, url: str, headers: Dict[str, str], body: Optional[bytes] = None,
                   same_host: bool = True) -> httpx.Response:
        host, _, ip = check_url(url, self.resolver)
        if same_host and host != self.origin_host:
            raise ConnectorError("A paging link pointed to a different server, so it was not followed.")
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise ConnectorError("The API took too long to return all pages.")
        req_headers = {**headers, "Host": urlsplit(url).netloc.split("@")[-1]}
        target, ext = (_pinned(url, ip), {"sni_hostname": host}) if self.pin else (url, {})
        try:
            async with self.client.stream(
                method, target, headers=req_headers, content=body,
                timeout=min(REQUEST_TIMEOUT, remaining), extensions=ext,
            ) as resp:
                chunks = []
                size = 0
                async for chunk in resp.aiter_bytes():
                    size += len(chunk)
                    if size > MAX_RESPONSE_BYTES:
                        raise ConnectorError("One response was larger than 50 MB. Ask for fewer rows per page.")
                    chunks.append(chunk)
                self.total_bytes += size
                if self.total_bytes > MAX_TOTAL_BYTES:
                    raise ConnectorError("The API returned more than 200 MB in total. Narrow the request.")
                # The body above is already decompressed: drop the encoding headers so it isn't decoded twice.
                plain = [(k, v) for k, v in resp.headers.multi_items() if k.lower() not in ("content-encoding", "content-length", "transfer-encoding")]
                return httpx.Response(resp.status_code, headers=plain, content=b"".join(chunks), request=resp.request)
        except httpx.TimeoutException:
            raise ConnectorError("The API did not answer in time.")
        except httpx.HTTPError as e:
            raise ConnectorError(f"Could not reach the API ({type(e).__name__}).")


def _status_message(resp: httpx.Response) -> str:
    code = resp.status_code
    if code in (301, 302, 303, 307, 308):
        return f"The API redirected ({code}). Use the final address instead; redirects are not followed."
    if code == 401:
        return "The API rejected the credentials (401). Check the user name, password or token."
    if code == 403:
        return "The credentials work but lack permission for this data (403)."
    if code == 404:
        return "The address was not found on the server (404). Check the path."
    if code == 429:
        return "The API is rate limiting requests (429). Try again later or ask for fewer pages."
    return f"The API answered with an error ({code})."


def _decode(resp: httpx.Response, body_type: str) -> Any:
    ctype = resp.headers.get("content-type", "").lower()
    text = resp.text
    if "xml" in ctype or body_type == "xml" or text.lstrip().startswith("<"):
        return xml_to_obj(text)
    try:
        return json.loads(text)
    except ValueError:
        raise ConnectorError("The response is neither JSON nor XML.")


def redact(text: str, auth: Dict[str, Any]) -> str:
    """Remove any secret the user sent from text that will be shown or logged."""
    out = str(text or "")
    for k in SECRET_FIELDS:
        v = str((auth or {}).get(k) or "")
        if len(v) >= 4:
            out = out.replace(v, "***")
    return out


async def _get_token(fetcher: _Fetcher, auth_type: str, auth: Dict[str, Any]) -> Tuple[str, Optional[str]]:
    """Call the token endpoint; returns (access token, new refresh token if one was issued)."""
    token_url = str(auth.get("token_url") or "").strip()
    if not token_url:
        raise ConnectorError("Enter the token URL for this authentication method.")
    try:
        headers, body = token_request(auth_type, auth, token_url)
    except AuthConfigError as e:
        raise ConnectorError(str(e))
    resp = await fetcher.send("POST", token_url, headers, body, same_host=False)
    try:
        data = resp.json()
    except ValueError:
        data = {}
    if resp.status_code >= 300 or not isinstance(data, dict) or not data.get("access_token"):
        code = str(data.get("error") or "") if isinstance(data, dict) else ""
        desc = str(data.get("error_description") or "") if isinstance(data, dict) else ""
        detail = f": {code}{f' - {desc[:160]}' if desc else ''}" if code else ""
        if resp.status_code < 300 and not detail:
            raise ConnectorError("The token endpoint did not return an access_token.")
        raise ConnectorError(redact(f"Getting an access token failed ({resp.status_code}){detail}. Check the client ID, key or secret, and token URL.", auth))
    new_refresh = data.get("refresh_token")
    if auth_type != "oauth2_refresh_token" or not new_refresh or new_refresh == auth.get("refresh_token"):
        new_refresh = None
    return str(data["access_token"]), new_refresh


async def fetch_records(config: Dict[str, Any], resolver: Resolver = _default_resolver,
                        transport: Optional[httpx.AsyncBaseTransport] = None) -> Dict[str, Any]:
    """Fetch every page of an API endpoint and return {columns, rows, ...}."""
    url = str(config.get("url") or "").strip()
    method = str(config.get("method") or "GET").upper()
    if method not in ("GET", "POST"):
        raise ConnectorError("Only GET and POST requests are supported.")
    body_type = str(config.get("body_type") or "json")
    paging = str(config.get("paging") or "auto")
    if paging not in PAGING_TYPES:
        paging = "auto"
    max_rows = max(1, min(MAX_ROWS, int(config.get("max_rows") or MAX_ROWS)))
    page_size = max(1, min(10_000, int(config.get("page_size") or 500)))
    auth = config.get("auth") if isinstance(config.get("auth"), dict) else {}
    auth_type = str(auth.get("type") or "none")
    if auth_type not in AUTH_TYPES:
        raise ConnectorError("Unknown authentication type.")

    origin_host, _, _ = check_url(url, resolver)
    headers = {"Accept": "application/json, application/xml;q=0.9, */*;q=0.5", "User-Agent": "meldra-Connector/1.0"}
    headers.update(_clean_headers(config.get("headers")))

    body: Optional[bytes] = None
    raw_body = config.get("body")
    if method == "POST":
        if body_type == "graphql":
            variables = config.get("variables") if isinstance(config.get("variables"), dict) else {}
            body = json.dumps({"query": str(raw_body or ""), "variables": variables}).encode()
            headers.setdefault("Content-Type", "application/json")
        elif body_type == "xml":
            body = str(raw_body or "").encode()
            headers.setdefault("Content-Type", "text/xml; charset=utf-8")
        else:
            body = (raw_body if isinstance(raw_body, str) else json.dumps(raw_body or {})).encode()
            headers.setdefault("Content-Type", "application/json")
        if len(body) > 200_000:
            raise ConnectorError("The request body is too large.")

    deadline = time.monotonic() + TOTAL_TIMEOUT
    proxy = egress_proxy()
    client_args: Dict[str, Any] = {"transport": transport, "follow_redirects": False, "verify": ca_bundle(), "trust_env": False}
    if proxy and transport is None:
        client_args["proxy"] = proxy
    new_refresh_token: Optional[str] = None
    async with httpx.AsyncClient(**client_args) as client:
        fetcher = _Fetcher(client, resolver, origin_host, deadline, pin=not proxy)

        if auth_type == "basic":
            import base64
            cred = f"{auth.get('username') or ''}:{auth.get('password') or ''}".encode()
            headers["Authorization"] = "Basic " + base64.b64encode(cred).decode()
        elif auth_type == "bearer":
            headers["Authorization"] = f"Bearer {auth.get('token') or ''}"
        elif auth_type == "api_key":
            name = str(auth.get("key_name") or "x-api-key")
            if auth.get("key_in") == "query":
                url = _set_query(url, {name: str(auth.get("key_value") or "")})
            elif re.fullmatch(r"[A-Za-z0-9-]{1,64}", name) and name.lower() not in BLOCKED_HEADERS:
                headers[name] = str(auth.get("key_value") or "")
            else:
                raise ConnectorError("The API key header name is not valid.")
        elif auth_type in TOKEN_GRANTS:
            access, new_refresh_token = await _get_token(fetcher, auth_type, auth)
            headers["Authorization"] = f"Bearer {access}"

        records: List[Dict[str, Any]] = []
        records_path = str(config.get("records_path") or "").strip()
        used_path = records_path
        pages = 0
        next_url: Optional[str] = url
        offset = 0
        page_no = int(config.get("start_page") or 1)
        cursor: Optional[str] = None
        truncated = False
        seen_urls = set()
        mode = paging

        if mode == "offset":
            next_url = _set_query(url, {config.get("offset_param") or "offset": 0, config.get("limit_param") or "limit": page_size})
        elif mode == "page":
            next_url = _set_query(url, {config.get("page_param") or "page": page_no, config.get("limit_param") or "per_page": page_size})

        while next_url and pages < MAX_PAGES:
            if next_url in seen_urls:
                break
            seen_urls.add(next_url)
            resp = await fetcher.send(method, next_url, headers, body)
            pages += 1
            if resp.status_code >= 300:
                raise ConnectorError(_status_message(resp))
            payload = _decode(resp, body_type)
            if body_type == "graphql" and isinstance(payload, dict) and payload.get("errors") and not payload.get("data"):
                first = payload["errors"][0] if isinstance(payload["errors"], list) and payload["errors"] else {}
                raise ConnectorError(f"GraphQL error: {str(first.get('message') if isinstance(first, dict) else first)[:200]}")
            batch, found = find_records(payload, used_path)
            if pages == 1:
                used_path = found
            records.extend(batch)

            current = next_url
            next_url = None
            if mode in ("auto", "odata"):
                link = _odata_next(payload)
                if link:
                    next_url = urljoin(current, link)
                    mode = "odata"
                elif mode == "auto":
                    link = _parse_link_header(resp.headers.get("link", ""))
                    if link:
                        next_url = urljoin(current, link)
                        mode = "link_header"
                    else:
                        for key in ("nextRecordsUrl", "next", "next_page_url", "nextPage", "links.next", "paging.next"):
                            val = get_path(payload, key)
                            if isinstance(val, str) and val.strip():
                                next_url = urljoin(current, val)
                                break
            elif mode == "link_header":
                link = _parse_link_header(resp.headers.get("link", ""))
                next_url = urljoin(current, link) if link else None
            elif mode == "next_url":
                val = get_path(payload, str(config.get("next_path") or "next"))
                next_url = urljoin(current, val) if isinstance(val, str) and val.strip() else None
            elif mode == "offset":
                if len(batch) >= page_size:
                    offset += len(batch)
                    next_url = _set_query(current, {config.get("offset_param") or "offset": offset})
            elif mode == "page":
                if len(batch) >= page_size:
                    page_no += 1
                    next_url = _set_query(current, {config.get("page_param") or "page": page_no})
            elif mode == "last_id":
                # Stripe style: ask for records after the last one while has_more is true.
                more = get_path(payload, str(config.get("has_more_path") or "has_more"))
                last = batch[-1].get(str(config.get("cursor_path") or "id")) if batch else None
                if more and last not in (None, "", cursor):
                    cursor = str(last)
                    next_url = _set_query(current, {config.get("cursor_param") or "starting_after": cursor})
            elif mode == "cursor":
                val = get_path(payload, str(config.get("cursor_path") or "next_cursor"))
                if val not in (None, "", cursor):
                    cursor = str(val)
                    next_url = _set_query(current, {config.get("cursor_param") or "cursor": cursor})
            if len(records) >= max_rows:
                truncated = len(records) > max_rows or bool(next_url)
                records = records[:max_rows]
                next_url = None
        if next_url and pages >= MAX_PAGES:
            truncated = True

    columns, rows = to_table(records)
    return {
        "columns": columns,
        "rows": rows,
        "row_count": len(rows),
        "pages": pages,
        "truncated": truncated,
        "records_path": used_path,
        "paging": mode,
        # Some providers (e.g. Intuit) rotate refresh tokens; hand the new one back, never store it.
        "new_refresh_token": new_refresh_token,
    }


def public_presets() -> List[Dict[str, Any]]:
    return PRESETS


def safe_summary(config: Dict[str, Any]) -> str:
    """What may be logged about a request: the host only, never paths, queries or secrets."""
    try:
        return urlsplit(str(config.get("url") or "")).hostname or "?"
    except ValueError:
        return "?"
