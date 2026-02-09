# AI, ML & Deep Learning – Use Cases & How to Test

This doc lists **what exists today** (AI/ML/DL in Insightlite), **testable use cases**, and a short **roadmap**.  
See `AI_ML_DEEPLEARNING_STRATEGY.md` for the full strategy.

---

## 1. What Exists Today

### 1.1 AI (LLM – OpenAI)

| Feature | Where | API / UI | What It Does |
|--------|-------|----------|--------------|
| **General LLM** | `ai_service.invoke_llm` | `POST /api/ai/llm` | Chat-style answers for data analysis |
| **Formula from NL** | `ai_service.generate_formula` | `POST /api/ai/formula` | “Sum A1 to A10” → Excel formula + explanation |
| **Data analysis** | `ai_service.analyze_data` | `POST /api/ai/analyze` | Insights, patterns, recommendations from a data summary |
| **Chart suggestion** | `ai_service.suggest_chart_type` | `POST /api/ai/suggest-chart` | Suggests chart type, axes, grouping from columns |
| **Transform from NL** | `ai_service.generate_transform` | `POST /api/ai/transform` | “Profit = Revenue - Cost” → new_column, col_a, col_b, op |
| **Explain SQL** | `ai_service.explain_sql` | `POST /api/ai/explain-sql` | SQL → short plain-English explanation |
| **DALL·E image** | `ai_service.generate_image` | `POST /api/ai/generate-image` | Text → image URL |

### 1.2 AI in File Analyzer

| Feature | Where | API / UI | What It Does |
|--------|-------|----------|--------------|
| **AI summary** | `file_analyzer._generate_ai_summary` | `POST /api/files/analyze` → `sheets[].ai_summary` | Data type, key insights, data_quality, use cases, suggested operations |

### 1.3 ML (classical) – New in File Analyzer

| Feature | Where | API / UI | What It Does |
|--------|-------|----------|--------------|
| **Outlier detection (IQR)** | `file_analyzer._detect_outliers_iqr` | `POST /api/files/analyze` → `sheets[].outliers` | Per numeric column: count, sample outlier values |
| **Data quality score** | `file_analyzer._compute_data_quality_score` | `POST /api/files/analyze` → `sheets[].data_quality_score`, `overall_summary.overall_data_quality_score` | 0–100 from missing %, duplicates, outliers |

### 1.4 Agentic AI

| Feature | Where | UI | What It Does |
|--------|-------|-----|--------------|
| **Plan → Execute → Report** | `AgenticAI.jsx` + backend LLM | Agentic AI page | NL goal → plan steps → (clean/transform/visualize) → report |

### 1.5 OCR (classical + optional API)

| Feature | Where | API / UI | What It Does |
|--------|-------|----------|--------------|
| **Tesseract / OCR.space** | `ocr_service.py`, `main.ocr_extract` | OCR Converter | Image → text + layout; export to DOC/PDF |

### 1.6 Security AI/ML

| Feature | Where | API / UI | What It Does |
|--------|-------|----------|--------------|
| **Fraud detection** | `security_ai_service.detect_fraud_patterns` | `POST /api/ai/security/fraud-detection` (admin) | Detects multiple IPs, impossible travel, unusual access times, failed login spikes |
| **Access pattern analysis** | `security_ai_service.analyze_access_patterns` | `POST /api/ai/security/access-patterns` | ML analysis of user login patterns, behavioral insights |
| **API abuse detection** | `security_ai_service.detect_api_abuse` | `GET /api/ai/security/api-abuse` (admin) | Detects rate limit violations, unusual API usage patterns |

### 1.7 Compliance AI

| Feature | Where | API / UI | What It Does |
|--------|-------|----------|--------------|
| **GDPR compliance check** | `compliance_ai_service.gdpr_compliance_check` | `GET /api/ai/compliance/gdpr-check` (admin) | AI-powered GDPR compliance assessment, data retention checks |
| **Privacy analysis** | `compliance_ai_service.analyze_data_privacy` | `GET /api/ai/compliance/privacy-analysis/{email}` | Analyzes user's data privacy footprint, compliance status |
| **Audit report** | `compliance_ai_service.generate_audit_report` | `GET /api/ai/compliance/audit-report` (admin) | Generates comprehensive compliance audit report |

