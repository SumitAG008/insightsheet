# How to Test New Changes After GitHub

Use this guide after pulling the latest code from GitHub to test the **fillMissing**, **AgenticAI (real clean + transform)**, and **DataTransform (Create with AI)** changes.

---

## 1. Get the Latest Code from GitHub

### If you already have the repo

```powershell
cd c:\Users\sumit\Documents\Insightlite
git pull origin main
```

### If you are cloning fresh

```powershell
git clone https://github.com/SumitAG008/insightsheet.git
cd insightsheet
```

---

## 2. Environment Setup

### Frontend

```powershell
# From project root (Insightlite / insightsheet)
npm install
```

### Backend (required for Agentic AI transform & Create with AI)

```powershell
cd backend
python -m venv venv

# Windows: activate venv
.\venv\Scripts\activate

# Install deps
pip install -r requirements.txt
```

### Environment variables

**Frontend** – create `.env` in the **project root** (if it doesn’t exist):

```env
VITE_API_URL=http://localhost:8001
```

- On **localhost**, the app will use `http://localhost:8001` if `VITE_API_URL` is not set.
- For **production**, `VITE_API_URL` must be set (e.g. in Vercel) to your backend URL.

**Backend** – in `backend/` create `.env` (copy from `.env.example` if available) with at least:

```env
OPENAI_API_KEY=sk-your-openai-key
DATABASE_URL=sqlite:///./insightsheet.db
JWT_SECRET_KEY=your-secret-key
```

(Adjust `DATABASE_URL` if you use PostgreSQL.)

---

## 3. Run the App

### Terminal 1 – Backend

