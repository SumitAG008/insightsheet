"""The records backup is encrypted: unreadable without the passphrase, identical after a round trip."""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
backup = pytest.importorskip("backup_records")


def test_round_trip_and_wrong_passphrase():
    data = json.dumps({"tables": {"users": [{"email": "someone@example.com"}]}}).encode()
    blob = backup.encrypt(data, "a-long-test-passphrase")
    assert b"someone@example.com" not in blob
    assert backup.decrypt(blob, "a-long-test-passphrase") == data
    with pytest.raises(SystemExit):
        backup.decrypt(blob, "another-passphrase-xx")
    tampered = blob[:-1] + bytes([blob[-1] ^ 1])
    with pytest.raises(SystemExit):
        backup.decrypt(tampered, "a-long-test-passphrase")


def test_backup_never_includes_file_derived_or_short_lived_tables():
    for table in ("file_processing_history", "invoice_extraction_jobs", "playwright_jobs", "user_activities",
                  "learning_signals", "login_otp_challenges"):
        assert table not in backup.TABLES
