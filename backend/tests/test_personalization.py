"""Search and suggestions learn from usage (tools opened, tools picked after a search), never file contents."""
import os
import secrets
import tempfile
from datetime import datetime, timedelta

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
from fastapi.testclient import TestClient  # noqa: E402

from app.database import SessionLocal, UserActivity  # noqa: E402
from app.services import personalization as p  # noqa: E402

main.init_db()


def _email(tag):
    return f"{tag}-{secrets.token_hex(4)}@example.com"


def _client(email):
    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": email}
    return TestClient(main.app)


@pytest.fixture(autouse=True)
def fresh_model():
    p.reset_model()
    yield
    p.reset_model()
    main.app.dependency_overrides.clear()


def _views(email, paths_and_times):
    db = SessionLocal()
    try:
        for path, at in paths_and_times:
            db.add(UserActivity(user_email=email, activity_type="page_view", page_name=path, created_date=at))
        db.commit()
    finally:
        db.close()


def _top(client, q):
    return [r["id"] for r in client.get("/api/assist/search", params={"q": q}).json()["results"]]


@pytest.mark.parametrize("q,expected", [
    ("pdf to word", "pdf_doc_converter"),
    ("rename files", "filename_cleaner"),
    ("bank rec", "reconciliation"),
    ("reconcilation", "reconciliation"),  # typo
    ("excel to powerpoint", "excel_to_ppt"),
    ("profit and loss", "pl_builder"),
    ("scanned invoices", "invoice_extractor"),
])
def test_search_understands_plain_words_and_typos(q, expected):
    assert _top(_client(_email("search")), q)[0] == expected


def test_search_learns_new_words_from_what_people_pick():
    word = f"brochure{secrets.token_hex(2)}"  # a word no tool mentions
    assert _top(_client(_email("learn")), word) == []
    for _ in range(3):  # three different people search it and choose Excel to PowerPoint
        c = _client(_email("learn"))
        assert c.post("/api/assist/search/choose", json={"q": word, "tool_id": "excel_to_ppt"}).status_code == 200
    p.reset_model()  # the next retrain picks the new signals up
    results = _client(_email("learn")).get("/api/assist/search", params={"q": word}).json()["results"]
    assert results[0]["id"] == "excel_to_ppt" and results[0]["reason"] == "Popular for this search"


def test_suggestions_follow_recent_use_and_routine():
    email = _email("routine")
    now = datetime.utcnow()
    # P&L every week on this weekday and hour; file cleaning once, long ago.
    _views(email, [("/PLBuilder", now - timedelta(days=7 * w, minutes=5)) for w in range(1, 5)]
           + [("/FilenameCleaner", now - timedelta(days=60))])
    s = _client(email).get("/api/assist/suggestions").json()["suggestions"]
    assert s[0]["id"] == "pl_builder"
    assert "usually use this on" in s[0]["reason"]
    ids = [x["id"] for x in s]
    assert ids.index("pl_builder") < ids.index("filename_cleaner")


def test_suggests_what_people_usually_do_next():
    now = datetime.utcnow()
    for _ in range(3):  # other people go from Excel to PowerPoint to the PDF editor
        other = _email("flow")
        _views(other, [("/FileToPPT", now - timedelta(hours=2)), ("/PDFEditor", now - timedelta(hours=2) + timedelta(minutes=5))])
    me = _email("flow")
    _views(me, [("/FileToPPT", now - timedelta(minutes=1))])
    s = _client(me).get("/api/assist/suggestions").json()["suggestions"]
    pdf = next(x for x in s if x["id"] == "pdf_editor")
    assert pdf["reason"] == "Often used after Excel to PowerPoint"


def test_new_user_gets_sensible_defaults_and_only_known_tools_are_recorded():
    c = _client(_email("new"))
    s = c.get("/api/assist/suggestions").json()["suggestions"]
    assert len(s) == 6 and all(x["path"].startswith("/") for x in s)
    assert c.post("/api/assist/search/choose", json={"q": "x", "tool_id": "not-a-tool"}).status_code == 400


def test_search_choice_stores_only_the_words_and_the_tool():
    email = _email("stored")
    c = _client(email)
    long_q = "merge " + "x" * 300
    assert c.post("/api/assist/search/choose", json={"q": long_q[:200], "tool_id": "pdf_editor"}).status_code == 200
    db = SessionLocal()
    try:
        row = db.query(UserActivity).filter(UserActivity.user_email == email).one()
        assert row.activity_type == "search_choice" and row.page_name == "/PDFEditor" and len(row.details) < 130
    finally:
        db.close()
