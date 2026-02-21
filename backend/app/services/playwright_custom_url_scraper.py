from __future__ import annotations

import csv
import time
from typing import Any, Dict, List, Tuple
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright


def _parse_field_spec(spec: str) -> Tuple[str, str | None]:
    s = (spec or "").strip()
    if not s:
        return "", None
    if "@" in s:
        sel, attr = s.rsplit("@", 1)
        return sel.strip(), (attr or "").strip() or None
    return s, None


def scrape_custom_url_list_csv(
    output_csv_path: str,
    url: str,
    item_selector: str,
    fields: Dict[str, str],
    max_items: int,
    timeout_ms: int,
) -> dict:
    if not url:
        raise ValueError("url is required")
    if not item_selector:
        raise ValueError("item_selector is required")
    if not isinstance(fields, dict) or not fields:
        raise ValueError("fields must be a non-empty object")
    if max_items <= 0:
        raise ValueError("max_items must be > 0")

    start = time.time()
    rows: List[Dict[str, Any]] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.set_default_timeout(timeout_ms)

        page.goto(url, wait_until="domcontentloaded")

        items = page.locator(item_selector)
        n = items.count()
        limit = min(n, max_items)

        for i in range(limit):
            item = items.nth(i)
            row: Dict[str, Any] = {}
            for col, spec in fields.items():
                sel, attr = _parse_field_spec(spec)
                if not sel:
                    row[col] = ""
                    continue

                loc = item.locator(sel)
                if loc.count() == 0:
                    row[col] = ""
                    continue

                if attr:
                    val = loc.first.get_attribute(attr) or ""
                    if attr.lower() in ("href", "src"):
                        val = urljoin(page.url, val)
                    row[col] = (val or "").strip()
                else:
                    row[col] = (loc.first.inner_text() or "").strip()

            rows.append(row)

        context.close()
        browser.close()

    fieldnames = list(fields.keys())
    with open(output_csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})

    end = time.time()
    return {
        "source": "custom_url",
        "url": url,
        "item_selector": item_selector,
        "max_items": max_items,
        "rows": len(rows),
        "duration_ms": int((end - start) * 1000),
        "columns": fieldnames,
    }
