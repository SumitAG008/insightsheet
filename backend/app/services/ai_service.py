"""
AI/LLM Service for InsightSheet-lite
ZERO DATA STORAGE - All prompts and responses are ephemeral
"""
import openai
import os
from typing import Optional, Dict, Any, List
import json
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")


async def invoke_llm(
    prompt: str,
    add_context: bool = False,
    response_schema: Optional[Dict[str, Any]] = None,
    model: str = "gpt-4-turbo-preview",
    max_tokens: int = 2000
) -> Any:
    """
    Invoke OpenAI LLM for data analysis

    ZERO DATA STORAGE:
    - Prompt sent to OpenAI but NOT stored locally
    - Response returned but NOT stored locally
    - All data is ephemeral

    Args:
        prompt: User's prompt/question
        add_context: Add internet context (future feature)
        response_schema: Expected JSON response schema
        model: OpenAI model to use
        max_tokens: Maximum tokens in response

    Returns:
        str or dict: LLM response (text or JSON)
    """
    try:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a data analysis assistant for InsightSheet-lite. "
                    "Provide concise, actionable insights. "
                    "Focus on patterns, trends, and recommendations. "
                    "Be professional but conversational."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ]

        # JSON response mode
        if response_schema:
            response = openai.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                max_tokens=max_tokens
            )
            content = response.choices[0].message.content
            if not content:
                raise Exception("OpenAI returned empty response")
            try:
                return json.loads(content)
            except json.JSONDecodeError as e:
                raise Exception(f"Failed to parse JSON response from OpenAI: {str(e)}. Content: {content[:200]}")

        # Text response mode
        else:
            response = openai.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content

    except Exception as e:
        raise Exception(f"OpenAI Error: {str(e)}")


async def generate_image(
    prompt: str,
    size: str = "1024x1024",
    model: str = "dall-e-3"
) -> str:
    """
    Generate image using DALL-E

    ZERO DATA STORAGE:
    - Returns temporary URL only
    - Images NOT stored locally

    Args:
        prompt: Image description
        size: Image size (1024x1024, 1792x1024, 1024x1792)
        model: DALL-E model

    Returns:
        str: Temporary image URL
    """
    try:
        response = openai.images.generate(
            model=model,
            prompt=prompt,
            size=size,
            n=1
        )
        return response.data[0].url

    except Exception as e:
        raise Exception(f"DALL-E Error: {str(e)}")


async def generate_formula(
    description: str,
    context: Optional[str] = None
) -> Dict[str, str]:
    """
    Generate Excel formula based on natural language description

    Args:
        description: What the formula should do
        context: Additional context about the data

    Returns:
        dict: Formula and explanation
    """
    try:
        prompt = f"""
        Generate an Excel formula based on this description:
        {description}

        {f'Context: {context}' if context else ''}

        Respond with JSON:
        {{
            "formula": "=THE_FORMULA_HERE",
            "explanation": "Simple explanation of what it does",
            "example": "Example: =SUM(A1:A10) sums values in A1 to A10"
        }}
        """

        response = await invoke_llm(
            prompt=prompt,
            response_schema={"type": "json_object"}
        )

        return response

    except Exception as e:
        raise Exception(f"Formula generation error: {str(e)}")


async def analyze_data(
    data_summary: str,
    question: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze data and provide insights

    Args:
        data_summary: Summary of the data (column names, sample values, etc.)
        question: Specific question about the data

    Returns:
        dict: Analysis results with insights
    """
    try:
        prompt = f"""
        Analyze this data:
        {data_summary}

        {f'Question: {question}' if question else 'Provide general insights and recommendations.'}

        Respond with JSON:
        {{
            "insights": ["insight1", "insight2", "insight3"],
            "recommendations": ["recommendation1", "recommendation2"],
            "patterns": ["pattern1", "pattern2"],
            "summary": "Brief summary of findings"
        }}
        """

        response = await invoke_llm(
            prompt=prompt,
            response_schema={"type": "json_object"}
        )

        return response

    except Exception as e:
        raise Exception(f"Data analysis error: {str(e)}")


async def suggest_chart_type(
    columns: List[Dict[str, str]],
    data_preview: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    """
    Suggest best chart type for the data

    Args:
        columns: List of column info [{"name": "col1", "type": "numeric"}, ...]
        data_preview: Sample data rows

    Returns:
        dict: Chart suggestions
    """
    try:
        prompt = f"""
        Given these data columns:
        {json.dumps(columns, indent=2)}

        {f'Sample data: {json.dumps(data_preview[:5], indent=2)}' if data_preview else ''}

        Suggest the best chart types to visualize this data.

        Respond with JSON:
        {{
            "primary_chart": {{"type": "bar|line|pie|scatter|area", "reason": "why this chart"}},
            "alternative_charts": [{{"type": "chart_type", "reason": "why"}}, ...],
            "x_axis": "suggested column for x-axis",
            "y_axis": "suggested column for y-axis",
            "grouping": "suggested grouping column (if applicable)"
        }}
        """

        response = await invoke_llm(
            prompt=prompt,
            response_schema={"type": "json_object"}
        )

        return response

    except Exception as e:
        raise Exception(f"Chart suggestion error: {str(e)}")


async def generate_transform(
    columns: List[Dict[str, Any]],
    sample_rows: Optional[List[Dict]] = None,
    instruction: str = ""
) -> Dict[str, Any]:
    """
    Generate a new column transform from natural language.
    Returns { new_column_name, col_a, col_b, op } where op is add|subtract|multiply|divide|percentage|concat.
    """
    try:
        prompt = f"""
You are a data transform assistant. The user wants to create a new column from existing columns.

Column names: {json.dumps([c.get('name', c) if isinstance(c, dict) else c for c in columns])}

{f'Sample rows (first 3): {json.dumps((sample_rows or [])[:3], indent=2)}' if sample_rows else ''}

User instruction: "{instruction}"

Respond with ONLY a JSON object (no markdown, no extra text):
{{
  "new_column_name": "snake_case_name",
  "col_a": "exact column name for first operand",
  "col_b": "exact column name for second operand",
  "op": "add" | "subtract" | "multiply" | "divide" | "percentage" | "concat"
}}

For "percentage", the formula is (col_a / col_b) * 100.
For "concat", col_a and col_b are text columns joined with a space; if the user specifies a separator, you may add "separator": " - ".
Use only column names that exist in the list. new_column_name must be valid (letters, numbers, underscores).
"""
        out = await invoke_llm(prompt=prompt, response_schema={"type": "json_object"})
        # Normalize keys to snake_case for backend
        return {
            "new_column_name": (out.get("new_column_name") or out.get("newColumnName") or "new_column").strip().replace(" ", "_"),
            "col_a": out.get("col_a") or out.get("colA") or "",
            "col_b": out.get("col_b") or out.get("colB") or "",
            "op": (out.get("op") or "add").lower(),
            "separator": out.get("separator", " "),
        }
    except Exception as e:
        raise Exception(f"Transform generation error: {str(e)}")


async def explain_sql(sql: str, schema: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    """Explain SQL in plain English."""
    try:
        prompt = f"""
Explain this SQL in 2-4 short, clear sentences. Focus on what the query does and which tables/columns it uses.

{f'Schema context: {json.dumps(schema, indent=2)}' if schema else ''}

SQL:
{sql}

Respond with JSON: {{ "explanation": "your explanation here" }}
"""
        out = await invoke_llm(prompt=prompt, response_schema={"type": "json_object"})
        return {"explanation": out.get("explanation", "Could not generate explanation.")}
    except Exception as e:
        raise Exception(f"Explain SQL error: {str(e)}")
