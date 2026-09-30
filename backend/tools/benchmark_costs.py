"""
Measure what each file tool costs to run: time, CPU and peak memory per operation, on small, medium
and large inputs, and the resulting server cost per 1,000 operations. Use it to set plan prices and
limits.

Every run happens in a fresh Python process (so peak memory is that operation's own) and goes
through the real API endpoint, the same code path customers use. No network or OpenAI calls.

    cd backend
    python tools/benchmark_costs.py                     # all tools, all sizes, table on screen
    python tools/benchmark_costs.py --tools excel_to_ppt --sizes large
    python tools/benchmark_costs.py --out ../docs/benchmark-results.md

Prices default to Railway's usage pricing ($20 per vCPU per month, $10 per GB of RAM per month);
check https://railway.com/pricing and pass --vcpu-month / --gb-month if they change or for AWS.
"""
import argparse
import io
import json
import os
import resource
import subprocess
import sys
import tempfile
import time
import zipfile

SIZES = {
    # rows in the workbook, files in the ZIP, pages in the PDF
    "small": {"rows": 1_000, "files": 50, "pages": 5},
    "medium": {"rows": 20_000, "files": 1_000, "pages": 50},
    "large": {"rows": 100_000, "files": 5_000, "pages": 300},
}
TOOLS = ["excel_to_ppt", "analyze", "standardize", "filename_zip", "pdf_merge", "pdf_to_word"]
MONTH_SECONDS = 30 * 24 * 3600


# ------------------------------------------------------------------ sample files (no customer data)

def make_workbook(rows: int) -> bytes:
    import random

    import openpyxl
    from openpyxl.chart import BarChart, LineChart, Reference

    rnd = random.Random(7)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Transactions"
    ws.append(["Date", "Region", "Product", "Units", "Price", "Revenue", "Cost", "Margin"])
    for r in range(rows):
        units = rnd.randint(1, 50)
        price = round(rnd.uniform(5, 500), 2)
        cost = round(price * rnd.uniform(0.4, 0.8), 2)
        ws.append([f"2026-{r % 12 + 1:02d}-{r % 28 + 1:02d}", rnd.choice(["North", "South", "East", "West"]),
                   f"P{r % 40}", units, price, round(units * price, 2), round(units * cost, 2), round(units * (price - cost), 2)])
    summary = wb.create_sheet("Summary")
    summary.append(["Month", "Revenue", "Margin"])
    for m in range(1, 13):
        summary.append([f"2026-{m:02d}", rnd.randint(50_000, 150_000), rnd.randint(10_000, 60_000)])
    for i, cls in enumerate((BarChart, LineChart)):
        chart = cls()
        chart.title = ["Revenue by month", "Margin trend"][i]
        chart.add_data(Reference(summary, min_col=2 + i, min_row=1, max_row=13), titles_from_data=True)
        chart.set_categories(Reference(summary, min_col=1, min_row=2, max_row=13))
        summary.add_chart(chart, f"E{2 + i * 18}")
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def make_zip(files: int) -> bytes:
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for i in range(files):
            z.writestr(f"Folder {i % 20} Übersicht/Rechnung März {i} (final).pdf", b"%PDF-1.4 sample " * 64)
    return out.getvalue()


def make_pdf(pages: int) -> bytes:
    import fitz  # PyMuPDF

    doc = fitz.open()
    for p in range(pages):
        page = doc.new_page()
        page.insert_text((72, 72), f"Quarterly report, page {p + 1}", fontsize=16)
        for line in range(30):
            page.insert_text((72, 110 + line * 20), f"Line {line + 1}: revenue {1000 + p * 30 + line}, cost {500 + line}", fontsize=10)
    return doc.tobytes()


# ------------------------------------------------------------------ one measured run (child process)

