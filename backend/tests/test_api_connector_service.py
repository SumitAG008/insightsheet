import asyncio
import json

import httpx
import pytest

from app.services.api_connector_service import (
    ConnectorError,
    check_url,
    fetch_records,
    find_records,
    to_table,
    xml_to_obj,
)

PUBLIC = lambda host, port: ["93.184.216.34"]  # noqa: E731


def run(coro):
    return asyncio.run(coro)


def test_rejects_non_https_and_private_hosts():
    with pytest.raises(ConnectorError, match="https"):
        check_url("http://api.example.com/x", PUBLIC)
    for ip in ["127.0.0.1", "10.0.0.5", "169.254.169.254", "192.168.1.1", "::1", "fd00::1", "::ffff:127.0.0.1"]:
        with pytest.raises(ConnectorError, match="private"):
            check_url("https://internal.example.com/x", lambda h, p, ip=ip: [ip])
    # One private address among public ones is enough to refuse.
    with pytest.raises(ConnectorError, match="private"):
        check_url("https://mixed.example.com/x", lambda h, p: ["93.184.216.34", "10.1.1.1"])
    with pytest.raises(ConnectorError, match="placeholders"):
        check_url("https://api{dc}.successfactors.com/odata", PUBLIC)
    with pytest.raises(ConnectorError, match="credentials"):
        check_url("https://user:pw@api.example.com/x", PUBLIC)
    assert check_url("https://api.example.com/x", PUBLIC) == ("api.example.com", 443, "93.184.216.34")


def test_follows_odata_v2_paging_and_converts_dates():
    pages = {
        "/odata/v2/EmpJob": {"d": {"results": [{"__metadata": {"uri": "x"}, "userId": "E1", "department": "Sales", "startDate": "/Date(1704067200000)/"}],
                                   "__next": "https://api.example.com/odata/v2/EmpJob?$skiptoken=2"}},
    }
    seen = []

    def handler(request: httpx.Request):
        seen.append((request.headers["host"], str(request.url), request.headers.get("authorization")))
        if "skiptoken" in str(request.url):
            return httpx.Response(200, json={"d": {"results": [{"userId": "E2", "department": "HR", "startDate": "/Date(1706745600000)/"}]}})
        return httpx.Response(200, json=pages["/odata/v2/EmpJob"])

    out = run(fetch_records(
        {"url": "https://api.example.com/odata/v2/EmpJob", "auth": {"type": "basic", "username": "u@co", "password": "p"}, "paging": "auto"},
        resolver=PUBLIC, transport=httpx.MockTransport(handler),
    ))
    assert out["row_count"] == 2
    assert out["pages"] == 2
    assert out["records_path"] == "d.results"
    assert out["columns"] == ["userId", "department", "startDate"]
    assert out["rows"][0]["startDate"] == "2024-01-01"
    # Pinned to the checked IP, with the real host name kept for TLS and routing.
    assert all(h == "api.example.com" and "93.184.216.34" in u and a.startswith("Basic ") for h, u, a in seen)


def test_never_follows_paging_links_to_another_host():
    def handler(request):
        return httpx.Response(200, json={"value": [{"id": 1}], "@odata.nextLink": "https://evil.example.net/steal"})

    with pytest.raises(ConnectorError, match="different server"):
        run(fetch_records({"url": "https://graph.example.com/v1.0/users", "auth": {"type": "bearer", "token": "t"}},
                          resolver=PUBLIC, transport=httpx.MockTransport(handler)))


def test_redirects_are_not_followed():
    def handler(request):
        return httpx.Response(302, headers={"location": "https://127.0.0.1/"})

    with pytest.raises(ConnectorError, match="redirected"):
        run(fetch_records({"url": "https://api.example.com/x"}, resolver=PUBLIC, transport=httpx.MockTransport(handler)))


