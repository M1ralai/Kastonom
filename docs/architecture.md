# Kastonom Architecture

## Architecture Summary

Kastonom has three layers:

- **Frontend presents.**
- **Backend orchestrates.**
- **MCP / AI layer decides with LLM enhancement.**

The prompt compiler converts a structured creative brief into provider-specific video prompts. The frontend never generates prompts and never calls AI video providers directly.

## LLM Integration Strategy

Kastonom uses a hybrid approach for AI intelligence:

- **Rule-based processing** for deterministic core scoring (sales velocity, stock movement, product boost)
- **LLM-enhanced processing** for creative content, trend analysis, and natural language generation
- **Rule-based fallback** when LLM is unavailable or fails

This approach provides:
- Consistent, reproducible scoring for product recommendation
- Creative, natural language output for marketing content
- Graceful degradation when AI services are unavailable

## System Components

- Frontend creative console
- Backend orchestration API
- MCP / AI intelligence module with LLM clients
- Prompt compiler with LLM optimization
- Provider adapters
- Database or local persistence
- Mock ERP/product fixtures
- Mock video provider fallback

## Frontend Layer

Responsibilities:

- Display product list and scoring signals.
- Show selected product insights.
- Show generated audience summary.
- Show creative brief preview.
- Start campaign generation by calling backend APIs.
- Poll video job status.
- Display final ad preview or fallback preview.

Boundaries:

- Must not generate prompts directly.
- Must not call external AI video APIs directly.
- Must not decide product recommendation logic.

## Backend Layer

Responsibilities:

- Expose stable APIs to the frontend.
- Enforce auth and tenant boundaries.
- Load product and metric data.
- Call MCP / AI intelligence layer for creative decisions.
- Call prompt compiler for provider-specific prompts.
- Create and track video jobs.
- Call external AI video providers through provider adapters.
- Store provider results and fallback state.

Boundaries:

- Must fail closed on missing configuration.
- Must not bypass tenant scope.
- Must not invent AI outputs.

## MCP / AI Intelligence Layer

Responsibilities:

- Read ERP/commerce/product inputs.
- Calculate hype score and trend potential (LLM-enhanced).
- Extract audience summary.
- Choose creative angle (LLM-generated).
- Produce structured creative brief (LLM-generated content).
- Use LLM for trend analysis and recommendation reasoning.
- Return explicit fallback reasons when data is missing.
- Track LLM usage through metadata for transparency.

Boundaries:

- Must prefer deterministic behavior for core scoring.
- Must not invent missing product claims, stock, prices, guarantees, discounts, or demographics.
- Must return structured JSON-compatible outputs.
- Must include llm_used flag in metadata.

LLM-Enhanced Operations:

| Operation | Method | Rationale |
|-----------|--------|-----------|
| Sales velocity calculation | Rule-based | Threshold-based, deterministic |
| Stock movement calculation | Rule-based | Heuristic-based, deterministic |
| New product boost | Rule-based | Conditional logic, deterministic |
| Trend potential analysis | LLM | Contextual interpretation |
| Recommendation reason | LLM | Natural language generation |
| Audience fit | LLM | Segment-context matching |
| Creative hook/CTA | LLM | Creative generation |
| Prompt optimization | LLM | Platform-specific nuances |

## LLM Client Architecture

```
mcp/
└── src/
    └── llm/
        ├── llm-client.ts         # Base LLM client with retry/timeout
        ├── trend-llm-client.ts  # Trend analysis
        ├── reason-llm-client.ts  # Recommendation reason
        ├── brief-llm-client.ts   # Creative brief content
        └── prompt-llm-client.ts  # Prompt optimization
```

LLM Client Requirements:
- Retry logic with configurable attempts
- Timeout handling (default 20-30 seconds)
- Response validation before acceptance
- Forbidden content detection
- Fallback to rule-based on failure

## Database

MVP persistence may be one of:

- In-memory store for local demo
- Local JSON fixtures
- Lightweight SQL database

The selected persistence approach must support:

- Products
- Product metrics
- Audience segments
- Campaigns
- Creative briefs
- Video jobs
- Provider results
- LLM usage metadata

## External Services

Potential external AI video providers:

- Pollo
- Kling
- Runway
- Mock provider

LLM Provider:

- Codex/OpenAI (for creative intelligence)

Live provider calls are executed by the MCP network execution layer when enabled by contract. Backend receives normalized results and persists them into the internal video job contract.

## Data Flow

1. ERP/product data is loaded from mock fixtures or an integration.
2. Backend exposes products to frontend.
3. User selects or generates a campaign for a product.
4. Backend calls MCP / AI intelligence layer.
5. MCP layer calculates scores (rule-based) and generates insights (LLM-enhanced):
   - Core scores: sales_velocity, stock_movement, new_product_boost (rule-based)
   - LLM-enhanced: trend_potential, recommendation_reason, audience_fit
6. MCP layer returns recommendation, audience summary, and creative brief (LLM-generated).
7. Prompt compiler creates provider-specific prompt payload (LLM-optimized).
8. MCP network execution layer submits the prompt payload to the selected live provider or mock provider.
9. Backend receives the normalized ProviderResult / JobID response and creates or updates the video job record.
10. Frontend polls job status.
11. Frontend displays final ad preview or fallback preview.
12. Response includes metadata with llm_used flag.

## Error Handling

- Missing required config: fail closed with clear error.
- Missing optional data: continue only when a documented fallback exists.
- LLM unavailable: use rule-based fallback, set llm_used=false.
- LLM timeout/error: retry then fallback, log in fallback_notes.
- Provider unavailable: use mock provider only if demo fallback mode is enabled.
- Invalid AI output: reject output and return fallback reason.
- Unknown tenant or unauthorized access: return authorization error without data leakage.

## Security Assumptions

- API keys are provided through environment variables.
- No secrets are committed to the repository.
- Tenant IDs are required for tenant-scoped data.
- Provider credentials are only used by the backend.
- LLM API keys are only used by MCP layer, never exposed in outputs.
- Logs must not include secrets, raw provider credentials, or LLM API keys.

## Demo Fallback Mode

Fallback mode must allow the full demo to run without live ERP, LLM, or video provider APIs. It may use:

- Mock product data
- Mock scoring outputs (rule-based, deterministic)
- Mock creative brief generation
- Mock video job status transitions
- Mock provider network execution results
- Static demo ad preview asset or placeholder result

Fallback data must be clearly marked as demo/mock data in internal contracts.
LLM usage must be reflected in metadata as llm_used=false.

## LLM Configuration

Default LLM settings for all MCP modules:

```yaml
llm_configuration:
  provider: "codex/openai"
  model: "gpt-4"
  temperature: 0.3-0.7
  max_tokens: 400-800
  timeout_ms: 20000-30000
  retry_attempts: 2
  fallback_to_rule_based: true
```

## Future Expansion

Potential post-MVP expansion:

- Live ERP and commerce connectors
- Provider webhooks
- Campaign history
- Brand voice profiles
- Multi-platform prompt variants
- A/B creative generation
- Performance feedback loop
- Human approval workflow
- Additional LLM providers
- LLM prompt templates for different creative styles