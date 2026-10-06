"""
AI/LLM Service for meldra, on Anthropic's Claude API.
ZERO DATA STORAGE - all prompts and responses are ephemeral: sent to Anthropic, never stored here.

Settings (environment):
  ANTHROPIC_API_KEY             required
  AI_ASSISTANT_MODEL            Claude model id (default claude-opus-5-5); non-Claude names are ignored
  AI_ASSISTANT_EFFORT           low | medium | high | xhigh | max (default medium)
  AI_ASSISTANT_MAX_TOKENS       optional cap on tokens per answer (thinking included)
  AI_ASSISTANT_MAX_PROMPT_CHARS optional cap on prompt length (default 400000)
"""
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

import anthropic
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

DEFAULT_MODEL = "claude-opus-5-5"
EFFORT_LEVELS = ("low", "medium", "high", "xhigh", "max")
# Models that take output_config.effort, and those that accept server-side refusal fallbacks.
_EFFORT_MODELS = {
    "claude-fable-5-1", "claude-fable-5", "claude-opus-5-5", "claude-opus-5", "claude-opus-4-8",
    "claude-opus-4-7", "claude-opus-4-6", "claude-sonnet-5-5", "claude-sonnet-5", "claude-sonnet-4-6",
}
_FALLBACK_MODELS = {"claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"}
_FALLBACK_BETA = "server-side-fallback-2026-07-01"

SYSTEM_PROMPT = (
    "You are the data analysis assistant inside meldra, a data and automation platform. "
    "Give concise, actionable answers about the user's data: patterns, trends and recommendations. "
    "Use the numbers you were given and say when the data is not enough to answer. "
    "Be professional and plain-spoken."
)
JSON_INSTRUCTION = (
    " Reply with a single JSON object and nothing else: no markdown fences, no text before or after it."
)

_client: Optional[anthropic.AsyncAnthropic] = None


def _get_client() -> anthropic.AsyncAnthropic:
    """One shared async client (reads ANTHROPIC_API_KEY); created on first use."""
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(max_retries=2, timeout=180.0)
    return _client


def assistant_model() -> str:
    """The Claude model configured for AI features."""
    configured = (os.getenv("AI_ASSISTANT_MODEL") or "").strip()
    return configured if configured.startswith("claude-") else DEFAULT_MODEL


def _resolve_model(model: Optional[str]) -> str:
    # Older callers and the web app may still pass OpenAI names such as gpt-4o-mini; only a
    # Claude model id is honoured, anything else uses the configured model.
    m = (model or "").strip()
    return m if m.startswith("claude-") else assistant_model()


def _effort() -> str:
    e = (os.getenv("AI_ASSISTANT_EFFORT") or "medium").strip().lower()
    return e if e in EFFORT_LEVELS else "medium"


def explain_ai_error(e: Exception) -> str:
    """A short, safe reason for an AI failure that can be shown to the user."""
    cause = e.__cause__ if isinstance(e, AIServiceError) and e.__cause__ else e
    if isinstance(cause, anthropic.AuthenticationError):
        return "the Anthropic API key on the server is missing or invalid"
    if isinstance(cause, anthropic.PermissionDeniedError):
        return "the Anthropic API key is not allowed to use this model"
    if isinstance(cause, anthropic.NotFoundError):
        return "the configured AI model is not available to this API key"
    if isinstance(cause, anthropic.RateLimitError):
        return "the Anthropic rate limit or spend limit was reached"
    if isinstance(cause, anthropic.APITimeoutError):
        return "the AI service took too long to respond"
    if isinstance(cause, anthropic.APIConnectionError):
        return "the AI service could not be reached"
    msg = str(e).lower()
    if "model" in msg and ("not found" in msg or "not_found" in msg or "does not exist" in msg):
        return "the configured AI model is not available to this API key"
    if "api key" in msg or "api_key" in msg or "auth" in msg or "401" in msg:
        return "the Anthropic API key on the server is missing or invalid"
    if "declined" in msg:
        return "the AI declined this request"
    return "the AI service returned an error"


