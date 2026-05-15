# Backend Subtask Plan

## Goal

This plan turns the backend system design into implementation-sized tasks. Each task has a matching YAML contract under `docs/backend/tasks/`.

The order is designed for a hackathon MVP: get a deterministic mock demo path working first, then harden failure behavior, then add live provider readiness without risking the fallback demo.

## Workstream Dependency Graph

```text
BE-000 Contract Cleanup
  -> BE-001 Backend Skeleton
    -> BE-002 Config and Modes
      -> BE-003 Tenant Context
        -> BE-004 Data Repositories and Fixtures
          -> BE-005 Product API
          -> BE-006 Campaign Orchestrator
            -> BE-007 MCP Client and AI Validation
            -> BE-008 Prompt Compiler Integration
            -> BE-009 Provider Adapters and Mock Provider
              -> BE-010 Video Job Lifecycle
                -> BE-011 Demo Fallback Endpoint
                  -> BE-012 Error Handling and Observability
                    -> BE-013 Backend Contract Test Suite
```

Some tasks can run in parallel after their prerequisites:

- `BE-007`, `BE-008`, and `BE-009` can be developed in parallel if their interfaces are agreed.
- `BE-012` can start after `BE-002` and grow as endpoints are added.
- `BE-013` can start once the skeleton test harness exists.

## Phase 0: Contract Cleanup

### BE-000: Backend Contract Cleanup

Purpose:

- Fix documentation contradictions before implementation.
- Add missing backend model fields needed for scoring and tenant-safe persistence.

Why it matters:

- Implementation agents should not guess whether `Product.description` is required.
- Product scoring needs a concrete `ProductMetric` shape.
- API and data model contracts should agree before tests encode behavior.

Primary outputs:

- Updated data model contract.
- Updated API notes if needed.
- A short migration note for implementation agents.

## Phase 1: Runtime Foundation

### BE-001: Backend Runtime Skeleton

Purpose:

- Create the backend project structure, server entry, app factory, basic health route, and test harness.

Demo value:

- Teammates can run a backend process and see a health response.

### BE-002: Configuration and Mode Guardrails

Purpose:

- Centralize environment parsing, mode selection, fallback policy, provider defaults, and provider credential readiness.

Demo value:

- Local development is safe by default in mock mode.
- Missing live provider config fails closed instead of breaking unpredictably.

### BE-003: Tenant Context and Request Guard

Purpose:

- Resolve tenant id and request context for every tenant-scoped endpoint.
- Prevent cross-tenant data leakage from the beginning.

Demo value:

- Demo mode can use a fixed demo tenant while keeping the architecture honest.

## Phase 2: Data Foundation

### BE-004: Data Models, Fixtures, and Repository Boundary

Purpose:

- Define typed data models, demo fixtures, in-memory repositories, deterministic id and clock helpers.

Demo value:

- The backend can serve real-looking data without external systems.

### BE-005: Product API

Purpose:

- Implement `GET /products` using tenant-scoped product service and fallback behavior.

Demo value:

- Frontend can render the dashboard from backend data.

## Phase 3: Campaign Generation

### BE-006: Campaign Generation Orchestrator

Purpose:

- Implement `POST /campaigns/generate` as the main orchestration workflow.

Demo value:

- One endpoint can turn a selected product into campaign output and a video job.

### BE-007: MCP Client and AI Output Validation

Purpose:

- Add the boundary to the MCP / AI layer and validate that outputs do not fabricate facts.

Demo value:

- The creative brief can be trusted as structured, bounded, and fallback-aware.

### BE-008: Prompt Compiler Backend Integration

Purpose:

- Connect validated creative briefs to the prompt compiler and store normalized prompt payloads.

Demo value:

- The system proves that prompt generation is backend-controlled and traceable.

### BE-009: Provider Adapter Boundary and Mock Provider

Purpose:

- Add provider adapter interfaces and the deterministic mock provider.

Demo value:

- The full demo works with no live provider credentials.

## Phase 4: Job Tracking and Demo Fallback

### BE-010: Video Job Lifecycle and Polling

Purpose:

- Implement video job persistence, status transitions, normalized provider results, and `GET /video-jobs/{id}`.

Demo value:

- Frontend can poll job status and show final preview state.

### BE-011: Demo Fallback Endpoint and Replay Payload

Purpose:

- Implement `GET /demo/fallback` with a complete deterministic sample flow.

Demo value:

- A judge can still see the product-to-ad-preview story if any upstream piece is unavailable.

## Phase 5: Hardening

### BE-012: Error Handling, Logging, and Secret Redaction

Purpose:

- Standardize API errors, request ids, safe logs, provider error normalization, and no-secret behavior.

Demo value:

- Failures are explainable and safe.

### BE-013: Backend Contract Test Suite

Purpose:

- Add unit, integration, and contract tests for mock flow, fail-closed behavior, tenant isolation, and no-fabrication rules.

Demo value:

- The team can prove the MVP behavior quickly before presenting.

## Recommended First Sprint

For the next coding sprint, do these in order:

1. `BE-000`
2. `BE-001`
3. `BE-002`
4. `BE-003`
5. `BE-004`
6. `BE-005`

That sequence gives a safe backend foundation and a visible dashboard data path.

## Recommended Demo Sprint

For the sprint that makes the demo end-to-end:

1. `BE-006`
2. `BE-007`
3. `BE-008`
4. `BE-009`
5. `BE-010`
6. `BE-011`

That sequence makes the core Kastonom story visible: product data becomes a structured brief and then a mock video job.

## Recommended Hardening Sprint

Before final demo:

1. `BE-012`
2. `BE-013`
3. Re-run the frontend demo flow against backend mock mode.
4. Confirm live provider mode fails closed without credentials.

## Completion Checklist

- Backend starts in mock mode.
- `GET /health` works.
- `GET /products` returns tenant-scoped demo data.
- `POST /campaigns/generate` returns campaign, creative brief, prompt payload, and video job.
- `GET /video-jobs/{id}` returns job state without cross-tenant leakage.
- `GET /demo/fallback` returns deterministic fallback flow.
- Mock provider output is clearly marked.
- Missing live provider config fails closed.
- Tests cover demo flow, tenant isolation, and fail-closed provider behavior.

