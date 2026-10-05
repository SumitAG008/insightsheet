---
title: Reuse mappings across mock cycles
summary: Save your mappings, value translations and settings as a profile, and apply them to the next extract for mock loads and cutover.
category: Migration
order: 6
updated: 2026-10-05
---

A migration profile saves the decisions you made on one extract, so the next extract runs with the same decisions. This article shows how to save and load a profile, and a routine for mock loads and cutover.

## What a profile contains

| Saved | Not saved |
|---|---|
| Your column mappings for each tab, including columns you set to not used | Your extract or any employee data |
| What each tab holds | Today's "as of" date |
| Your value translations (the codes under **Value translations**) | |
| Your **Settings**, including the source system | |

A profile is a small JSON file named like `migration_profile_2026-10-05.json`.

## Save a profile

1. Finish **Map fields** and **Cleanse & validate** for the current extract.
2. Select **Save profile** at the top right of the Migration page.
3. Store the file with your project documents.

## Load a profile

### Before you upload the next extract

1. Select **Start over** if an old extract is still loaded.
2. Select **Load profile** and choose the profile file.
3. Meldra confirms: "Profile loaded: it will be applied to the extract you upload next."
4. Upload the new extract. Meldra reports how many column choices it applied, on how many tabs.

### On an extract that is already loaded

Select **Load profile** and choose the file. Meldra applies the column choices, value translations and settings straight away.

## How a profile is matched

- Tabs are matched by name, ignoring case. A tab called `Worker_Data` matches `Worker_Data` in the next extract, even if the file name changed.
- Columns are matched by name, ignoring case.
- Matched columns show **From profile** on **Map fields**.
- Columns the profile does not know keep their new automatic mapping. Check them.

> **Important:** Loading a profile replaces your current value translations and settings with the profile's. Save a profile first if you want to keep the current ones.

## A recommended cycle routine

| Cycle | What to do |
|---|---|
| Mock 1 | Upload the first extract. Fix the mapping, clear errors, set codes and settings. Load into a test instance. **Save profile**. |
| Mock 2 | **Load profile**, then upload a fresh extract. Check new columns, new values marked **needs a code**, and the reconciliation. Load into test again. **Save profile**. |
| Cutover | **Load profile**, then upload the production extract. Confirm there are no errors and all control totals match. Load into production in the order given. |

> **Tip:** Keep the extract layout the same between cycles. Renamed tabs or columns will not match the profile and fall back to automatic mapping.

## Troubleshooting

| Message | What to do |
|---|---|
| The profile could not be loaded: This file is not a Meldra migration profile. | Choose a file saved with **Save profile**. |
| Profile applied: 0 column choices on 0 of … tabs | The tab names in the new extract differ from the profile. Rename the tabs to match, or map again and save a new profile. |
