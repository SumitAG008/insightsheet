---
title: Clean up file names
summary: Rename every file and folder inside a ZIP in one go, with safe characters, shorter names and your own find-and-replace rules.
category: PDF and documents
order: 5
updated: 2026-10-06
---

This article shows how to use FileName Cleaner. It renames the files and folders inside a ZIP file and gives you a new ZIP. The contents of the files do not change.

To open it, select **File Conversion** in the top menu, then **FileName Cleaner**.

## Where your files are processed

FileName Cleaner works in your browser. Your ZIP is read and the new ZIP is built on your computer, so the files are not uploaded.

The largest ZIP you can use is your plan's largest file size. The page shows it at the top. See [Plans and limits](/help/plans-and-limits).

## Choose your settings first

Set up the rules on the **Settings** tab before you preview. The preview uses the settings at the moment you create it.

### Quick character sets

Select a preset under **Quick Character Sets** to fill in the allowed characters, the characters to remove and the replacement character.

| Preset | Keeps | Replaces other characters with |
|---|---|---|
| **Basic** (the default) | Letters, numbers, dots, underscores and dashes | `-` |
| **Basic Underscore** | Letters, numbers and underscores | `_` |
| **Basic Dash** | Letters, numbers and dashes | `-` |
| **Windows Safe** | Letters, numbers, dots, underscores, dashes, spaces and brackets | `-` |
| **URL Safe** | Letters, numbers and dashes | `-` |

### Fine-tune the rules

- **Allowed Characters**: every character not in this list is replaced.
- **Characters to remove**: these characters are always replaced.
- **Replacement Character**: one character used in place of the others. Leave it empty to delete characters instead.
- **Max Filename Length**: from 1 to 255 characters. Longer names are shortened, and the extension is kept.
- **International Language Support**: tick **Greek**, **Chinese**, **Russian**, **Arabic** or **Japanese** to delete those characters instead of replacing them. Accented letters, such as ä, é or ñ, always become plain letters, whether or not you tick **German**, **Italian** or **Spanish**.
- **Custom Replacement Rules**: enter text in **Find** and **Replace with**, then select the plus button. Remove a rule with the cross next to it.

### How a name is cleaned

meldra cleans each file and folder name in this order:

1. Accented letters become plain letters, and your language choices are applied.
2. Your custom replacement rules run.
3. Characters to remove, and any character that is not allowed, are replaced.
4. Repeated replacement characters become one, and any at the start or end are removed.
5. The name is shortened to the maximum length.

The file extension, such as `.pdf`, is kept as it is. Folder names are cleaned too, so the folder structure stays the same. If two names become the same, meldra adds `-2`, `-3` and so on, so no file overwrites another.

## Rename the files

1. Select the **File Upload** tab.
2. Select the upload area or **browse files**, and choose a `.zip` file.
3. Select **Preview Changes**.
4. Check the list. Each entry shows the old name crossed out and the new name below it. The heading shows how many files will be renamed.
5. Select **Process & Download ZIP**.

The new ZIP downloads automatically. It is named `processed_` followed by the cleaned ZIP name and the date and time.

For ZIPs with more than 100 files, the preview shows the first 100. All files are renamed when you process the ZIP.

> **Important:** Changing the settings after you select **Preview Changes** does not update the preview. To use new settings, reload the page, choose the ZIP again and preview again.

> **Note:** macOS system entries, such as the `__MACOSX` folder and `.DS_Store` files, are left out of the new ZIP.

## See what you processed

The **History** tab lists the ZIPs you processed during this visit, with the downloaded file name, the number of files and the time. The list is cleared when you leave the page.

## Next steps

- [Edit, fill, merge and split PDFs](/help/edit-pdfs)
- [Plans and limits](/help/plans-and-limits)
