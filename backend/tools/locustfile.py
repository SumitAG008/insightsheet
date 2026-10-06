"""
Load test: many simulated users browsing meldra and converting files at the same time.

Run it against a separate copy of the backend (a Railway "staging" environment with its own
database), never against the live site while customers use it: it creates real load and real rows.

    pip install locust
    export MELDRA_TOKEN=...          # a sign-in token for a test account (see docs/LOAD_TESTING.md)
    cd backend/tools
    locust -f locustfile.py --host https://your-staging-backend.up.railway.app
    # then open http://localhost:8089, choose users (e.g. 20) and spawn rate (e.g. 2/s)

    # or without the web page, for 5 minutes with 20 users, saving CSV results:
    locust -f locustfile.py --host https://... --headless -u 20 -r 2 -t 5m --csv results

Each simulated user mostly browses (cheap requests) and now and then runs a file tool, in roughly
the mix a real user would. Watch the failure rate, the 95th percentile response time, and the
server's CPU and memory graphs in Railway while it runs.
"""
import json
import os

from locust import HttpUser, between, task

from benchmark_costs import make_pdf, make_workbook, make_zip

TOKEN = os.environ.get("MELDRA_TOKEN", "")
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

# Sample files are built once per load-test process (no customer data).
SMALL_BOOK = make_workbook(1_000)
MEDIUM_BOOK = make_workbook(20_000)
ZIP = make_zip(200)
PDF = make_pdf(10)
ZIP_OPTIONS = json.dumps({"allowed_chars": "a-zA-Z0-9-_", "replace_char": "-"})


class MeldraUser(HttpUser):
    wait_time = between(2, 8)  # seconds a person spends between actions

    def on_start(self):
        if not TOKEN:
            raise RuntimeError("Set MELDRA_TOKEN to a sign-in token for a test account")
        self.client.headers["Authorization"] = f"Bearer {TOKEN}"

    # -------- browsing (most requests)
    @task(10)
    def open_dashboard(self):
        self.client.get("/api/auth/me", name="auth/me")
        self.client.get("/api/subscriptions/me", name="subscriptions/me")
        self.client.get("/api/assist/suggestions", name="assist/suggestions")

    @task(3)
    def search_tools(self):
        self.client.get("/api/assist/search", params={"q": "excel to ppt"}, name="assist/search")

    # -------- file tools
    @task(3)
    def excel_to_ppt_small(self):
        self.client.post("/api/files/excel-to-ppt", files={"file": ("small.xlsx", SMALL_BOOK, XLSX)}, name="excel-to-ppt (1k rows)")

    @task(1)
    def excel_to_ppt_medium(self):
        self.client.post("/api/files/excel-to-ppt", files={"file": ("medium.xlsx", MEDIUM_BOOK, XLSX)}, name="excel-to-ppt (20k rows)")

    @task(2)
    def analyze(self):
        self.client.post("/api/files/analyze", files={"file": ("small.xlsx", SMALL_BOOK, XLSX)}, name="analyze")

    @task(2)
    def filename_cleaner(self):
        self.client.post("/api/files/process-zip", files={"file": ("batch.zip", ZIP, "application/zip")}, data={"options": ZIP_OPTIONS}, name="process-zip (200 files)")

    @task(1)
    def pdf_merge(self):
        self.client.post("/api/pdf/merge", files=[("files", ("a.pdf", PDF, "application/pdf")), ("files", ("b.pdf", PDF, "application/pdf"))], name="pdf/merge")
