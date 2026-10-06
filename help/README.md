# meldra Insight Help Center: how it works

This folder holds the customer help articles for meldra Insight. Each Markdown file is one article. After a deploy, an article appears at `/help/<slug>`, where the slug is the file name without `.md`.

## Folder layout

| Folder | Category name (exact) |
|---|---|
| `getting-started/` | `Getting started` |
| `ai-assistant/` | `AI assistant` |
| `spreadsheets-and-analysis/` | `Spreadsheets and analysis` |
| `pdf-and-documents/` | `PDF and documents` |
| `unified-reporting/` | `Unified Reporting` |
| `migration/` | `Migration` |
| `data-and-integrations/` | `Data and integrations` |
| `account-and-billing/` | `Account and billing` |

Put each article in the folder that matches its `category`. A new category also needs an entry in `CATEGORIES` in `src/lib/help/articles.js`. To link an app page to its guide (the "How to use this tool" button), add it to `src/lib/help/pageGuides.js`. This README is not an article and has no frontmatter.

## Frontmatter

Every article starts with this block. Use exactly these keys, one per line, no quotes, no nested YAML.

```
---
title: Ask questions across your systems
summary: Ask in plain English and get a chart, a written answer and the sources behind every number.
category: Unified Reporting
order: 3
updated: 2026-10-05
---
```

| Key | Rule |
|---|---|
| `title` | Task-based, sentence case. Shown as the page heading. |
| `summary` | One sentence. Shown in lists and search results. |
| `category` | One of the category names above, spelled exactly. |
| `order` | Position inside the category: 1, 2, 3… No duplicates within a category. |
| `updated` | Date of the last real content change, as `YYYY-MM-DD`. Update it every time you change the article. |

## Slugs

- The slug is the file name: lower-case words joined by hyphens, for example `map-fields.md` → `/help/map-fields`.
- Slugs must be unique across all folders.
- Do not rename a slug once published. Other articles and customers link to it.

## Writing the body

- Do not add an H1. The title comes from the frontmatter.
- Start with one or two sentences saying what the reader will achieve.
- Use `##` sections. Use numbered lists for steps and tables where they help.
- Put UI labels in **bold**, exactly as they appear on screen (buttons, tabs, fields).
- End with `## Next steps` or `## Troubleshooting` where useful.
- British English, plain words, sentences under about 25 words. No emoji, no marketing language.

### Links

Link to another article with its slug:

```
[Map fields](/help/map-fields)
```

### Callouts

Use a blockquote that starts with one of these labels:

```
> **Tip:** A shortcut or good practice.
> **Note:** Useful context.
> **Important:** Something that can cause data loss or a failed load.
```

## Accuracy

Describe only what the product does today. Before writing or changing an article, read the source for that screen and copy the labels from the code. Do not mention features, connectors, limits or prices that are not in the code. Key sources:

- Unified Reporting: `src/pages/UnifiedReporting.jsx`, `src/components/unifiedReporting/`, `src/lib/unifiedReporting/`
- Migration: `src/pages/Migration.jsx`, `src/components/migration/`, `src/lib/migration/`
- Plans and limits: `backend/app/services/plan_limits.py`, `src/lib/prices.js`, `src/pages/Usage.jsx`
- Organisations: `src/pages/Organization.jsx`, `docs/ENTERPRISE_LICENSING.md`
- Privacy and security wording: `PUBLIC_PAGES` in `src/lib/seo.js`

When a screen changes, update the matching article and its `updated` date in the same pull request.

## Adding an article

1. Choose the category folder.
2. Create `<slug>.md` with the frontmatter above.
3. Set `order`, and renumber other articles in the category if needed.
4. Write the body following the rules above.
5. Link to it from related articles' `## Next steps`.
6. Deploy. The article appears at `/help/<slug>`.

## Editing an article

1. Make the change.
2. Set `updated` to today's date.
3. Check that every link still points to an existing slug.
