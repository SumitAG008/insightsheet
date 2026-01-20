# AI & ML Expansion Roadmap for Insightlite

A practical guide to **what’s required** and **where to add** more AI, ML, and deep learning.

---

## 1. What You Already Have

### LLM / AI (OpenAI GPT-4)

| Feature | Location | What it does |
|--------|----------|--------------|
| **invoke_llm** | `backend/app/services/ai_service.py` | Generic LLM for analysis, JSON or text |
| **generate_formula** | `ai_service.py` | Natural language → Excel formula |
| **analyze_data** | `ai_service.py` | Insights, recommendations, patterns |
| **suggest_chart_type** | `ai_service.py` | Chart type + axes from columns/sample |
| **generate_image** | `ai_service.py` | DALL-E 3 for Premium |
| **File Analyzer** | `backend/app/services/file_analyzer.py` | AI summary (data type, quality, use cases) |
| **AISchemaAssistant** | `src/components/datamodel/AISchemaAssistant.jsx` | NL → database schema |
| **AgenticAI** | `src/pages/AgenticAI.jsx` | Plan → execute (analyze, clean, transform, calculate, visualize, report) |
| **AIInsights / AIAssistant** | `src/components/dashboard/` | Dashboard AI analysis and ops |
| **meldra/ai/llm.js** | `src/lib/meldra/ai/llm.js` | generateDatabaseSchema, analyzeData, **generateSQL**, summarizeText, extractStructuredData |

### Classical ML / Stats (no deep learning)

| Feature | Location | What it does |
|--------|----------|--------------|
| **meldra/ml/data-processing.js** | `src/lib/meldra/ml/data-processing.js` | `calculateStatistics`, `normalizeData`, `standardizeData`, `detectOutliers`, `fillMissingValues`, `calculateCorrelation`, `binData` |

### Non-AI today

- **SQLGenerator**: schema → `CREATE TABLE` + FKs only; **no natural language → SQL** (meldra has `generateSQL` but it’s not wired to the UI).
- **CleaningTools**: rules only (duplicates, trim, infer types).
- **DataValidator**: regex/rule-based type detection.
- **DataTransform**: fixed ops (add, subtract, multiply, divide, %).
- **OCR**: Tesseract only; no LLM/AI post-processing.
- **FilenameCleaner**: rules; no AI suggestions.
- **FileToPPT, PdfDocConverter, PLBuilder**: no AI.

---

## 2. What’s Required to Add More AI/ML

### 2.1 For More LLM / GenAI (fastest path)

**Already in place:**

- `OPENAI_API_KEY` in backend `.env`
- `openai` in `backend/requirements.txt`
- `ai_service.invoke_llm()` and related helpers

**To extend:**

1. **New helpers in `ai_service.py`**  
   - e.g. `generate_sql_from_nl(schema, question)`, `suggest_cleaning_ops(columns, sample)`, `suggest_slide_structure(titles, data_summary)`.

2. **New API routes in `main.py`**  
   - e.g. `POST /api/ai/nl-to-sql`, `POST /api/ai/suggest-cleaning`, `POST /api/ai/suggest-slides`.

3. **Frontend**  
   - Call `backendApi.llm.invoke` or new `backendApi.ai.*` endpoints; respect existing auth and AI-usage limits.

4. **Optional: other LLM providers**  
   - Anthropic, local Ollama, etc.: add client + env (e.g. `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL`) and a small provider-abstraction in `ai_service` so you can switch per feature.

**Effort:** Low–medium. No extra infra if you stay with OpenAI.

---

### 2.2 For Classical ML (stats, simple models)

**Frontend (Meldra):**

- `meldra/ml/data-processing.js` already has: stats, normalize, standardize, outliers, fill missing, correlation, binning.

**To extend:**

1. **Use it in more places**  
   - CleaningTools: “Fill missing” with mean/median/mode/forward/backward.  
   - DataValidator: use `detectOutliers` for numeric columns; `calculateCorrelation` for “suggest related columns”.  
   - Dashboard/AgenticAI: precompute stats before sending summaries to the LLM.

