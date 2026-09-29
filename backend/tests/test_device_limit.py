"""A subscription can be signed in on at most two devices at once."""
import os
import secrets
import tempfile

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
from fastapi.testclient import TestClient  # noqa: E402

from app.database import LoginOtpChallenge, SessionLocal, User  # noqa: E402
from app.utils.auth import create_access_token, get_password_hash  # noqa: E402

main.init_db()
PASSWORD = f"pw-{secrets.token_hex(6)}"


@pytest.fixture()
def account(monkeypatch):
    async def no_email(*args, **kwargs):
        return True

    monkeypatch.setattr(main, "send_login_otp_email", no_email)
    monkeypatch.setattr(main, "_resolve_geolocation", lambda ip: "London, United Kingdom")
    email = f"devices-{secrets.token_hex(4)}@example.com"
    db = SessionLocal()
    try:
        db.add(User(email=email, full_name="Device Test", hashed_password=get_password_hash(PASSWORD), is_verified=True))
        db.commit()
    finally:
        db.close()
    return email


def _sign_in(client, email, device_id, sign_out=None, agent="Mozilla/5.0 (Windows NT 10.0) Chrome/120.0"):
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD}, headers={"user-agent": agent})
    assert r.status_code == 200, r.text
    challenge = r.json()["challenge_id"]
    db = SessionLocal()
    try:  # the code is emailed; set a known one for the test
        ch = db.query(LoginOtpChallenge).filter(LoginOtpChallenge.challenge_id == challenge).one()
        ch.otp_hash = main._hash_login_otp("123456")
        db.commit()
    finally:
        db.close()
    body = {"challenge_id": challenge, "otp": "123456", "device_id": device_id}
    if sign_out:
        body["sign_out_session_ids"] = sign_out
    return client.post("/api/auth/mfa/verify", json=body, headers={"user-agent": agent})


def _me(client, token):
    return client.get("/api/auth/devices", headers={"Authorization": f"Bearer {token}"})


def test_third_device_is_refused_until_one_is_signed_out(account):
    c = TestClient(main.app)
    a = _sign_in(c, account, "device-a").json()["access_token"]
    b = _sign_in(c, account, "device-b").json()["access_token"]

    third = _sign_in(c, account, "device-c")
    assert third.status_code == 409
    detail = third.json()["detail"]
    assert detail["code"] == "device_limit" and detail["limit"] == 2 and len(detail["devices"]) == 2
    assert all(d["location"] == "London, United Kingdom" for d in detail["devices"])
    assert all(d["device"] == "Chrome on Windows" for d in detail["devices"])

    # Choose device A to sign out, and continue on device C.
    devices = _me(c, a).json()["devices"]
    a_id = next(d["id"] for d in devices if d["current"])
    c_token = _sign_in(c, account, "device-c", sign_out=[a_id])
    assert c_token.status_code == 200, c_token.text

    assert _me(c, a).status_code == 401  # signed out immediately
    assert _me(c, b).status_code == 200
    assert len(_me(c, c_token.json()["access_token"]).json()["devices"]) == 2


def test_signing_in_again_on_the_same_device_uses_no_extra_slot(account):
    c = TestClient(main.app)
    for _ in range(3):
        assert _sign_in(c, account, "same-laptop").status_code == 200
    token = _sign_in(c, account, "other-laptop").json()["access_token"]
    assert len(_me(c, token).json()["devices"]) == 2


def test_logout_frees_the_slot_and_ends_the_token(account):
    c = TestClient(main.app)
    a = _sign_in(c, account, "device-a").json()["access_token"]
    _sign_in(c, account, "device-b")
    assert c.post("/api/auth/logout", headers={"Authorization": f"Bearer {a}"}).status_code == 200
    assert _me(c, a).status_code == 401
    assert _sign_in(c, account, "device-c").status_code == 200


def test_sign_out_another_device_from_the_list(account):
    c = TestClient(main.app)
    a = _sign_in(c, account, "device-a").json()["access_token"]
    b = _sign_in(c, account, "device-b").json()["access_token"]
    other = next(d["id"] for d in _me(c, a).json()["devices"] if not d["current"])
    assert c.delete(f"/api/auth/devices/{other}", headers={"Authorization": f"Bearer {a}"}).status_code == 200
    assert _me(c, b).status_code == 401
    assert c.delete("/api/auth/devices/not-mine", headers={"Authorization": f"Bearer {a}"}).status_code == 404


def test_token_without_a_device_session_is_rejected(account):
    c = TestClient(main.app)
    legacy = create_access_token({"sub": account, "role": "user"})
    assert _me(c, legacy).status_code == 401


def test_wrong_code_still_counts_and_limit_does_not_consume_the_code(account):
    c = TestClient(main.app)
    _sign_in(c, account, "device-a")
    _sign_in(c, account, "device-b")
    r = c.post("/api/auth/login", json={"email": account, "password": PASSWORD})
    challenge = r.json()["challenge_id"]
    db = SessionLocal()
    try:
        ch = db.query(LoginOtpChallenge).filter(LoginOtpChallenge.challenge_id == challenge).one()
        ch.otp_hash = main._hash_login_otp("654321")
        db.commit()
    finally:
        db.close()
    assert c.post("/api/auth/mfa/verify", json={"challenge_id": challenge, "otp": "000000", "device_id": "x"}).status_code == 401
    limited = c.post("/api/auth/mfa/verify", json={"challenge_id": challenge, "otp": "654321", "device_id": "x"})
    assert limited.status_code == 409
    first = limited.json()["detail"]["devices"][0]["id"]
    # Same code works once the user picks a device to sign out.
    ok = c.post("/api/auth/mfa/verify", json={"challenge_id": challenge, "otp": "654321", "device_id": "x", "sign_out_session_ids": [first]})
    assert ok.status_code == 200
