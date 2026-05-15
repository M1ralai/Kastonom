# Kastonom Architecture

## Architecture Summary

Kastonom has three layers:

- **Frontend presents.**
- **Backend orchestrates.**
- **MCP / AI layer decides.**

The prompt compiler converts a structured creative brief into provider-specific video prompts. The frontend never generates prompts and never calls AI video providers directly.

## System Components

- Frontend creative console
- Backend orchestration API
- MCP / AI intelligence module or service
- Prompt compiler
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
- Call MCP / AI intelligence layer.
- Call prompt compiler.
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
- Calculate hype score and trend potential.
- Extract audience summary.
- Choose creative angle.
- Produce structured creative brief.
- Return explicit fallback reasons when data is missing.

Boundaries:

- Must prefer deterministic behavior.
- Must not invent missing product claims, stock, prices, guarantees, discounts, or demographics.
- Must return structured JSON-compatible outputs.

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

Production database selection is out of scope for the initial scaffold.

## External Services

Potential external AI video providers:

- Pollo
- Kling
- Runway
- Mock provider

Provider calls must go through backend provider adapters. Each adapter must normalize request and response data into the internal video job contract.

## Data Flow

1. ERP/product data is loaded from mock fixtures or an integration.
2. Backend exposes products to frontend.
3. User selects or generates a campaign for a product.
4. Backend calls MCP / AI intelligence layer.
5. MCP layer returns recommendation, audience summary, and creative brief.
6. Prompt compiler creates provider-specific prompt payload.
7. Backend creates a video job.
8. Backend sends the job to a live provider or mock provider.
9. Frontend polls job status.
10. Frontend displays final ad preview or fallback preview.

## Error Handling

- Missing required config: fail closed with clear error.
- Missing optional data: continue only when a documented fallback exists.
- Provider unavailable: use mock provider only if demo fallback mode is enabled.
- Invalid AI output: reject output and return fallback reason.
- Unknown tenant or unauthorized access: return authorization error without data leakage.

## Security Assumptions

- API keys are provided through environment variables.
- No secrets are committed to the repository.
- Tenant IDs are required for tenant-scoped data.
- Provider credentials are only used by the backend.
- Logs must not include secrets or raw provider credentials.

## Demo Fallback Mode

Fallback mode must allow the full demo to run without live ERP or video provider APIs. It may use:

- Mock product data
- Mock scoring outputs
- Mock creative brief generation
- Mock video job status transitions
- Static demo ad preview asset or placeholder result

Fallback data must be clearly marked as demo/mock data in internal contracts.

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