2. **Backend ML (Python)**  
   - `scikit-learn` (and optionally `pandas`, `numpy`) in `requirements.txt`.  
   - New module e.g. `backend/app/services/ml_service.py`:  
     - Simple forecasting (e.g. `LinearRegression`, `AR`-like with sklearn).  
     - Clustering (KMeans) for segmentation.  
     - Simple anomaly scores (e.g. isolation Forest, or z-score/IQR).  
   - Routes like `POST /api/ml/forecast`, `POST /api/ml/cluster`, `POST /api/ml/anomalies`.

**Effort:** Low–medium. No GPU; runs on CPU.

---

### 2.3 For Deep Learning (PyTorch / TensorFlow)

**When it’s useful:**

- Time-series forecasting (LSTM, Transformer).
- Dense embeddings for semantic search (“find sheets like this”).
- Custom document/layout understanding (if you move beyond OCR + LLM).
- Image models (e.g. diagram/table detection in PDFs) if you don’t rely only on DALL-E.

**Requirements:**

1. **Dependencies**

   ```text
   # backend/requirements.txt
   torch>=2.0.0   # or tensorflow
   # Optional: sentence-transformers, transformers (Hugging Face)
   ```

2. **Compute**

   - CPU: fine for embedding models, small LSTMs, inference.  
   - GPU: better for training or heavier models (e.g. on Railway, Modal, RunPod, or your own machine).

3. **Code layout**

   - `backend/app/services/dl_service.py` or `backend/app/services/embedding_service.py`.  
   - Prefer **pre-trained models** (e.g. `sentence-transformers`, Hugging Face) over training from scratch at first.

4. **Data**

   - Embeddings: use your schemas, column names, sheet summaries.  
   - Forecasting: user’s time-series columns.  
   - You typically don’t need large labeled datasets if you use pre-trained models.

**Effort:** Medium–high. Start with embeddings and simple forecasting; leave heavy CV/NLP training for later.

---

### 2.4 For “Agentic” and Workflow AI

**You already have:**

- AgenticAI: plan (LLM) → execute (analyze, clean, transform, calculate, visualize, report).

**To deepen:**

1. **Tools/API for the agent**  
   - Formal “tools” (e.g. `run_sql`, `apply_cleaning`, `create_chart`, `export_pdf`) with clear inputs/outputs.  
   - Backend: `POST /api/agent/tools` or a single `POST /api/agent/run` that selects and runs tools.

2. **Better planning**  
   - Few-shot examples in the plan prompt.  
   - Optional: ReAct-style (thought → action → observation) or OpenAI function-calling / structured outputs for tool use.

3. **Memory / state**  
   - In-session only: React state + `sessionStorage` (you already use it).  
   - Optional: short “working memory” in the backend for the duration of one agent run (no long-term storage required for MVP).

**Effort:** Medium. Builds on current `invoke_llm` and backend routes.

---

## 3. Where to Add AI/ML – Prioritized

### Tier 1 – Quick LLM wins (no new infra)

| Place | Current | AI/ML addition | Backend | Frontend |
|-------|---------|----------------|---------|----------|
| **SQLGenerator** | Schema → DDL only | **NL → SQL**: “List top 10 customers by revenue” → `SELECT` using `generateSQL` / new `generate_sql_from_nl` | `ai_service.generate_sql_from_nl(schema, question)`; route `POST /api/ai/nl-to-sql` | “Ask in natural language” textbox; call API; show SQL in existing pane |
| **CleaningTools** | Fixed ops | **AI suggest**: “Suggest cleaning steps” from columns + sample | `suggest_cleaning_ops(columns, sample_rows)` via `invoke_llm`; `POST /api/ai/suggest-cleaning` | Button + modal with suggested steps; one-click apply |
| **DataValidator** | Rule-based types | **AI anomaly hints**: “Strange values / outliers” and “suggest validation rules” | Reuse `analyze_data` or new `suggest_validation_rules`; optionally `ml_service.detect_anomalies` | Section “AI suggestions” in validator results |
| **DataTransform** | Fixed math ops | **NL transform**: “Profit = Revenue - Cost”, “Margin = (Profit/Revenue)*100” | `generate_formula`-like or new `parse_transform_from_nl(description, headers)`; `POST /api/ai/nl-transform` | Input: “Create column X as …”; AI returns formula/plan; user confirms |
| **FilenameCleaner** | Rules | **AI naming suggestions**: “Suggest clean names for these files” | `suggest_filenames(filenames, context)` via `invoke_llm`; `POST /api/ai/suggest-filenames` | Optional “AI suggest” that pre-fills or suggests presets |

