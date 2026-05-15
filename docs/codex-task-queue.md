# Codex Task Queue

This queue is the default implementation order for Kastonom. Each task should be converted into a concrete task contract before implementation.

## Task 0: Repository Analysis

- **Goal:** Inspect the existing repository and identify framework, package manager, scripts, and current files.
- **Layer:** cross-layer
- **Inputs:** repository files, `AGENTS.md`, docs contracts
- **Allowed files:** documentation notes only, unless explicitly asked to edit
- **Acceptance criteria:** Agent reports current structure, available commands, and safe next step.
- **Test command placeholder:** `TBD`

## Task 1: Documentation Scaffold

- **Goal:** Create or update repository-level documentation and contracts.
- **Layer:** docs
- **Inputs:** product brief, architecture requirements, contract requirements
- **Allowed files:** `AGENTS.md`, `docs/**`
- **Acceptance criteria:** All requested docs and YAML contracts exist and parse where applicable.
- **Test command placeholder:** `TBD`

## Task 2: Project Skeleton

- **Goal:** Create minimal app structure without implementing full business logic.
- **Layer:** cross-layer
- **Inputs:** architecture docs, MVP contract
- **Allowed files:** `TBD after framework selection`
- **Acceptance criteria:** Project can install and start locally with placeholder screens/routes.
- **Test command placeholder:** `TBD`

## Task 3: Core Data Model

- **Goal:** Define data types, fixtures, and persistence boundary for products, metrics, campaigns, briefs, jobs, and provider results.
- **Layer:** backend
- **Inputs:** `docs/contracts/data-model.contract.yaml`
- **Allowed files:** backend model files, fixture files, tests
- **Acceptance criteria:** Models match contract and mock fixture data can load deterministically.
- **Test command placeholder:** `TBD`

## Task 4: API Layer

- **Goal:** Implement stable backend API endpoints.
- **Layer:** backend
- **Inputs:** `docs/contracts/api.contract.yaml`
- **Backend planning inputs:** `docs/backend/backend-system-plan.md`, `docs/backend/backend-subtask-plan.md`, `docs/backend/tasks/BE-005-product-api.contract.yaml`, `docs/backend/tasks/BE-006-campaign-generation-orchestrator.contract.yaml`, `docs/backend/tasks/BE-010-video-job-lifecycle-polling.contract.yaml`, `docs/backend/tasks/BE-011-demo-fallback-endpoint.contract.yaml`
- **Allowed files:** backend routes/controllers/services, API tests
- **Acceptance criteria:** `/health`, `/products`, `/campaigns/generate`, `/video-jobs/{id}`, and `/demo/fallback` behave as contracted.
- **Test command placeholder:** `TBD`

## Task 5: MCP Intelligence Layer

- **Goal:** Implement product scoring, audience summary, recommendation, and creative brief generation.
- **Layer:** mcp_ai
- **Inputs:** `docs/contracts/ai-behavior.contract.yaml`, `docs/layers/mcp-layer.contract.md`
- **Allowed files:** MCP/AI service files, scoring utilities, tests
- **Acceptance criteria:** Outputs are deterministic, JSON-compatible, and do not invent missing facts.
- **Test command placeholder:** `TBD`

## Task 6: Prompt Compiler

- **Goal:** Convert structured creative briefs into provider-specific prompt payloads.
- **Layer:** prompt_compiler
- **Inputs:** `docs/prompts/prompt-compiler.contract.md`, `docs/prompts/creative-brief.template.yaml`
- **Allowed files:** prompt compiler files, adapter files, tests
- **Acceptance criteria:** Mock, Pollo, Kling, and Runway adapter outputs follow contract shape.
- **Test command placeholder:** `TBD`

## Task 7: AI Provider Adapter

- **Goal:** Implement provider adapter boundary and mock provider fallback.
- **Layer:** backend
- **Inputs:** MVP contract fallback behavior, API contract, prompt compiler contract
- **Backend planning inputs:** `docs/backend/tasks/BE-009-provider-adapter-boundary-mock-provider.contract.yaml`, `docs/backend/tasks/BE-012-error-handling-observability.contract.yaml`
- **Allowed files:** provider adapter files, video job service files, tests
- **Acceptance criteria:** Missing live config fails closed; mock provider can complete demo flow.
- **Test command placeholder:** `TBD`

## Backend Planning Artifacts

The backend workstream is now broken into detailed implementation contracts:

- `BE-000`: Contract cleanup for backend-blocking data model gaps.
- `BE-001`: Backend runtime skeleton.
- `BE-002`: Configuration and mode guardrails.
- `BE-003`: Tenant context and request guard.
- `BE-004`: Data models, fixtures, and repositories.
- `BE-005`: Product API.
- `BE-006`: Campaign generation orchestrator.
- `BE-007`: MCP client and AI validation.
- `BE-008`: Prompt compiler backend integration.
- `BE-009`: Provider adapter boundary and mock provider.
- `BE-010`: Video job lifecycle and polling.
- `BE-011`: Demo fallback endpoint.
- `BE-012`: Error handling, logging, and secret redaction.
- `BE-013`: Backend contract test suite.

Use `docs/backend/backend-subtask-plan.md` as the default backend implementation order.

## Task 8: Frontend Demo Flow

- **Goal:** Build creative console screens for the 3-minute demo.
- **Layer:** frontend
- **Inputs:** `docs/layers/frontend.contract.md`, API contract, demo script
- **Allowed files:** frontend pages/components/styles/tests
- **Acceptance criteria:** Dashboard, product insight, creative brief, job status, and ad preview are demoable.
- **Test command placeholder:** `TBD`

## Task 9: Tests

- **Goal:** Add focused tests for contracts, fallback behavior, and demo flow.
- **Layer:** cross-layer
- **Inputs:** all contracts
- **Allowed files:** test files, test fixtures, minimal code changes needed for testability
- **Acceptance criteria:** Core tests pass locally and cover fail-closed paths.
- **Test command placeholder:** `TBD`

## Task 10: README and Demo Polish

- **Goal:** Prepare final hackathon run instructions and demo notes.
- **Layer:** docs
- **Inputs:** implemented app behavior, demo script, known limitations
- **Allowed files:** `README.md`, `docs/**`, demo assets if already part of project
- **Acceptance criteria:** A new judge or teammate can run the demo from README instructions.
- **Test command placeholder:** `TBD`
