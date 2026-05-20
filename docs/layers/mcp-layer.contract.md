# MCP / AI Intelligence Layer Contract

## Purpose

The MCP / AI intelligence layer turns commerce data into structured creative decisions using a hybrid approach: rule-based scoring for deterministic core metrics and LLM-enhanced generation for creative content, trend analysis, and recommendation reasoning.

## LLM Integration Strategy

LLM is used strategically for operations where creativity and natural language generation add value:

| Operation | Method | Reason |
|-----------|--------|--------|
| Score calculation (sales_velocity, stock_movement, new_product_boost) | Rule-based | Deterministic, no creativity needed |
| Trend potential analysis | LLM-enhanced | Contextual analysis from signals |
| Recommendation reason | LLM-generated | Natural language explanation |
| Audience fit interpretation | LLM-enhanced | Segment-context matching |
| Creative content (hook, CTA, angle) | LLM | Creative generation |
| Prompt optimization | LLM | Platform-specific nuances |
| Iteration suggestions | LLM-enhanced | Metric-driven creativity |

## Responsibilities

- Read ERP/commerce/product data supplied by backend.
- Calculate scoring fields using rule-based logic for core metrics.
- Use LLM for trend analysis, recommendation reasoning, and creative content generation.
- Recommend a product or validate selected product.
- Extract or summarize audience data.
- Choose creative angle.
- Produce a structured creative brief.
- Execute provider network requests for live video generation when the selected flow requires direct provider submission.
- Return fallback notes when data is missing or weak.
- Keep outputs deterministic for identical inputs (with LLM fallback when unavailable).
- Track LLM usage through metadata for transparency.

## Inputs

Required inputs:

- Tenant context
- Product record
- Product metrics when available
- Campaign preferences when supplied

Optional inputs:

- Audience segments
- Trend signals
- Brand constraints
- Platform preference
- Language preference

## Outputs

Required outputs:

- Product id
- Recommendation selected flag
- Recommendation reason (LLM-generated or rule-based fallback)
- Hype score (rule-based weighted sum)
- Trend potential score (LLM-enhanced analysis)
- Sales velocity (rule-based)
- Stock movement (rule-based)
- New product boost (rule-based)
- Audience fit (LLM-enhanced or rule-based)
- Audience summary
- Creative angle
- Structured creative brief (LLM-generated content)
- Forbidden claims
- Fallback notes
- Metadata (llm_used, llm_available, generation_method, confidence)

Outputs must be JSON-compatible and must follow `docs/contracts/ai-behavior.contract.yaml`.

## Scoring Logic Placeholders

Starter scoring fields (rule-based):

- `hype_score`: combined score for current product advertising momentum (rule-based weighted sum).
- `trend_potential_score`: estimated trend fit based on available trend and category signals (LLM-enhanced).
- `sales_velocity`: recent sales movement from commerce data (rule-based threshold).
- `stock_movement`: stock sell-through or inventory opportunity signal (rule-based).
- `new_product_boost`: boost for products marked as new when appropriate (rule-based).
- `audience_fit`: fit between product and known audience segment (LLM-enhanced when segment data available).

Placeholder formula:

```text
hype_score = weighted_sum(
  sales_velocity (rule-based),
  stock_movement (rule-based),
  trend_potential_score (LLM-enhanced),
  new_product_boost (rule-based),
  audience_fit (LLM-enhanced)
)
```

Final weights are `TBD` and must be documented in the implementation task.

## LLM Configuration

Default LLM settings:

- Provider: codex/openai
- Model: gpt-4
- Temperature: 0.3-0.7 (low for consistency)
- Max tokens: 400-800
- Timeout: 20-30 seconds
- Retry attempts: 2
- Fallback: rule_based

## Deterministic Rules

- Rule-based scoring components must produce identical output for identical inputs.
- LLM-generated content may vary slightly but must be validated before acceptance.
- Scores must be bounded from 0 to 100 unless a later contract changes this.
- Missing score inputs must be marked unknown or use documented defaults.
- Recommendation tie-breakers must be explicit.
- LLM narrative must not override structured product facts.
- Output must include fallback notes for low-confidence fields.
- Metadata must always include llm_used flag.

## Must Not Do

- Must not invent product claims, prices, discounts, stock, guarantees, or shipping promises.
- Must not invent customer demographics.
- Must not store secrets or LLM API keys.
- Must not make frontend-specific rendering decisions.
- Must not hide missing data or LLM unavailability.
- Must not expose LLM configuration or internal prompts in outputs.

## Network Client Role

- MCP may act as a direct network client for AI video providers when the task contract explicitly enables live provider execution.
- Live provider requests must remain deterministic in payload shape and must use validated prompt payloads as input.
- Provider-specific response handling must preserve raw identifiers such as provider job ids or video urls in normalized output artifacts.
- Backend remains responsible for persistence, while MCP remains responsible for submission and response normalization when the network execution contract applies.

## Failure Behavior

- Missing required product: return structured failure.
- Missing metrics: return partial output with fallback notes.
- Invalid input shape: reject with validation error.
- Unsafe generated claim: remove or mark forbidden and return fallback note.
- LLM unavailable: use rule-based fallback with llm_used=false in metadata.
- LLM timeout/error: retry then fallback to rule-based; log in fallback_notes.
- Model unavailable: use deterministic mock intelligence only if demo fallback mode is enabled.

## Acceptance Criteria

- Produces valid structured output for mock product data.
- Does not fabricate unsupported facts.
- Provides clear reason for recommendation (LLM-generated or rule-based).
- Provides usable creative brief input to prompt compiler.
- Includes fallback notes for unknown fields.
- Includes metadata with llm_used flag reflecting actual generation method.
- Is testable with deterministic fixture inputs.

## LLM Usage Transparency

Every MCP output must include metadata that indicates:

```json
{
  "metadata": {
    "llm_used": true|false,
    "llm_available": true|false,
    "generation_method": "llm | rule_based | hybrid",
    "model_used": "gpt-4" | null,
    "confidence": "high | medium | low"
  }
}
```

This allows backend and frontend to:
- Show users whether AI-enhanced content was used
- Debug fallback behavior
- Track LLM vs rule-based usage patterns
- Make informed decisions about output confidence