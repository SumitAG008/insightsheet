# AI, ML & Deep Learning Strategy for Insightlite

**Goal:** Use AI/ML/DL to make Insightlite more **robust** and a **market leader** in data + document tools.

---

## 1. What You Already Have

| Layer | Where | What |
|-------|-------|------|
| **AI (LLM)** | `ai_service.py`, `file_analyzer.py`, `meldra/ai/llm.js`, `AgenticAI.jsx` | Formulas, chart suggestions, data analysis, Excel AI summary, Agentic AI (plan→execute→report), schema gen, NL→SQL, summarize, extract |
| **Classical ML** | `meldra/ml/data-processing.js` | Stats, normalize, standardize, **outlier detection (IQR)**, fill missing, correlation, binning — **not wired into UI** |
| **Deep Learning** | — | **None** — OCR uses Tesseract (classical) |

---

## 2. Where AI/ML/DL Will Make You More Robust & a Market Leader

### 2.1 OCR & Document Understanding → **Deep Learning** (High impact)

**Current:** Tesseract + heuristics. Good for clean forms; weak on complex layouts, handwriting, low-res scans.

**Add:**

| Capability | Technology | Benefit |
|------------|------------|---------|
| **Document layout / structure** | DocTR, LayoutLM, or Donut-style models | Tables, sections, key-value pairs without brittle rules → **exact editable output** you’re targeting |
| **Form / table extraction** | Azure Form Recognizer, Google Document AI, or open-source (e.g. Table Transformer) | Robust checkboxes, tables, fields across many form types |
| **Handwriting / degraded text** | TrOCR or similar | Better than Tesseract on photos, handwritten forms |

**Where in app:** `ocr_service.py` — optional “DL mode”:  
Tesseract (default) vs. Document AI / DocTR for harder images.  
Export (DOC/PDF) already uses layout; DL improves the **layout + table detection** that feeds it.

**Market angle:** “Form & document OCR that keeps layout and tables intact, not just plain text.”

---

### 2.2 Data Cleaning → **ML + LLM** (High impact)

**Current:** `CleaningTools.jsx` — rules only: dedupe, trim, naive type inference.

**Add:**

| Capability | Type | Implementation |
|------------|------|----------------|
| **Outlier-aware cleaning** | ML | Use `meldra`’s `detectOutliers` in CleaningTools; “Remove/flag outliers” with IQR (configurable). |
| **Smarter missing value fill** | ML | Use `fillMissingValues` with mean/median/mode/forward/backward; **LLM suggests** best strategy from column semantics. |
| **“Smart clean” in natural language** | LLM | e.g. “Fix dates, drop duplicates, fill missing in Revenue with median” → agent picks operations and params. |
| **Semantic deduplication** | ML/embeddings | “Near-duplicate” rows via embeddings (e.g. sentence-transformers) + similarity threshold; optional extra. |

**Where:** `CleaningTools.jsx` + new backend `POST /api/ai/clean-suggest` (LLM) and `POST /api/data/clean` using `meldra`-style logic.

**Market angle:** “Cleaning that uses statistics and AI, not only fixed rules.”

---

### 2.3 Data Validation → **ML + LLM** (Medium–High impact)

**Current:** `DataValidator.jsx` — regex and simple heuristics (email, phone, date, number).

**Add:**

| Capability | Type | Implementation |
|------------|------|----------------|
| **Custom rules from natural language** | LLM | “Column X must be between 0 and 100” / “Y must look like an order ID” → generate validation logic. |
| **Anomaly-based validation** | ML | Use `detectOutliers` + simple distribution checks; “unusual” values as validation warnings. |
| **Format suggestion** | LLM | “This column looks like product codes / IDs / addresses” → suggest formats and rules. |

**Where:** `DataValidator.jsx` + `POST /api/ai/validation-rules` and existing `meldra` stats.

**Market angle:** “Describe how data should look in plain English; we suggest and run checks.”

---

### 2.4 Data Transform → **LLM** (Medium impact)

**Current:** `DataTransform.jsx` — fixed ops: +, −, ×, ÷, %.

**Add:**

| Capability | Type | Implementation |
|------------|------|----------------|
| **“Create column that…”** | LLM | e.g. “Profit = Revenue - Cost”, “Full name = First + ' ' + Last” → parse and generate transform. |
| **Auto-suggest transforms** | LLM | From column names + sample → “You might want: Margin = (Revenue - Cost) / Revenue”. |

**Where:** `DataTransform.jsx` + `POST /api/ai/transform` (reuse `invoke_llm` + structured JSON).

**Market angle:** “Define new columns in plain language.”

---

### 2.5 Agentic AI → **Stronger execution + ML** (High impact)

**Current:** `AgenticAI.jsx` — plans with LLM; `executeClean` is simple dedupe + “N/A” fill; `executeTransform` / `executeVisualize` are stubs.

**Add:**

