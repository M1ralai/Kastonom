# Backend Layer Contract

## Purpose

The backend is the orchestration API for Kastonom. It connects frontend requests to tenant-scoped creative projects, user-provided visual assets, creative subject facts, prompt compilation, video job management, generated video selection, ad publication, metrics snapshots, metric-informed iteration suggestions, provider adapters, storage, and fallback behavior.

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
- Fail closed on missing live-provider or ad-platform configuration.

## Must Not Do

- Must not expose provider API keys, ad platform tokens, or connector secrets to frontend.
- Must not bypass tenant scope.
- Must not call live video providers when required credentials are missing.
- Must not publish ads without explicit user action.
- Must not invent product or subject facts, prices, discounts, guarantees, stock, shipping promises, audience demographics, platform metrics, or provider state.
- Must not silently replace live provider failure with mock result unless fallback mode is enabled and labeled.
- Must not store secrets in logs or database records.

## Core Modules

### creative-project.service

- Creates and reads tenant-scoped creative projects.
- Stores the advertised `CreativeSubject`.
- Stores and validates `SourceAsset` references.
- Owns project-level status changes such as `draft`, `generating`, `ready`, `published`, `archived`, and `failed`.

### generation-request.service

- Validates user-provided generation settings.
- Creates `GenerationRequest` records.
- Coordinates prompt compilation, video job creation, and generated video records.
- Keeps user input separate from backend-compiled prompt text.

### prompt-compiler.service

- Converts `CreativeSubject`, selected `SourceAsset` records, and `GenerationRequest` settings into a `PromptPayload`.
- Preserves forbidden claims, negative instructions, fallback notes, source asset references, language, duration, and aspect ratio.

### video-job.service

- Creates video jobs.
- Tracks status.
- Stores normalized provider result or normalized errors.
- Supports polling by frontend.

### mcp-network-result.service

- Validates normalized MCP network output.
- Persists VideoJob, ProviderResult, and GeneratedVideo records.
- Applies backend-side persistence rules for live and mock outcomes.

### generated-video.service

- Lists and selects generated videos by tenant.
- Updates `CreativeProject.selected_generated_video_id`.
- Prevents selection or publication of videos outside tenant scope.

### ad-publication.service

- Validates explicit user publication action.
- Checks ad platform connection readiness.
- Creates and tracks `AdPublication` records.
- Stores normalized publication errors without secrets.

### metrics.service

- Stores `AdMetricsSnapshot` records from mock, manual, Meta Ads, or Google Ads sources.
- Does not invent performance metrics.

### iteration-suggestion.service

- Stores `CreativeIterationSuggestion` records when suggestion content is supplied by an external owner or a deterministic demo fixture.
- Uses stored metrics snapshots and project context only as persisted references.
- Creates a new `GenerationRequest` when an accepted suggestion is generated; it does not mutate old requests.
- Must not generate suggestion content, model prompts, scoring, or MCP behavior inside backend.

### MCP Ownership Boundary

- MCP is a separate workstream owned outside backend.
- Backend tasks must not create `backend/src/mcp/**`, MCP services, MCP mocks, AI validators, model prompts, scoring logic, or suggestion-generation logic.
- A later explicit integration contract may define how backend calls an externally implemented MCP service.

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
- `POST /creative-projects`
- `GET /creative-projects/{id}`
- `POST /generation-requests`
- `GET /video-jobs/{id}`
- `POST /generated-videos/{id}/select`
- `POST /ad-publications`
- `POST /ad-publications/{id}/metrics/sync`
- `POST /creative-iteration-suggestions`
- `GET /demo/fallback`

Responses must follow `docs/contracts/api.contract.yaml`.

## Provider Adapter Rules

- Backend must not issue live provider HTTP requests directly.
- MCP network execution is responsible for provider submission.
- Backend must accept normalized provider results and store them safely.
- Provider-specific fields must not leak into frontend contracts unless explicitly allowed.
- Missing credentials must produce a configuration error in MCP execution or a rejected persistence payload in backend.
- Mock outcomes must be deterministic and clearly marked.

Supported video provider adapter names:

- `PolloPromptAdapter`
- `KlingPromptAdapter`
- `RunwayPromptAdapter`
- `MockPromptAdapter`

## Ad Platform Rules

- Publication requires explicit user action.
- Meta Ads and Google Ads integrations must go through backend adapters.
- Ad platform tokens and secrets must not be stored in the data model.
- Missing platform configuration or required scopes must fail closed.
- Mock/manual metrics must be labeled by source.

## Failure Behavior

- Missing tenant: return tenant/auth error.
- Missing product: return not found.
- Missing live provider config: fail closed at MCP execution boundary.
- Provider timeout: mark job failed or use labeled fallback when enabled.
- Invalid externally supplied suggestion or intelligence payload: reject output and return error or fallback reason without implementing MCP logic.
- Missing mock fallback asset: return explicit fallback failure.

## Acceptance Criteria

- Frontend can complete the demo using backend APIs and mock provider output.
- Backend does not require live video provider credentials in mock mode.
- Live provider mode fails closed without required credentials.
- Generated videos can be created, polled, selected, and clearly labeled as mock or live.
- Ad publication never happens without explicit user action and readiness checks.
- Provider and ad platform failures are normalized and visible.
- Tenant-scoped data is never returned across tenants.
