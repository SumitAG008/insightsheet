# Connector authentication: end-to-end test

Drives the real Unified Reporting UI against the real backend. Only the external
systems are simulated (SuccessFactors, Microsoft Entra ID / Graph, Intuit), and
they verify signatures cryptographically.

```bash
# 1. backend (development mode so localhost is an allowed origin), logs go to .out/backend.log
mkdir -p e2e/connector-auth/.out
ENVIRONMENT=development python3 e2e/connector-auth/live_backend.py > e2e/connector-auth/.out/backend.log 2>&1 &
# 2. frontend
VITE_API_URL=http://localhost:8001 npx vite --port 5173 &
# 3. the test (needs the playwright package; set CHROMIUM_PATH to use a preinstalled browser)
node e2e/connector-auth/live.mjs
# with a global playwright install: PLAYWRIGHT_MODULE=$(npm root -g)/playwright/index.mjs node e2e/connector-auth/live.mjs
```

It checks, among other things:
- SAML 2.0 bearer (SuccessFactors) is accepted, and a wrong company ID is rejected with a clear message.
- Certificate-based client credentials (Graph) are accepted.
- A rotated refresh token (QuickBooks) is handed back to the user.
- A bad private key is caught before anything is sent.
- Refresh keeps the settings but not the key.
- No key, secret or token reaches browser storage or the backend log.