class AIServiceError(Exception):
    """An AI call failed; str() is safe to log, explain_ai_error() is safe to show."""


def _parse_json(text: str) -> Any:
    """The JSON object in a reply, tolerating markdown fences or a sentence around it."""
    t = (text or "").strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", t, re.S)
    if fence:
        t = fence.group(1)
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        start, end = t.find("{"), t.rfind("}")
        if start != -1 and end > start:
            return json.loads(t[start:end + 1])
        raise


async def invoke_llm(
    prompt: str,
    add_context: bool = False,
    response_schema: Optional[Dict[str, Any]] = None,
    model: Optional[str] = None,
    max_tokens: int = 16000,
    return_usage: bool = False,
) -> Any:
    """
    Ask Claude. Returns text, or a parsed JSON object when response_schema is given.
    With return_usage, returns {"content", "usage": {prompt_tokens, completion_tokens, total_tokens}, "model"}.

    ZERO DATA STORAGE: the prompt goes to Anthropic for this one request and is not stored here.
    `add_context` is accepted for compatibility and unused.
    """
    effective_model = _resolve_model(model)
    # Thinking tokens count toward max_tokens, so leave room beyond the visible answer; a
    # small cap would cut the answer off mid-thought.
    effective_max_tokens = max(int(max_tokens or 0), 16000)
    try:
        env_cap = int((os.getenv("AI_ASSISTANT_MAX_TOKENS") or "").strip() or "0")
    except ValueError:
        env_cap = 0
    if env_cap > 0:
        effective_max_tokens = min(effective_max_tokens, max(env_cap, 4000))

    prompt_text = prompt or ""
    max_prompt_chars = int((os.getenv("AI_ASSISTANT_MAX_PROMPT_CHARS") or "400000").strip() or "400000")
    if max_prompt_chars > 0 and len(prompt_text) > max_prompt_chars:
        logger.warning("AI prompt of %s characters trimmed to %s", len(prompt_text), max_prompt_chars)
        prompt_text = prompt_text[:max_prompt_chars] + "\n\n[Context trimmed to fit the size limit.]"

    request: Dict[str, Any] = {
        "model": effective_model,
        "max_tokens": effective_max_tokens,
        "system": SYSTEM_PROMPT + (JSON_INSTRUCTION if response_schema else ""),
        "messages": [{"role": "user", "content": prompt_text}],
    }
    if effective_model in _EFFORT_MODELS:
        request["output_config"] = {"effort": _effort()}

    try:
        if effective_model in _FALLBACK_MODELS:
            # On a safety decline, the API reruns the request on a fallback model it chooses.
            response = await _get_client().beta.messages.create(
                **request, betas=[_FALLBACK_BETA], fallbacks="default"
            )
        else:
            response = await _get_client().messages.create(**request)
    except anthropic.APIError as e:
        raise AIServiceError(f"Claude API error: {e}") from e

    if response.stop_reason == "refusal":
        raise AIServiceError("The AI declined this request.")
    text = "".join(getattr(b, "text", "") for b in response.content if b.type == "text").strip()
    if not text:
        raise AIServiceError(f"Claude returned no answer (stop reason: {response.stop_reason}).")

    usage = {
        "prompt_tokens": int(getattr(response.usage, "input_tokens", 0) or 0),
        "completion_tokens": int(getattr(response.usage, "output_tokens", 0) or 0),
    }
    usage["total_tokens"] = usage["prompt_tokens"] + usage["completion_tokens"]

    content: Any = text
    if response_schema:
        try:
            content = _parse_json(text)
        except (json.JSONDecodeError, ValueError) as e:
            raise AIServiceError(f"Claude did not return valid JSON: {e}. Start: {text[:200]}") from e

    if return_usage:
        return {"content": content, "usage": usage, "model": response.model}
    return content


async def generate_image(prompt: str, size: str = "1024x1024", model: Optional[str] = None) -> str:
    """Image generation was an OpenAI (DALL-E) feature; Claude does not generate images."""
    raise AIServiceError("Image generation is not available: meldra's AI provider (Claude) does not generate images.")


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