| Capability | Type | Implementation |
|------------|------|----------------|
| **Real clean** | ML | Reuse `CleaningTools` + `meldra` (outliers, fill strategies). |
| **Real transform** | LLM + logic | Reuse `DataTransform` + LLM-generated formulas. |
| **Real visualize** | Existing | Call chart-suggestion API + create chart config and (if you have it) export. |
| **Tools / function-calling** | LLM | “clean”, “transform”, “chart”, “export” as tools; LLM chooses and fills params. |
| **Use ML in steps** | ML | Outlier step, suggest-fill step, etc. |

**Where:** `AgenticAI.jsx` + `ai_service` (or small `agent_service`) with a tools layer.

**Market angle:** “An agent that actually cleans, transforms, and charts your data, not just plans.”

---

### 2.6 Forecasting & Predictive → **Deep Learning / classical** (Strong differentiator)

**Current:** None.

**Add:**

| Capability | Type | Implementation |
|------------|------|----------------|
| **“Predict next N” for time series** | Classical/DL | Prophet, ARIMA, or a small LSTM/Transformer; expose as “Forecast” on date + value columns. |
| **“Suggest forecast”** | LLM | From columns: “This looks like monthly sales; I can forecast next 3 months.” |
| **Simple scenario** | LLM + math | “If growth is 5%, what’s next quarter?” using your math, LLM for interpretation. |

**Where:** New `Forecast` component in Dashboard or standalone; backend `POST /api/ai/forecast` (Prophet or lightweight DL). Python: `prophet` or `sklearn`/`torch` for small models.

**Market angle:** “Forecast time series from a table, no code.”

---

### 2.7 Search & similarity → **Embeddings** (Differentiator)

**Current:** None in-dataset.

**Add:**

| Capability | Type | Implementation |
|------------|------|----------------|
| **“Find rows similar to this one”** | Embeddings | Encode rows (or key text columns) with sentence-transformers; similarity search. |
| **“Find rows like …” (natural language)** | LLM + embeddings | LLM turns query into a “reference” row or description; embedding similarity. |

**Where:** New “Similarity” tool in Dashboard; backend with `sentence-transformers` or API-based embeddings.

**Market angle:** “Search your table by meaning, not only exact text.”

---

### 2.8 File / Excel analysis → **LLM + ML** (More robustness)

**Current:** `file_analyzer.py` — stats + LLM summary.

**Add:**

| Capability | Type | Implementation |
|------------|------|----------------|
| **Auto-chart from analysis** | LLM | Reuse chart-suggestion; return chart config for the first chart the UI can render. |
| **Anomaly highlights** | ML | Per-column `detectOutliers`; “Column X has N outliers (values: …)”. |
| **“Forecast this column”** | DL/classical | If a date + value column pair is detected, offer 1-click forecast. |
| **Data quality score** | ML + heuristics | Missing %, duplicates, outliers, type consistency → 0–100 and tips. |

**Where:** `file_analyzer.py` and the analysis UI that consumes it.

**Market angle:** “We don’t only describe your file—we find issues and suggest charts and forecasts.”

---

### 2.9 SQL / Data model → **LLM** (Quick win)

**Current:** `meldra/ai/llm.js` has `generateSQL`; `SQLGenerator.jsx` exists but NL→SQL may not be fully wired.

**Add:**

| Capability | Type | Implementation |
|------------|------|----------------|
| **“Explain this SQL in plain English”** | LLM | Send SQL + schema → short explanation. |
| **“Change this query so it also filters by X”** | LLM | Edit existing SQL per NL. |
| **Stricter schema-aware SQL** | LLM | Ensure `generateSQL` gets schema and dialect; validate (e.g. EXPLAIN) before returning. |

**Where:** `SQLGenerator.jsx` + `meldra` `generateSQL` and a small backend proxy if needed.

**Market angle:** “Talk to your data model in natural language.”

---

## 3. What You Need (Stack & Ops)

### 3.1 Backend (Python)

| Purpose | Libs / services | Notes |
|---------|------------------|-------|
| **LLM** | Already: `openai` | Keep; add optional Azure/Anthropic later. |
| **Classical ML** | `scikit-learn`, `pandas`, `numpy` | Already have `pandas`; add `scikit-learn` for anything beyond `meldra`-style. |
| **Time series** | `prophet` or `statsmodels` | Prophet is easy for product; LSTM/Transformer if you want DL. |
| **Embeddings** | `sentence-transformers` or OpenAI `text-embedding-3-small` | OpenAI = simpler; `sentence-transformers` = on-prem, no per-call embed cost. |
| **Document / OCR DL** | DocTR, or Azure/Google Document AI | DocTR: self-hosted; cloud: best accuracy, vendor lock-in. |
| **DL (optional)** | `torch` / `tensorflow` | Only if you do custom models (e.g. forecasting, layout). |

### 3.2 Frontend (JavaScript)

| Purpose | Approach |
|---------|----------|
| **ML** | Keep `meldra/ml/data-processing.js`; call backend for heavier ML (outliers, fill, forecast, similarity). |
| **LLM** | Keep `meldra/ai/llm` and `backendApi.llm`; add endpoints for clean-suggest, validation-rules, transform, forecast. |

