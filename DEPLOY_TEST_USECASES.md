# Use Cases to Test After Deploy (Vercel + Railway)

After your latest changes are deployed, test these **6 use cases** on your live app.  
Use your **Vercel URL** (e.g. `https://...vercel.app`) and **log in** first.

---

## Use case 1: Fill missing – only blanks, not "N/A"

**Where:** Dashboard → **Smart Cleaning Tools** → ML-powered → **Fill missing**

**Steps:**
1. Upload a CSV with a numeric column that has:
   - some **empty cells** (or `null`),
   - and some cells with **"N/A"** (or similar text).
2. **Column (fill):** select that column.  
3. **Strategy:** Median (or Mean).  
4. Click **Fill missing**.

**Pass if:**
- Empty cells are filled with the median (or mean).
- **"N/A"** (and any other non-empty text) **stays as-is** and is **not** replaced.

---

## Use case 2: Remove duplicates + Trim

**Where:** Dashboard → **Smart Cleaning Tools**

**Steps:**
1. Upload a CSV with a few **exact duplicate rows** and some cells with **extra spaces**.
2. Click **Remove Dupes**.
3. Click **Trim Space**.

**Pass if:**
- Row count goes down after Remove Dupes.
- Extra leading/trailing spaces in cells are gone after Trim Space.
- A green badge shows messages like “Removed X duplicate rows” and “Trimmed whitespace”.

---

## Use case 3: Remove outliers (numeric column)

**Where:** Dashboard → **Smart Cleaning Tools** → ML-powered

**Steps:**
1. Upload a CSV with a **numeric column** that has a few very high or very low values (e.g. 1, 2, 3, 4, 5, 1000).
2. **Column (outliers):** select that column.
3. Click **Remove outliers**.

**Pass if:**
- The extreme value(s) are removed (e.g. 1000 is gone).
- Row count decreases; badge shows “Removed X outliers from &lt;column&gt;”.

---

## Use case 4: Agentic AI – Clean (dedupe, trim, fill missing)

**Where:** **AI Assistant** (or **Agentic AI**) → `/AgenticAI`

**Steps:**
1. Upload a CSV with duplicates, some blanks, and maybe extra spaces.
2. In the task box, type:  
   **"Clean the data: remove duplicates, fix missing values, standardize formats"**
3. Click **Deploy AI Agent**.

**Pass if:**
- The plan includes a **clean** step.
- The result text mentions: **Removed X duplicates**, **Trimmed whitespace**, and **Filled missing in &lt;column&gt; with median** (or mode).
- The table **updates**: fewer rows, blanks filled (only where they were truly empty), spaces trimmed.

---

## Use case 5: Agentic AI – Transform (new column from text)

**Where:** **AI Assistant** → `/AgenticAI`

**Steps:**
1. Upload a CSV with columns like **Revenue** and **Cost** (or **Sales** and **Expenses**).
2. Task:  
   **"Add a Profit column as Revenue minus Cost"**  
   (adjust names if your columns are different)
3. Click **Deploy AI Agent**.

**Pass if:**
- The plan includes a **transform** step.
- Result says something like: **Created column "Profit" = Revenue subtract Cost. Rows: N**.
- A new **Profit** column appears with values = Revenue − Cost.

**Note:** Needs **backend (Railway) + OpenAI** and **login**. If you see “Transform failed” or “Cannot connect”, check `VITE_API_URL` in Vercel and that Railway is up.

---

## Use case 6: Data Transform – Create with AI

**Where:** Dashboard → **Data Transform** → **Create with AI**

**Steps:**
1. Load data with e.g. **Revenue** and **Cost** (or **First** and **Last** for text).
2. In the text box, type:  
   **"Profit as Revenue minus Cost"**  
   or **"FullName as First plus Last"**
3. Click **Generate**.

**Pass if:**
- A new column is added (**Profit** or **FullName**).
- Values match the formula (e.g. Profit = Revenue − Cost, or FullName = First + " " + Last).

**If it fails:**
- “AI chose columns that don't exist” → use **exact** column names from your file.
- “Column already exists” → choose a different new column name in the instruction.
- Connection/transform error → ensure backend is running and `VITE_API_URL` points to it; you are logged in.

---

## Quick reference

| # | Use case              | Where                    | What to verify |
|---|------------------------|--------------------------|----------------|
| 1 | Fill missing           | Dashboard → Cleaning     | Only blanks filled; "N/A" unchanged |
| 2 | Remove dupes + Trim    | Dashboard → Cleaning     | Fewer rows; no extra spaces |
| 3 | Remove outliers        | Dashboard → Cleaning     | Extreme values removed |
| 4 | Agentic clean          | /AgenticAI               | Dedupe + trim + fill in result and table |
| 5 | Agentic transform      | /AgenticAI               | New column (e.g. Profit) from natural language |
| 6 | Create with AI         | Dashboard → Transform    | New column from instruction |

---

## If something fails

- **Fill missing changes "N/A"** → Bug: only null/`''` should be filled. Report it.
- **Agentic/Transform: “Cannot connect” or 401** → Check `VITE_API_URL` in Vercel (must be your Railway backend URL) and that you’re logged in.
- **“AI chose columns that don't exist”** → Use the **exact** column names from your uploaded file in the task or instruction.
