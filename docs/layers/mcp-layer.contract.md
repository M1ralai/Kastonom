# MCP / AI Intelligence Layer Contract

## Purpose

The MCP / AI intelligence layer turns commerce data into structured creative decisions. It recommends what to promote, explains why, summarizes the audience, and produces a creative brief for prompt compilation.

## Responsibilities

- Read ERP/commerce/product data supplied by backend.
- Calculate scoring fields.
- Recommend a product or validate selected product.
- Extract or summarize audience data.
- Choose creative angle.
- Produce a structured creative brief.
- Return fallback notes when data is missing or weak.
- Keep outputs deterministic for identical inputs.

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
- Recommendation reason
- Hype score
- Trend potential score
- Sales velocity
- Stock movement
- New product boost
- Audience fit
- Audience summary
- Creative angle
- Structured creative brief
- Forbidden claims
- Fallback notes

Outputs must be JSON-compatible and must follow `docs/contracts/ai-behavior.contract.yaml`.

## Scoring Logic Placeholders

Starter scoring fields:

- `hype_score`: combined score for current product advertising momentum.
- `trend_potential_score`: estimated trend fit based on available trend and category signals.
- `sales_velocity`: recent sales movement from commerce data.
- `stock_movement`: stock sell-through or inventory opportunity signal.
- `new_product_boost`: boost for products marked as new when appropriate.
- `audience_fit`: fit between product and known audience segment.

Placeholder formula:

```text
hype_score = weighted_sum(
  sales_velocity,
  stock_movement,
  trend_potential_score,
  new_product_boost,
  audience_fit
)
```

Final weights are `TBD` and must be documented in the implementation task.

## Deterministic Rules

- Same input must produce same scores and creative brief fields.
- Scores must be bounded from 0 to 100 unless a later contract changes this.
- Missing score inputs must be marked unknown or use documented defaults.
- Recommendation tie-breakers must be explicit.
- LLM narrative must not override structured product facts.
- Output must include fallback notes for low-confidence fields.

## Must Not Do

- Must not invent product claims, prices, discounts, stock, guarantees, or shipping promises.
- Must not invent customer demographics.
- Must not call AI video provider APIs.
- Must not store secrets.
- Must not make frontend-specific rendering decisions.
- Must not hide missing data.

## Failure Behavior

- Missing required product: return structured failure.
- Missing metrics: return partial output with fallback notes.
- Invalid input shape: reject with validation error.
- Unsafe generated claim: remove or mark forbidden and return fallback note.
- Model unavailable: use deterministic mock intelligence only if demo fallback mode is enabled.

## Acceptance Criteria

- Produces valid structured output for mock product data.
- Does not fabricate unsupported facts.
- Provides clear reason for recommendation.
- Provides usable creative brief input to prompt compiler.
- Includes fallback notes for unknown fields.
- Is testable with deterministic fixture inputs.

