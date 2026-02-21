from __future__ import annotations

import csv
import time
from dataclasses import dataclass
from typing import List
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright


@dataclass
class ProductRow:
    title: str
    price: str
    description: str
    product_url: str


def scrape_webscraper_ecommerce_static_csv(
    output_csv_path: str,
    max_pages: int,
    timeout_ms: int,
    start_url: str = "https://webscraper.io/test-sites/e-commerce/static",
) -> dict:
    if max_pages <= 0:
        raise ValueError("max_pages must be > 0")

    start = time.time()
    rows: List[ProductRow] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.set_default_timeout(timeout_ms)

        page.goto(start_url, wait_until="domcontentloaded")

        for _ in range(max_pages):
            items = page.locator("div.thumbnail")
            n = items.count()
            if n == 0:
                break

            for i in range(n):
                item = items.nth(i)
                title_el = item.locator("a.title")
                title = (title_el.inner_text() or "").strip()
                href = (title_el.get_attribute("href") or "").strip()
                product_url = urljoin(page.url, href)
                price = (item.locator("h4.price").inner_text() or "").strip()
                description = (item.locator("p.description").inner_text() or "").strip()

                rows.append(
                    ProductRow(
                        title=title,
                        price=price,
                        description=description,
                        product_url=product_url,
                    )
                )

            next_link = page.locator("a[rel='next']")
            if next_link.count() == 0:
                break
            next_link.first.click()
            page.wait_for_load_state("domcontentloaded")

        context.close()
        browser.close()

    with open(output_csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["title", "price", "description", "product_url"])
        for r in rows:
            w.writerow([r.title, r.price, r.description, r.product_url])

    end = time.time()
    return {
        "source": "webscraper.io",
        "start_url": start_url,
        "pages_requested": max_pages,
        "rows": len(rows),
        "duration_ms": int((end - start) * 1000),
    }