### Tier 2 – LLM + classical ML

| Place | Current | AI/ML addition | Backend | Frontend |
|-------|---------|----------------|---------|----------|
| **AgenticAI** | Plan + execute | **Forecasting step**: “Predict next month” using sklearn (or simple DL) | `ml_service.forecast(series, horizon)` | New `executeForecast`; show in “Detailed Results” |
| **AgenticAI** | — | **Clustering step**: “Group similar rows” | `ml_service.cluster(rows, n_clusters, numeric_cols)` | New `executeCluster`; suggest a “Cluster” column |
| **File Analyzer** | AI summary | **Anomaly detection**: highlight rows/cols with anomalies | `ml_service.anomaly_scores(df)` or `detectOutliers` in meldra | In `quality_issues` or new “Anomalies” section |
| **Dashboard / AIInsights** | LLM analysis | **Precomputed stats + correlation** before LLM | Use `meldra/ml` in frontend or `ml_service` in backend; pass into `analyze_data` | Richer, more numeric context in the prompt |
| **OCRConverter** | Tesseract → DOC/PDF | **AI post-process**: fix obvious OCR errors, improve structure | `invoke_llm` with “Fix OCR errors and structure” + extracted text; optional `extractStructuredData` | Toggle “AI enhance” before export |

### Tier 3 – Deep learning and advanced features

| Place | Current | AI/ML addition | Backend | Frontend |
|-------|---------|----------------|---------|----------|
| **Search / “Find similar”** | — | **Embeddings**: schema + column names + short summary | `sentence-transformers` or OpenAI embeddings; store vectors (e.g. in PG with pgvector or in-memory for MVP) | “Sheets similar to this” or “Schemas like this” |
| **Time-series / Forecasting** | — | **LSTM / Transformer** for “Next 6 months” | `dl_service.forecast_lstm` or HF time-series model; route `POST /api/ml/forecast-advanced` | In AgenticAI or a dedicated “Forecasting” tool |
| **FileToPPT** | Structure from data | **AI slide design**: titles, section order, which charts on which slide | `suggest_slide_structure(titles, data_summary, n_slides)` via `invoke_llm` | “AI design” mode: AI proposes layout; user edits |
| **Document understanding** | OCR + form parsing | **Layout/table detection** in PDFs (if needed) | Fine-tuned or pre-trained layout model (e.g. LayoutLM, DocTR) or external API | Better table/form extraction before OCR text |

---

## 4. Implementation Order (Suggested)

**Phase 1 – Wire existing LLM and one new route (≈1–2 days)**

1. **SQLGenerator: NL → SQL**  
   - Implement `generate_sql_from_nl(schema, question)` in `ai_service.py` (or call `meldra generateSQL`-style logic via a new backend route).  
   - Add `POST /api/ai/nl-to-sql`.  
   - In `SQLGenerator.jsx`, add an “Natural language” tab or input; on submit, call the new API and show the generated SQL in the existing SQL view.

**Phase 2 – AI suggest and NL transforms (≈2–3 days)**

2. **CleaningTools: suggest cleaning**  
   - `suggest_cleaning_ops` + `POST /api/ai/suggest-cleaning`; UI: “Suggest” button and list of steps.

3. **DataTransform: NL transforms**  
   - `parse_transform_from_nl` + `POST /api/ai/nl-transform`; UI: text input “Create Margin as (Profit/Revenue)*100” and apply.

4. **DataValidator: AI suggestions**  
   - Reuse `analyze_data` or a small dedicated prompt; show “AI-suggested rules” and “Possible anomalies” (using `detectOutliers` or a simple backend anomaly pass).

**Phase 3 – Classical ML in backend (≈2–4 days)**

