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
            return json.loads(content) if content else {}

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
