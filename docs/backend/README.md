# Backend Planning Index

This directory contains the implementation planning artifacts for the Kastonom backend workstream.

Use these files before creating backend code:

- `docs/backend/backend-system-plan.md`: full backend system design, runtime modes, module boundaries, request flows, failure behavior, storage plan, provider strategy, and test approach.
- `docs/backend/backend-subtask-plan.md`: ordered backend implementation breakdown with dependencies, expected outputs, and demo value.
- `docs/backend/tasks/*.contract.yaml`: task contracts that can be assigned one by one to future implementation agents.

Source contracts that still remain authoritative:

- `docs/project-brief.md`
- `docs/architecture.md`
- `docs/contracts/mvp.contract.yaml`
- `docs/contracts/api.contract.yaml`
- `docs/contracts/data-model.contract.yaml`
- `docs/contracts/ai-behavior.contract.yaml`
- `docs/layers/backend.contract.md`
- `docs/layers/integration-flow.md`
- `docs/prompts/prompt-compiler.contract.md`
- `docs/prompts/creative-brief.template.yaml`

Planning assumptions:

- The backend starts in deterministic mock mode for local development and demo safety.
- Live provider calls are disabled until a task explicitly enables them and complete provider configuration exists.
- Tenant scope is enforced even in demo mode through a fixed demo tenant context.
- The frontend continues to present data only. It does not generate prompts or call providers.
- The MCP / AI layer continues to own product recommendation, audience summary, scoring, and creative brief generation.