### 3.3 Infra

- **GPU:** Optional for DocTR / embeddings / LSTM on your own hardware; otherwise use serverless GPU or cloud Document AI.
- **Caching:** Cache embeddings and expensive forecasts (e.g. by dataset hash + params).
- **Rate limits / cost:** Per-user caps for LLM and for heavy ML/DL (forecast, document AI).

---

## 4. Phased Rollout (Prioritised for robustness + market lead)

### Phase 1 — Quick wins (1–2 months)

1. **Wire `meldra` ML into CleaningTools**  
   - Outlier detection + “Fill missing with (mean/median/mode/forward/backward)” using `meldra` or a thin backend.  
   - **Robustness:** Fewer bad fills and more transparent handling of outliers.

2. **SQLGenerator + LLM**  
   - Expose `generateSQL` in `SQLGenerator.jsx`; add “Explain SQL”.  
   - **Market:** “NL to SQL” as a clear feature.

3. **DataTransform + LLM**  
   - “Create column = …” in natural language; one new `POST /api/ai/transform`.  
   - **Market:** Transforms without learning formula syntax.

4. **Agentic AI: real clean + transform**  
   - `executeClean` and `executeTransform` call the same logic as CleaningTools and DataTransform (including ML and LLM).  
   - **Robustness:** The agent actually changes data correctly.

### Phase 2 — Clear differentiators (2–4 months)

5. **Forecasting**  
   - Prophet (or similar) for “Forecast next N” on a date + value column; optional “Explain” via LLM.  
   - **Market:** “Forecast from a spreadsheet” with minimal setup.

6. **Validation: custom rules from NL**  
   - `POST /api/ai/validation-rules` + UI in DataValidator.  
   - **Market:** “Describe your rules in English.”

7. **File analyzer: anomalies + auto-chart**  
   - Outlier report per column; chart suggestion that returns a concrete chart config.  
   - **Robustness:** Better Excel upload experience.

8. **“Smart clean” in NL**  
   - One prompt: “Fix dates, drop dupes, fill missing in X with median” → agent configures and runs the right cleaning steps.  
   - **Market:** One sentence to clean.

### Phase 3 — Heavier DL / platform (4–8 months)

9. **OCR: DL-backed layout and tables**  
   - Integrate Document AI or DocTR as an option for hard forms; keep Tesseract as default.  
   - **Robustness + market:** “Best-in-class form/document OCR”.

10. **Similarity search**  
    - “Rows similar to this” / “Find rows like …” using embeddings.  
    - **Market:** “Semantic search in your data”.

11. **Agentic AI: tools (function-calling)**  
    - clean, transform, chart, forecast, export as tools; LLM chooses and executes.  
    - **Robustness + market:** One place to do data work via language.

---

## 5. How This Makes You the Market Leader

- **Robustness:**  
  - ML for cleaning (outliers, better fill), validation (anomalies), and file analysis (quality, issues).  
  - DL for OCR on difficult documents.  
  - Agent that truly cleans, transforms, and charts.

- **Differentiation:**  
  - NL to SQL, NL to transform, NL to validation.  
  - Forecasting from a table.  
  - Semantic similarity.  
  - Document OCR that preserves layout and tables.  
  - One-shot “Smart clean” and a capable Agentic AI.

- **Positioning:**  
  - “The data app that uses AI and ML where it matters: clean, validate, transform, forecast, and understand documents—without code.”

---

## 6. Dependencies to Add (when you implement)

```text
# Backend (add to requirements.txt when implementing)
scikit-learn>=1.3.0      # Phase 1–2: general ML
prophet>=1.1.0           # Phase 2: forecasting
sentence-transformers    # Phase 3: embeddings (or use OpenAI embeddings)
# Optional, for DL-based OCR:
# doctr (DocTR) or use Azure/Google Document AI via REST
```

---

## 7. One-Page Summary

| Area | Add | Type | Main benefit |
|------|-----|------|--------------|
| **OCR** | Document AI / DocTR, layout+table DL | DL | Layout-faithful, form-ready output |
| **Cleaning** | Outliers, smart fill, “Smart clean” in NL | ML + LLM | Robustness + ease of use |
| **Validation** | Custom rules from NL, anomaly checks | LLM + ML | Flexible, data-driven rules |
| **Transform** | “Create column that…” in NL | LLM | No formula learning |
| **Agentic AI** | Real clean/transform/chart, then tools | LLM + ML | Agent that does the work |
| **Forecasting** | “Forecast next N” | DL/classical | Strong differentiator |
| **Similarity** | “Rows similar to / like …” | Embeddings | Semantic search in tables |
| **File analysis** | Anomalies, auto-chart, forecast offer | ML + LLM | Smarter first mile |
| **SQL/Data model** | NL→SQL, Explain, Edit | LLM | “Talk to your schema” |

If you tell me your current priorities (e.g. “OCR first” or “Agentic + Cleaning first”), I can turn one phase into a concrete implementation plan (APIs, file changes, and UI steps).
