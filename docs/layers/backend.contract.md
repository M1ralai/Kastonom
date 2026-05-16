# Backend Layer Contract

## Purpose

The backend is the orchestration API for Kastonom. It connects frontend requests to product data, MCP / AI intelligence, prompt compilation, video job management, provider adapters, storage, and fallback behavior.

## Responsibilities

- Expose stable APIs to the frontend.
- Enforce tenant boundaries.
- Load product and product metric data.
- Call MCP / AI intelligence layer for recommendations and creative briefs.
- Call prompt compiler for provider-specific prompt payloads.
- Create and track campaign and video job records.
- Receive normalized provider results from the MCP network execution layer.
- Validate ProviderResult, JobID, Video_URL, and is_mock payloads before persistence.
- Persist provider results and generated video records.
- Provide deterministic mock fallback for demos.
- Fail closed on missing live-provider configuration.

## Must Not Do

- Must not expose provider API keys to frontend.
- Must not bypass tenant scope.
- Must not call live providers when required credentials are missing.
- Must not invent AI intelligence output.
- Must not silently replace live provider failure with mock result unless fallback mode is enabled and labeled.
- Must not store secrets in logs or database records.

## Core Modules

### product.service

- Loads products and metrics.
- Applies tenant filtering.
- Provides mock ERP/product data in demo mode.

### campaign.service

- Creates campaign records.
- Coordinates product selection, intelligence output, creative brief, and prompt payload.
- Owns campaign status transitions.

### video-job.service

- Creates video jobs.
- Tracks status.
- Stores normalized provider result or normalized errors.
- Supports polling by frontend.

### mcp-network-result.service

- Validates normalized MCP network output.
- Persists VideoJob, ProviderResult, and GeneratedVideo records.
- Applies backend-side persistence rules for live and mock outcomes.

### mcp-client.service

- Sends structured product and metric input to MCP / AI intelligence layer.
- Validates structured output.
- Rejects unsafe or invalid AI output.

### prompt-handoff.service

- Receives compiled PromptPayload artifacts from MCP.
- Passes validated prompt payloads to the MCP network execution result flow.
- Keeps provider-specific transport details outside backend orchestration.

## Implementation Planning Docs

Detailed backend planning artifacts live in:

- `docs/backend/backend-system-plan.md`
- `docs/backend/backend-subtask-plan.md`
- `docs/backend/tasks/*.contract.yaml`

Future backend implementation tasks should start from those files, then verify behavior against this layer contract and the API/data/AI contracts.

## API Responsibilities

The backend must implement or later route:

- `GET /health`
- `GET /products`
- `POST /campaigns/generate`
- `GET /video-jobs/{id}`
- `GET /demo/fallback`

Responses must follow `docs/contracts/api.contract.yaml`.

## Provider Adapter Rules

- Backend must not issue live provider HTTP requests directly.
- MCP network execution is responsible for provider submission.
- Backend must accept normalized provider results and store them safely.
- Provider-specific fields must not leak into frontend contracts unless explicitly allowed.
- Missing credentials must produce a configuration error in MCP execution or a rejected persistence payload in backend.
- Mock outcomes must be deterministic and clearly marked.

Supported provider adapter names:

- `PolloPromptAdapter`
- `KlingPromptAdapter`
- `RunwayPromptAdapter`
- `MockPromptAdapter`

## Failure Behavior

- Missing tenant: return tenant/auth error.
- Missing product: return not found.
- Missing live provider config: fail closed at MCP execution boundary.
- Provider timeout: mark job failed or use labeled fallback when enabled.
- Invalid MCP / AI output: reject output and return error or fallback reason.
- Missing mock fallback asset: return explicit fallback failure.

## Acceptance Criteria

- Frontend can complete the demo using backend APIs.
- Backend does not require live provider credentials in mock mode.
- Live provider mode fails closed without required credentials.
- Video jobs can be created and polled.
- Provider failures are normalized and visible.
- Tenant-scoped data is never returned across tenants.