def run_one(tool: str, size: str) -> dict:
    os.environ.setdefault("DATABASE_URL", f"sqlite:///{tempfile.gettempdir()}/meldra_benchmark.db")
    os.environ.setdefault("UPLOAD_LIMIT_MB", "off")
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from fastapi.testclient import TestClient

    from app import main
    from app.database import SessionLocal, User

    main.init_db()
    email = "benchmark@example.com"
    db = SessionLocal()
    if not db.query(User).filter(User.email == email).first():
        db.add(User(email=email, full_name="Benchmark", hashed_password="x", is_verified=True))
        db.commit()
    db.close()
    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": email}
    client = TestClient(main.app)

    spec = SIZES[size]
    xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if tool in ("excel_to_ppt", "analyze", "standardize"):
        body = make_workbook(spec["rows"])
        path = {"excel_to_ppt": "/api/files/excel-to-ppt", "analyze": "/api/files/analyze", "standardize": "/api/files/standardize"}[tool]
        request = lambda: client.post(path, files={"file": ("data.xlsx", body, xlsx)})  # noqa: E731
    elif tool == "filename_zip":
        body = make_zip(spec["files"])
        opts = json.dumps({"allowed_chars": "a-zA-Z0-9-_", "replace_char": "-", "languages": ["german"]})
        request = lambda: client.post("/api/files/process-zip", files={"file": ("batch.zip", body, "application/zip")}, data={"options": opts})  # noqa: E731
    elif tool == "pdf_merge":
        body = make_pdf(spec["pages"])
        request = lambda: client.post("/api/pdf/merge", files=[("files", ("a.pdf", body, "application/pdf")), ("files", ("b.pdf", body, "application/pdf"))])  # noqa: E731
    elif tool == "pdf_to_word":
        body = make_pdf(spec["pages"])
        request = lambda: client.post("/api/convert/pdf-to-doc", files={"file": ("a.pdf", body, "application/pdf")})  # noqa: E731
    else:
        raise SystemExit(f"unknown tool {tool}")

    base_rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
    cpu0 = time.process_time()
    t0 = time.perf_counter()
    response = request()
    wall = time.perf_counter() - t0
    cpu = time.process_time() - cpu0
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
    return {
        "tool": tool, "size": size, "status": response.status_code, "input_mb": round(len(body) / 1e6, 2),
        "output_mb": round(len(response.content) / 1e6, 2), "seconds": round(wall, 2), "cpu_seconds": round(cpu, 2),
        "peak_mb": round(peak), "extra_mb": round(max(0.0, peak - base_rss)),
    }


# ------------------------------------------------------------------ orchestration and cost

def cost_per_1000(r: dict, vcpu_month: float, gb_month: float) -> float:
    """CPU time used plus the extra memory held for the length of the operation, per 1,000 runs."""
    cpu = r["cpu_seconds"] * vcpu_month / MONTH_SECONDS
    ram = (r["extra_mb"] / 1024) * r["seconds"] * gb_month / MONTH_SECONDS
    return round((cpu + ram) * 1000, 4)


def main_cli():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tools", nargs="*", default=TOOLS, choices=TOOLS)
    ap.add_argument("--sizes", nargs="*", default=list(SIZES), choices=list(SIZES))
    ap.add_argument("--vcpu-month", type=float, default=20.0, help="price of one vCPU for a month (USD)")
    ap.add_argument("--gb-month", type=float, default=10.0, help="price of 1 GB of RAM for a month (USD)")
    ap.add_argument("--out", help="also write the results table (Markdown) to this file")
    ap.add_argument("--_child", nargs=2, metavar=("TOOL", "SIZE"), help=argparse.SUPPRESS)
    args = ap.parse_args()

    if args._child:
        print("RESULT " + json.dumps(run_one(*args._child)))
        return

    rows = []
    for tool in args.tools:
        for size in args.sizes:
            proc = subprocess.run([sys.executable, __file__, "--_child", tool, size], capture_output=True, text=True)
            line = next((l for l in proc.stdout.splitlines() if l.startswith("RESULT ")), None)
            if not line:
                err = (proc.stderr.strip().splitlines() or ["no output"])[-1]
                print(f"{tool:14} {size:7} FAILED: {err}", file=sys.stderr)
                continue
            r = json.loads(line[7:])
            r["usd_per_1000"] = cost_per_1000(r, args.vcpu_month, args.gb_month)
            rows.append(r)
            print(f"{tool:14} {size:7} {r['status']}  {r['input_mb']:>7} MB in  {r['seconds']:>7}s  "
                  f"cpu {r['cpu_seconds']:>7}s  peak {r['peak_mb']:>5} MB  ${r['usd_per_1000']}/1000", file=sys.stderr)

    idle_gb = 0.3  # one idle worker (measured ~285 MB)
    lines = [
        f"Prices: ${args.vcpu_month}/vCPU/month, ${args.gb_month}/GB RAM/month. "
        f"One idle server worker costs about ${idle_gb * args.gb_month:.2f}/month in RAM before any work.",
        "",
        "| Tool | Size | Input MB | Time (s) | CPU (s) | Peak memory (MB) | Extra memory (MB) | Server cost per 1,000 runs (USD) | HTTP |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in rows:
        lines.append(f"| {r['tool']} | {r['size']} | {r['input_mb']} | {r['seconds']} | {r['cpu_seconds']} | {r['peak_mb']} | {r['extra_mb']} | {r['usd_per_1000']} | {r['status']} |")
    table = "\n".join(lines)
    print(table)
    if args.out:
        with open(args.out, "w") as f:
            f.write(table + "\n")


if __name__ == "__main__":
    main_cli()