5. **`ml_service.py`**  
   - `forecast` (e.g. sklearn `Ridge` on lagged values or `statsmodels` AR), `cluster` (KMeans), `anomaly_scores` (Isolation Forest or z-scores).  
   - Routes: `POST /api/ml/forecast`, `POST /api/ml/cluster`, `POST /api/ml/anomalies`.

6. **Use in AgenticAI and File Analyzer**  
   - New action `forecast` and `cluster` in AgenticAI; anomaly block in File Analyzer.

**Phase 4 – OCR and FileToPPT (≈1–2 days each)**

7. **OCRConverter: AI enhance**  
   - Optional step: send OCR text to LLM to fix and structure; then pass to existing DOC/PDF export.

8. **FileToPPT: AI slide design**  
   - `suggest_slide_structure`; “AI design” that proposes titles and where to put charts.

**Phase 5 – Deep learning (optional, 1–2 weeks)**

9. **Embeddings**  
   - `sentence-transformers` or OpenAI `text-embedding-3-small`; store and search over schema/sheet summaries.  
   - New page or section: “Similar schemas” / “Similar datasets”.

10. **Advanced forecasting**  
    - LSTM or HF time-series model; `POST /api/ml/forecast-advanced` for users who need more than linear/simple models.

---

## 5. Dependencies to Add (as you need them)

**Backend `requirements.txt` (add incrementally):**

```txt
# Phase 2–3: classical ML
scikit-learn>=1.3.0
numpy>=1.24.0   # if not pulled in by pandas

# Phase 3: time-series (optional)
# statsmodels>=0.14.0

# Phase 5: deep learning (optional)
# torch>=2.0.0
# sentence-transformers>=2.2.0
# # or: openai  # you have it; for embeddings: client.embeddings.create(model="text-embedding-3-small", input=...)
```

---

## 6. Where to Plug In: File Map

| Area | Main files |
|------|------------|
| **AI service layer** | `backend/app/services/ai_service.py` |
| **New ML logic** | `backend/app/services/ml_service.py` (new) |
| **New routes** | `backend/app/main.py` (e.g. under `# AI/LLM ENDPOINTS` and new `# ML ENDPOINTS`) |
| **SQLGenerator** | `src/components/datamodel/SQLGenerator.jsx` |
| **CleaningTools** | `src/components/dashboard/CleaningTools.jsx` |
| **DataValidator** | `src/components/dashboard/DataValidator.jsx` |
| **DataTransform** | `src/components/dashboard/DataTransform.jsx` |
| **FilenameCleaner** | `src/pages/FilenameCleaner.jsx` |
| **AgenticAI** | `src/pages/AgenticAI.jsx` |
| **File Analyzer** | `backend/app/services/file_analyzer.py` + File Analyzer frontend |
| **OCRConverter** | `backend/app/services/ocr_service.py` + `src/pages/OCRConverter.jsx` |
| **FileToPPT** | `src/pages/FileToPPT.jsx` |
| **Meldra ML** | `src/lib/meldra/ml/data-processing.js` (use more in CleaningTools, DataValidator, Dashboard) |
| **Meldra AI** | `src/lib/meldra/ai/llm.js` (`generateSQL` can back a “NL→SQL” API or UI) |

---

## 7. Summary

- **To add more LLM features:**  
  - Use existing `ai_service` and `OPENAI_API_KEY`; add new helpers and routes; wire from UI. No extra infra.

- **To add classical ML:**  
  - Use `meldra/ml` more in the frontend; add `scikit-learn` (and optionally `statsmodels`) in the backend and a small `ml_service` + routes.

- **To add deep learning:**  
  - Start with **embeddings** (OpenAI or `sentence-transformers`) and **pre-trained** time-series or layout models; add `torch` (or `tensorflow`) and optionally GPU when you need heavier training or big models.

- **Highest-impact, lowest-effort next steps:**  
  1. **SQLGenerator: NL → SQL** (wire `generateSQL` or new `generate_sql_from_nl`).  
  2. **CleaningTools: AI suggest**.  
  3. **DataTransform: NL transforms**.  
  4. **Backend `ml_service`**: forecast, cluster, anomalies; then AgenticAI + File Analyzer.

After that, expand to OCR enhancement, FileToPPT AI design, and embedding-based “similar schemas/datasets” as you prioritize product and capacity.