### 1.8 Predictive ML

| Feature | Where | API / UI | What It Does |
|--------|-------|----------|--------------|
| **Time series forecasting** | `predictive_ml_service.forecast_time_series` | `POST /api/ai/ml/forecast` | Forecasts future values using linear/exponential/moving_average/AI methods |
| **Trend detection** | `predictive_ml_service.detect_trends` | `POST /api/ai/ml/detect-trends` | Detects trends, patterns, seasonality in time series data |
| **Anomaly prediction** | `predictive_ml_service.predict_anomalies` | `POST /api/ai/ml/predict-anomalies` | Predicts anomalies using statistical methods + AI insights |

### 1.9 Deep Learning (DL)

| Status | Notes |
|--------|-------|
| **None in-app** | OCR uses Tesseract/OCR.space. DL (e.g. DocTR, Form Recognizer) is in the roadmap. |

---

## 2. Testable Use Cases

### 2.1 AI (LLM)

| # | Use Case | How to Test |
|---|----------|-------------|
| 1 | **Formula from NL** | 1) Open Formula / AI tool. 2) Enter: “Average of column B where A > 0”. 3) Check formula + explanation. |
| 2 | **Data analysis** | 1) `POST /api/ai/analyze` with `data_summary` (columns + sample) and optional `question`. 2) Check `insights`, `recommendations`, `patterns`, `summary`. |
| 3 | **Chart suggestion** | 1) `POST /api/ai/suggest-chart` with `columns` and optional `data_preview`. 2) Check `primary_chart`, `x_axis`, `y_axis`. |
| 4 | **Transform from NL** | 1) In Data Transform: “Profit = Revenue - Cost”. 2) Check `new_column_name`, `col_a`, `col_b`, `op`. |
| 5 | **Explain SQL** | 1) `POST /api/ai/explain-sql` with `sql` and optional `schema`. 2) Check `explanation`. |
| 6 | **DALL·E** | 1) `POST /api/ai/generate-image` with `prompt`. 2) Check image URL. |
| 7 | **Agentic AI** | 1) Open Agentic AI. 2) “Summarize Sales by Region and suggest a chart”. 3) Check plan, steps, and report. |

### 2.2 File Analyzer (AI + ML)

| # | Use Case | How to Test |
|---|----------|-------------|
| 8 | **AI summary** | 1) File Analyzer → upload .xlsx/.csv → Analyze. 2) Check `sheets[0].ai_summary`: `data_type`, `key_insights`, `data_quality`, `use_cases`, `suggested_operations`, `summary`. |
| 9 | **Outlier detection (IQR)** | 1) Upload a file with numeric columns and a few extreme values (e.g. 1,2,3,4,5,1000). 2) Check `sheets[].outliers.by_column`: `column`, `count`, `sample_values`. 3) Check `quality_issues` for an “outliers” issue. |
| 10 | **Data quality score** | 1) Upload file with some nulls, duplicates, and outliers. 2) Check `sheets[].data_quality_score` (0–100). 3) Check `overall_summary.overall_data_quality_score`. |

### 2.3 OCR

| # | Use Case | How to Test |
|---|----------|-------------|
| 11 | **Image → text + layout** | 1) OCR Converter → upload image → Extract. 2) Check raw text and layout. |
| 12 | **Export to DOC/PDF (layout)** | 1) After Extract, choose “Layout” → export DOC or PDF. 2) Check that structure/alignment matches the image. |

---

## 3. Quick Test Commands (Backend)

Replace `BASE` with your backend URL (e.g. `http://localhost:8001`) and `TOKEN` with a valid JWT.

**Formula:**
```bash
curl -X POST "%BASE%/api/ai/formula" -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"description\":\"Sum column A\"}"
```

**Analyze:**
```bash
curl -X POST "%BASE%/api/ai/analyze" -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"data_summary\":\"Columns: Revenue, Cost, Profit. Sample: 100,50,50; 200,80,120\", \"question\":\"What stands out?\"}"
```

