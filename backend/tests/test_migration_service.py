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