def test_offset_paging_stops_on_short_page_and_caps_rows():
    data = [{"id": i, "amount": i * 10} for i in range(25)]

    def handler(request):
        off = int(request.url.params.get("offset", 0))
        lim = int(request.url.params.get("limit", 10))
        return httpx.Response(200, json={"items": data[off:off + lim]})

    out = run(fetch_records({"url": "https://api.example.com/x", "paging": "offset", "page_size": 10},
                            resolver=PUBLIC, transport=httpx.MockTransport(handler)))
    assert out["row_count"] == 25 and out["pages"] == 3 and not out["truncated"]

    capped = run(fetch_records({"url": "https://api.example.com/x", "paging": "offset", "page_size": 10, "max_rows": 15},
                               resolver=PUBLIC, transport=httpx.MockTransport(handler)))
    assert capped["row_count"] == 15 and capped["truncated"]


def test_oauth_client_credentials_then_bearer():
    calls = []

    def handler(request):
        calls.append(request.url.path)
        if request.url.path.endswith("/token"):
            assert b"grant_type=client_credentials" in request.content
            return httpx.Response(200, json={"access_token": "abc"})
        assert request.headers["authorization"] == "Bearer abc"
        return httpx.Response(200, json={"value": [{"id": "u1", "department": "Sales"}]})

    out = run(fetch_records({
        "url": "https://graph.example.com/v1.0/users",
        "auth": {"type": "oauth2_client_credentials", "token_url": "https://login.example.com/t/oauth2/v2.0/token", "client_id": "c", "client_secret": "s", "scope": "x/.default"},
    }, resolver=PUBLIC, transport=httpx.MockTransport(handler)))
    assert calls[0].endswith("/token") and out["rows"] == [{"id": "u1", "department": "Sales"}]


def test_graphql_and_errors():
    def handler(request):
        body = json.loads(request.content)
        if "bad" in body["query"]:
            return httpx.Response(200, json={"errors": [{"message": "Cannot query field bad"}]})
        return httpx.Response(200, json={"data": {"employees": {"nodes": [{"id": 1, "dept": {"name": "Ops"}}]}}})

    t = httpx.MockTransport(handler)
    out = run(fetch_records({"url": "https://api.example.com/graphql", "method": "POST", "body_type": "graphql", "body": "{ employees { nodes { id } } }"}, resolver=PUBLIC, transport=t))
    assert out["rows"] == [{"id": 1, "dept.name": "Ops"}]
    with pytest.raises(ConnectorError, match="Cannot query field"):
        run(fetch_records({"url": "https://api.example.com/graphql", "method": "POST", "body_type": "graphql", "body": "{ bad }"}, resolver=PUBLIC, transport=t))


def test_status_errors_are_explained():
    t = httpx.MockTransport(lambda r: httpx.Response(401, json={}))
    with pytest.raises(ConnectorError, match="rejected the credentials"):
        run(fetch_records({"url": "https://api.example.com/x"}, resolver=PUBLIC, transport=t))


def test_soap_xml_to_records():
    xml = """<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wd="urn:com.workday/bsvc">
      <soap:Body><wd:Get_Workers_Response><wd:Response_Data>
        <wd:Worker><wd:ID>E1</wd:ID><wd:Dept>Sales</wd:Dept></wd:Worker>
        <wd:Worker><wd:ID>E2</wd:ID><wd:Dept>HR</wd:Dept></wd:Worker>
      </wd:Response_Data></wd:Get_Workers_Response></soap:Body></soap:Envelope>"""
    records, path = find_records(xml_to_obj(xml))
    assert path == "Envelope.Body.Get_Workers_Response.Response_Data.Worker"
    assert to_table(records) == (["ID", "Dept"], [{"ID": "E1", "Dept": "Sales"}, {"ID": "E2", "Dept": "HR"}])
    with pytest.raises(ConnectorError, match="DOCTYPE"):
        xml_to_obj('<!DOCTYPE x [<!ENTITY a "b">]><x>&a;</x>')


def test_finds_records_and_flattens():
    payload = {"meta": {"count": 2}, "data": [{"id": 1, "tags": ["a", "b"], "owner": {"name": "Ann", "team": {"name": "Ops"}}}, {"id": 2}]}
    records, path = find_records(payload)
    assert path == "data"
    cols, rows = to_table(records)
    assert cols == ["id", "tags", "owner.name", "owner.team.name"]
    assert rows[0]["tags"] == "a, b"
    with pytest.raises(ConnectorError, match="Nothing was found"):
        find_records(payload, "missing.path")