```powershell
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

- API: http://localhost:8001  
- Docs: http://localhost:8001/docs  

### Terminal 2 – Frontend

```powershell
# From project root
npm run dev
```

- App: http://localhost:5173 (or the port Vite prints)

---

## 4. Login

1. Open http://localhost:5173 (or your Vite URL).
2. Go to **Login**, sign in (or register).
3. **Agentic AI** and **Create with AI** in DataTransform call the backend; they work only when logged in and when the backend is running.

---

## 5. What to Test

### A. Fill Missing (only null / undefined / `''`) – **CleaningTools**

**Where:** Dashboard → **Smart Cleaning Tools** (Fill missing).

1. Upload a CSV (or use data) that has:
   - Some `null` or blank cells.
   - Some cells with `"N/A"` or other non-numeric text.
2. In **ML-powered**:
   - **Column (fill):** choose a column with blanks and `"N/A"`.
   - **Strategy:** e.g. **Median** (for numbers) or **Mode** (for text).
   - Click **Fill missing**.

**Expected:**

- Only **null**, **undefined**, or **`''`** are filled.
- **`"N/A"`** and other non-empty strings stay **unchanged**.

---

### B. Agentic AI – **Real Clean** (`executeClean`)

**Where:** **AI Assistant** (or **Agentic AI**) at `/AgenticAI`.

1. Upload a CSV (e.g. with duplicates, blanks, messy whitespace).
2. In the task box, use e.g.:
   - *"Clean the data: remove duplicates, fix missing values, standardize formats"*
3. Click **Deploy AI Agent**.

**Expected:**

- Plan includes a **clean** step.
- Result text mentions: **Removed X duplicates**, **Trimmed whitespace**, and **Filled missing in &lt;column&gt; with median/mode**.
- Table updates: fewer rows if dupes were removed, blanks filled (only where value was null/`''`).

---

### C. Agentic AI – **Real Transform** (`executeTransform`)

**Where:** Same **Agentic AI** page.

1. Use data that has numeric columns, e.g. **Revenue**, **Cost**.
2. Task example:
   - *"Add a Profit column as Revenue minus Cost"*
3. Click **Deploy AI Agent**.

**Expected:**

- Plan includes a **transform** step.
- Result: **Created column "Profit" = Revenue subtract Cost. Rows: N**.
- A new **Profit** column appears in the table.

**Note:** Requires backend + OpenAI and login. If the backend is down or you’re logged out, the transform step can fail with a connection/auth error.

---

### D. DataTransform – **Create with AI**

**Where:** **Dashboard** → **Data Transform** → **Create with AI**.

1. Load data with columns like **Revenue**, **Cost** (or **First**, **Last** for text).
2. In **Create with AI**, type e.g.:
   - *"Profit as Revenue minus Cost"*
   - or *"FullName as First plus Last"*
3. Click **Generate**.

**Expected:**

- New column is added (e.g. **Profit** or **FullName**).
- Values match the described formula.

**If it fails:**

- **"AI chose columns that don't exist"** → use column names that exist in your data.
- **"Column already exists"** → pick a new target name.
- **Network / Transform failed** → ensure backend is running on the port used by `VITE_API_URL` and you are logged in.

---

### E. Remove duplicates / Trim / Outliers

**Where:** **Smart Cleaning Tools** on the Dashboard.

- **Remove Dupes** – duplicate rows are removed.
- **Trim Space** – leading/trailing spaces in string cells are removed.
- **Remove outliers** – choose a numeric column and run; rows with IQR-based outliers in that column are removed.

---

## 6. Quick Checklist

| Feature              | Where                 | Backend required? | What to check                                      |
|----------------------|------------------------|-------------------|----------------------------------------------------|
| Fill missing         | Dashboard → Cleaning   | No                | Only null/`''` filled; "N/A" etc. unchanged        |
| Remove dupes / Trim  | Dashboard → Cleaning   | No                | Fewer rows; trimmed strings                        |
| Remove outliers      | Dashboard → Cleaning   | No                | Outliers removed in selected numeric column        |
| Agentic clean        | /AgenticAI             | No (clean is local) | Duplicates, trim, fill missing in result text & table |
| Agentic transform    | /AgenticAI             | **Yes** (OpenAI)  | New column from NL, e.g. Profit = Revenue - Cost   |
| Create with AI       | Dashboard → Transform  | **Yes** (OpenAI)  | New column from NL instruction                     |

---

## 7. If the backend is not running

- **CleaningTools** (fill missing, dedupe, trim, outliers) – **works** (all in browser).
- **Agentic AI** – **clean** steps work; **transform** (and any LLM/API step) will fail with a connection error.
- **DataTransform → Create with AI** – will fail with a connection/transform error.

Set `VITE_API_URL` to your backend (e.g. `http://localhost:8001`) and ensure the backend is started as in **Section 3** when testing transforms and AI.

---

## 8. Deployed (Vercel + Railway) Testing

After pushing to GitHub, if Vercel and Railway deploy from `main`:

1. Wait for both to finish deploying.
2. In **Vercel** → **Settings → Environment Variables**:  
   - `VITE_API_URL` = your Railway backend URL (e.g. `https://insightsheet-production.up.railway.app`).
3. Open the Vercel app URL, log in, then run the same tests as in **Section 5** (CleaningTools, Agentic AI clean/transform, DataTransform Create with AI).

---

## 9. Useful URLs (local)

| What    | URL                         |
|---------|-----------------------------|
| App     | http://localhost:5173       |
| Login   | http://localhost:5173/Login |
| Dashboard | http://localhost:5173/dashboard |
| Agentic AI | http://localhost:5173/AgenticAI |
| Backend API | http://localhost:8001   |
| API docs | http://localhost:8001/docs |

---

## 10. Troubleshooting

- **"Cannot connect to backend"**  
  - Backend not running, or wrong port.  
  - `VITE_API_URL` (or default on localhost) must match where `uvicorn` runs (e.g. 8001).

- **"Unauthorized" / 401 on transform or LLM**  
  - Log in again; token may be expired or missing.

- **"AI chose columns that don't exist"**  
  - Use a task/instruction that references actual column names from your dataset.

- **Fill missing changes "N/A"**  
  - That would be a bug. With the new logic, only null/undefined/`''` should be filled; "N/A" must stay. If you see otherwise, report it.
