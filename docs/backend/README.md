# Backend Planning Index

This directory contains the implementation planning artifacts for the Kastonom backend workstream.

Use these files before creating backend code:

- `docs/backend/backend-system-plan.md`: full backend system design, runtime modes, module boundaries, request flows, failure behavior, storage plan, provider strategy, ad platform boundaries, and test approach.
- `docs/backend/backend-subtask-plan.md`: ordered backend implementation breakdown with dependencies, expected outputs, and demo value.
- `docs/backend/tasks/*.contract.yaml`: task contracts that can be assigned one by one to future implementation agents.

Source contracts that still remain authoritative:

- `docs/project-brief.md`
- `docs/architecture.md`
- `docs/contracts/mvp.contract.yaml`
- `docs/contracts/api.contract.yaml`
- `docs/contracts/data-model.contract.yaml`
- `docs/layers/backend.contract.md`
- `docs/layers/integration-flow.md`
- `docs/prompts/prompt-compiler.contract.md`

Current backend model direction:

- `docs/contracts/data-model.contract.yaml` version `0.2.0` is the latest data model.
- Backend planning must use `CreativeProject`, `CreativeSubject`, `SourceAsset`, `GenerationRequest`, `PromptPayload`, `VideoJob`, `ProviderResult`, `GeneratedVideo`, `AdPlatformConnection`, `AdPublication`, `AdMetricsSnapshot`, and `CreativeIterationSuggestion`.
- Deprecated commerce entities such as `Product`, `ProductMetric`, `AudienceSegment`, `Campaign`, and `CreativeBrief` must not be used for new backend implementation tasks.
- MCP is owned by a separate teammate/workstream. Backend tasks must not create MCP services, MCP mocks, model prompts, intelligence logic, scoring logic, AI validators, or files such as `backend/src/mcp/**`.

Planning assumptions:

- The backend starts in deterministic mock mode for local development and demo safety.
- Live video provider calls are disabled until a task explicitly enables them and complete provider configuration exists.
- Ad publication to Meta Ads or Google Ads requires explicit user action and complete platform configuration.
- Tenant scope is enforced even in demo mode through a fixed demo tenant context.
- The frontend continues to present data only. It does not generate prompts, call video providers, or call ad platform publishing APIs directly.
- Backend may only integrate with MCP through a future externally provided contract/client boundary. That integration is not part of these backend tasks unless a later contract explicitly adds it.
