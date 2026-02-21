from __future__ import annotations

import csv
import time
from dataclasses import dataclass
from typing import List, Optional

from playwright.sync_api import sync_playwright


@dataclass
class BookRow:
    title: str
    price_gbp: str
    availability: str
    rating: str
    product_url: str


def scrape_books_to_scrape_csv(
    output_csv_path: str,
    max_pages: int,
    timeout_ms: int,
) -> dict:
    if max_pages <= 0:
        raise ValueError("max_pages must be > 0")

    start = time.time()
    rows: List[BookRow] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.set_default_timeout(timeout_ms)

        for page_num in range(1, max_pages + 1):
            url = f"https://books.toscrape.com/catalogue/page-{page_num}.html"
            page.goto(url, wait_until="domcontentloaded")

            pods = page.locator("article.product_pod")
            n = pods.count()
            if n == 0:
                break

            for i in range(n):
                pod = pods.nth(i)
                title = (pod.locator("h3 a").get_attribute("title") or "").strip()
                href = pod.locator("h3 a").get_attribute("href") or ""
                product_url = "https://books.toscrape.com/catalogue/" + href.replace("../", "")
                price = (pod.locator("p.price_color").inner_text() or "").strip()
                availability = (pod.locator("p.instock.availability").inner_text() or "").strip()

                rating_class = (pod.locator("p.star-rating").get_attribute("class") or "").strip()
                rating = ""
                for part in rating_class.split():
                    if part.lower() != "star-rating":
                        rating = part
                        break

                rows.append(
                    BookRow(
                        title=title,
                        price_gbp=price,
                        availability=" ".join(availability.split()),
                        rating=rating,
                        product_url=product_url,
                    )
                )

        context.close()
        browser.close()

    with open(output_csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["title", "price_gbp", "availability", "rating", "product_url"])
        for r in rows:
            w.writerow([r.title, r.price_gbp, r.availability, r.rating, r.product_url])

    end = time.time()
    return {
        "source": "books.toscrape.com",
        "pages_requested": max_pages,
        "rows": len(rows),
        "duration_ms": int((end - start) * 1000),
    }