**Suggest chart:**
```bash
curl -X POST "%BASE%/api/ai/suggest-chart" -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"columns\":[{\"name\":\"Region\",\"type\":\"text\"},{\"name\":\"Sales\",\"type\":\"numeric\"}]}"
```

**Explain SQL:**
```bash
curl -X POST "%BASE%/api/ai/explain-sql" -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"sql\":\"SELECT a, b FROM t WHERE c > 0\"}"
```

**File analyze (ML: outliers + data_quality_score):**
```bash
curl -X POST "%BASE%/api/files/analyze" -H "Authorization: Bearer %TOKEN%" -F "file=@your.xlsx"
```

**Fraud detection (Security AI):**
```bash
curl -X POST "%BASE%/api/ai/security/fraud-detection" -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"days\": 7}"
```

**GDPR compliance check (Compliance AI):**
```bash
curl -X GET "%BASE%/api/ai/compliance/gdpr-check" -H "Authorization: Bearer %TOKEN%"
```

**Forecast time series (Predictive ML):**
```bash
curl -X POST "%BASE%/api/ai/ml/forecast" -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"data\":[{\"date\":\"2024-01-01\",\"value\":100},...],\"date_column\":\"date\",\"value_column\":\"value\",\"periods\":12,\"method\":\"linear\"}"
```

---

## 4. Roadmap (from AI_ML_DEEPLEARNING_STRATEGY.md)

| Phase | Add | Type | Where |
|-------|-----|------|-------|
| 1 | Wire `meldra` ML into CleaningTools (outliers, fill strategies) | ML | CleaningTools.jsx + backend |
| 1 | SQLGenerator + “Explain SQL” | LLM | SQLGenerator.jsx |
| 1 | DataTransform + LLM (“Create column = …”) | LLM | DataTransform + `POST /api/ai/transform` (exists) |
| 1 | Agentic: real clean + transform | LLM + ML | AgenticAI.jsx |
| 2 | Forecasting (e.g. Prophet) | Classical/DL | New `POST /api/ai/forecast`, Forecast UI |
| 2 | Validation: custom rules from NL | LLM | `POST /api/ai/validation-rules`, DataValidator |
| 2 | File analyzer: auto-chart from analysis | LLM | file_analyzer + chart config |
| 2 | “Smart clean” in NL | LLM | One-shot clean via agent |
| 3 | OCR: DL (DocTR / Document AI) | DL | ocr_service optional DL mode |
| 3 | Similarity search (embeddings) | ML | “Rows similar to / like …” |
| 3 | Agentic: function-calling tools | LLM | clean, transform, chart, forecast, export |

---

## 5. Dependencies

- **Existing:** `openai`, `pandas`, `numpy` (outlier IQR needs no extra deps).
- **When adding later:** `scikit-learn`, `prophet` or `statsmodels`, `sentence-transformers` or OpenAI embeddings (see `AI_ML_DEEPLEARNING_STRATEGY.md`).

---

## 6. One-Page Summary

| Area | In App Now | Testable | Roadmap |
|------|------------|----------|---------|
| **AI (LLM)** | Formula, analyze, chart suggest, transform, explain SQL, DALL·E, Agentic, File AI summary | §2.1, §2.2 (#8) | Stronger Agentic, NL validation, smart clean |
| **ML** | Outliers (IQR), data quality score, forecasting, trend detection, anomaly prediction | §2.2 (#9, #10), §2.5 (#19-21) | CleaningTools, similarity search |
| **Security AI/ML** | Fraud detection, access pattern analysis, API abuse detection | §2.3 (#13-15) | Real-time threat detection, behavioral biometrics |
| **Compliance AI** | GDPR checks, privacy analysis, audit reports | §2.4 (#16-18) | Automated compliance monitoring, data retention automation |
| **DL** | — | — | OCR (DocTR/Document AI), optional forecasting |

If you tell me your priority (e.g. “test File Analyzer ML” or “add forecasting”), I can turn it into concrete test steps or implementation tasks.
