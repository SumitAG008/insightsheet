"""
Shared test setup. Most tests call the API through dependency overrides without a sign-in token,
so the server guard would count the whole suite as one anonymous visitor and rate-limit it.
It is off here by default; tests/test_server_guard.py switches it on.
"""
import os

os.environ.setdefault("SERVER_GUARD", "off")
