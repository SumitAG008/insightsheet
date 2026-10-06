---
title: Collect data from websites
summary: Run a web data job on a public web page and download the results as a CSV file. Available on paid plans.
category: Data and integrations
order: 3
updated: 2026-10-06
---

The **Web Data Connector** opens a public web page in a browser on meldra's servers, reads the items you describe and gives you the results as a CSV file.

## Before you start

- Web data is included in paid plans and organisation licences. On the Free plan, the page shows "Web data is included in paid plans and organisation licences." with a **See plans** link. See [Plans and limits](/help/plans-and-limits).
- You can run one web data job at a time.
- Each run counts as one conversion in your monthly **Conversions and file jobs** allowance. It is counted when the job starts.
- Only public websites can be used. Addresses on private networks and `localhost` are refused.
- Collect only data you are allowed to collect.

## Open the Web Data Connector

1. In the navigation bar at the top of the page, open **Data & Schema**.
2. Select **Web Data Connector**.

The page is titled **Web Automation (Playwright)**.

## Choose a connector

| **Connector** | What it reads |
|---|---|
| **BooksToScrape (preset)** | A public demonstration bookshop site. Useful to try the tool. |
| **WebScraper E‑Commerce (preset)** | A public demonstration shop. You can enter a different **Start URL (optional)**. |
| **Custom URL (advanced)** | Any public page you choose, using CSS selectors you provide. |

## Run a preset

1. Choose **BooksToScrape (preset)** or **WebScraper E‑Commerce (preset)**.
2. Enter **Max pages (required)**, from 1 to 200.
3. Enter **Timeout ms (required)**, from 5000 to 120000 milliseconds.
4. Select **Run**.

## Run a custom URL

1. Choose **Custom URL (advanced)**.
2. Enter the **URL (required)** of the page. It must start with `http://` or `https://`.
3. Enter the **Item selector (required)**. This is the CSS selector that matches each item on the page, for example `div.thumbnail`.
4. Enter **Max items (required)**, from 1 to 1000.
5. In **Fields JSON (required)**, list one column for each value you want. The key is the column name and the value is a CSS selector inside the item.
6. Enter **Timeout ms (required)** and select **Run**.

For example:

```
{
  "title": "a.title",
  "price": "h4.price",
  "product_url": "a.title@href"
}
```

A selector on its own reads the text of the element. Add `@` and an attribute name to read that attribute instead, for example `a.title@href` for a link address.

> **Note:** A custom URL job reads the one page at that address. **Max pages (required)** does not apply to it.

## Check the job and download the results

1. After you select **Run**, you see "Job started" and the **Job ID**.
2. Select **Refresh** to see the **Status**: queued, running, succeeded or failed.
3. When the status is succeeded, select **Download CSV** for the data, or **Download Report** for a JSON summary of the run.

If the job fails, the error appears under the status.

> **Important:** Results are kept on meldra's servers for a short time only. Download them as soon as the job succeeds. After that you see "Job expired" and need to run the job again.

## Troubleshooting

| Message | What to do |
|---|---|
| "Playwright web connectors are available on paid plans only" | Upgrade your plan. See [Plans and limits](/help/plans-and-limits). |
| "You already have a web data job running. Wait for it to finish, then start the next one." | Select **Refresh** until the current job has finished, then run the next one. |
| "You have used all … conversions for this month." | Wait until your allowance resets, or upgrade. |
| "URL host is not allowed" or "Localhost is not allowed" | Use a public website address. |
| "Fields JSON is invalid" or "Fields JSON must be a non-empty object" | Check the JSON format and add at least one field. |
| "Job expired" | Run the job again and download the results straight away. |

## Next steps

- [Usage and limits page](/help/usage-and-limits-page)
- [Plans and limits](/help/plans-and-limits)
