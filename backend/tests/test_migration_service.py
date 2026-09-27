from app.services.migration_service import build_mapping_prompt

SHEETS = [
    {"name": "Worker_Data", "columns": ["Employee_ID", "Legal_First_Name", "Gender"]},
    {"name": "Companies", "columns": ["Company_ID", "Country"]},
]
CONCEPTS = [{"id": "employee_id", "label": "Employee ID"}, {"id": "first_name", "label": "First name"}]


def test_prompt_lists_headers_and_concepts_only():
    prompt = build_mapping_prompt(SHEETS, CONCEPTS, "Workday")
    assert '- "Worker_Data": ["Employee_ID", "Legal_First_Name", "Gender"]' in prompt
    assert "- employee_id: Employee ID" in prompt
    assert "from Workday to SAP SuccessFactors" in prompt
    assert '"mappings"' in prompt


def test_prompt_caps_sheet_and_column_counts():
    many = [{"name": f"S{i}", "columns": [f"c{j}" for j in range(200)]} for i in range(100)]
    prompt = build_mapping_prompt(many, CONCEPTS, "Workday")
    assert '"S39"' in prompt and '"S40"' not in prompt
    assert '"c79"' in prompt and '"c80"' not in prompt


def test_prompt_asks_for_tab_purposes_and_protects_dependents():
    prompt = build_mapping_prompt(SHEETS, CONCEPTS, "Workday")
    assert '"tabs"' in prompt and "retirees" in prompt and "pension" in prompt
    assert "belong to the dependent, NOT the employee" in prompt


def test_explain_ai_error_is_safe_and_specific(monkeypatch):
    from app.services.ai_service import explain_ai_error, assistant_model
    assert "model" in explain_ai_error(Exception("OpenAI Error: The model `gpt-4-turbo-preview` does not exist"))
    assert "API key" in explain_ai_error(Exception("Error code: 401 - Incorrect API key provided: sk-abc"))
    assert "sk-abc" not in explain_ai_error(Exception("Error code: 401 - Incorrect API key provided: sk-abc"))
    monkeypatch.delenv("AI_ASSISTANT_MODEL", raising=False)
    assert assistant_model() == "gpt-4o-mini"
    monkeypatch.setenv("AI_ASSISTANT_MODEL", "gpt-4.1-mini")
    assert assistant_model() == "gpt-4.1-mini"
