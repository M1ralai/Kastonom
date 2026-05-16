# Backend Subtask Plan

## Goal

This plan turns the backend system design into implementation-sized tasks. Each task has a matching YAML contract under `docs/backend/tasks/`.

The order is designed for a hackathon MVP after the data model `0.2.0` update: get a deterministic creative-project-to-generated-video path working first, then add selection, publication, metrics, iteration, and hardening without risking the fallback demo.

## Workstream Dependency Graph

```text
BE-000 Contract Alignment
  -> BE-001 Backend Skeleton
    -> BE-002 Config and Modes
      -> BE-003 Tenant Context
        -> BE-004 Data Repositories and Fixtures
          -> BE-005 Creative Project and Asset API
            -> BE-006 Generation Request Orchestrator
              -> BE-007 MCP Out-of-Scope Guardrail
              -> BE-008 Prompt Compiler Integration
              -> BE-009 Provider Adapters and Mock Provider
                -> BE-010 Video Job Lifecycle
                  -> BE-011 Demo Replay Endpoint
                    -> BE-012 Error Handling and Observability
                      -> BE-013 Backend Contract Test Suite
```

Some tasks can run in parallel after their prerequisites:

- `BE-008` and `BE-009` can be developed in parallel if their interfaces are agreed.
- `BE-012` can start after `BE-002` and grow as endpoints are added.
- `BE-013` can start once the skeleton test harness exists.
- Ad publication and metric sync can be implemented inside `BE-004`, `BE-012`, and `BE-013` as mock-safe repository/API coverage, then expanded by later contracts if live ad platform calls become a priority.

## Phase 0: Contract Alignment

### BE-000: Backend Contract Alignment

Purpose:

- Align backend planning with `docs/contracts/data-model.contract.yaml` version `0.2.0`.
- Remove stale implementation assumptions around `Product`, `ProductMetric`, `AudienceSegment`, `Campaign`, `CreativeBrief`, product scoring, and ERP decision support.
- Identify remaining non-backend contracts that still mention deprecated commerce flows.

Why it matters:

- Implementation agents should not build the old product recommendation API after the data model moved to creative projects and user-provided source assets.
- Prompt generation must be backend-controlled and traceable through `PromptPayload`.
- Publication and metric iteration must remain explicit, tenant-scoped, and safe.

Primary outputs:

- Updated backend planning docs and task contracts.
- Updated API, backend layer, integration, AI behavior, and prompt compiler contracts when needed.
- A short note of any upstream contracts still requiring a separate product-level rewrite.

## Phase 1: Runtime Foundation

### BE-001: Backend Runtime Skeleton

Purpose:

- Create the backend project structure, server entry, app factory, basic health route, and test harness.

Demo value:

- Teammates can run a backend process and see a health response.

### BE-002: Configuration and Mode Guardrails

Purpose:

- Centralize environment parsing, mode selection, fallback policy, video provider defaults, ad platform readiness, and credential safety.

Demo value:

- Local development is safe by default in mock mode.
- Missing live provider or ad platform config fails closed instead of breaking unpredictably.

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
- Cover all entities in the latest data model needed by the backend.

Demo value:

- The backend can serve and replay a complete creative workflow without external systems.

### BE-005: Creative Project and Asset API

Purpose:

- Implement project creation and read endpoints for `CreativeProject`, `CreativeSubject`, and `SourceAsset` records.

Demo value:

- Frontend can start a creative workflow from user-provided subject facts and visual references.

## Phase 3: Video Generation

### BE-006: Generation Request Orchestrator

Purpose:

- Implement the backend workflow that turns a project, subject, source assets, and generation settings into a prompt payload, video job, provider result, and generated video variants.

Demo value:

- One endpoint can turn user-provided creative inputs into generated video candidates.

### BE-007: MCP Out-of-Scope Guardrail

Purpose:

- Make it explicit that MCP is owned by a separate teammate/workstream.
- Prevent backend implementation agents from creating MCP services, MCP mocks, model prompts, scoring logic, AI validators, or `backend/src/mcp/**`.

Demo value:

- The backend workstream stays focused on orchestration, persistence, prompt compilation, providers, jobs, publication guardrails, and replay data.

### BE-008: Prompt Compiler Backend Integration

Purpose:

- Connect backend-owned creative inputs to the prompt compiler and store normalized `PromptPayload` records.

Demo value:

- The system proves that final prompt generation is backend-controlled and traceable.

### BE-009: Provider Adapter Boundary and Mock Provider

Purpose:

- Add video provider adapter interfaces and the deterministic mock provider.

Demo value:

- The full video generation demo works with no live provider credentials.

## Phase 4: Job Tracking, Selection, and Demo Replay

### BE-010: Video Job Lifecycle and Polling

Purpose:

- Implement video job persistence, status transitions, normalized provider results, generated video creation, and `GET /video-jobs/{id}`.

Demo value:

- Frontend can poll job status and show final preview variants.

### BE-011: Demo Replay Endpoint

Purpose:

- Implement `GET /demo/fallback` with a complete deterministic creative project, source assets, generation request, prompt payload, video job, generated videos, optional publication, metrics snapshot, and fallback reason.

Demo value:

- A judge can still see the source-asset-to-generated-video story if any upstream piece is unavailable.

## Phase 5: Publication, Metrics, and Hardening

### BE-012: Error Handling, Logging, Secret Redaction, and Publication Safety

Purpose:

- Standardize API errors, request ids, safe logs, provider error normalization, ad platform readiness failures, and no-secret behavior.
- Ensure publication requires explicit user action and complete platform readiness.

Demo value:

- Failures are explainable and safe.

### BE-013: Backend Contract Test Suite

Purpose:

- Add unit, integration, and contract tests for mock flow, fail-closed behavior, tenant isolation, no-fabrication rules, publication guardrails, metrics snapshots, and demo replay.

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

That sequence gives a safe backend foundation and a visible creative-project data path.

## Recommended Demo Sprint

For the sprint that makes the demo end-to-end:

1. `BE-006`
2. `BE-007`
3. `BE-008`
4. `BE-009`
5. `BE-010`
6. `BE-011`

That sequence makes the core Kastonom story visible: user-provided creative inputs become a backend-compiled prompt and mock generated video variants.

## Recommended Hardening Sprint

Before final demo:

1. `BE-012`
2. `BE-013`
3. Re-run the frontend demo flow against backend mock mode.
4. Confirm live video provider and ad platform modes fail closed without credentials.

## Completion Checklist

- Backend starts in mock mode.
- `GET /health` works.
- `POST /creative-projects` creates a tenant-scoped project, subject, and source asset references.
- `GET /creative-projects/{id}` returns the project bundle without cross-tenant leakage.
- `POST /generation-requests` returns a generation request, prompt payload, video job, and generated video candidates.
- `GET /video-jobs/{id}` returns job state without cross-tenant leakage.
- `POST /generated-videos/{id}/select` marks one tenant-owned video as selected.
- `POST /ad-publications` fails closed unless explicit user action and ad platform readiness are present.
- `POST /ad-publications/{id}/metrics/sync` stores mock/manual metrics without inventing values.
- `POST /creative-iteration-suggestions` creates suggestions only from stored metrics or explicit fallback notes.
- `GET /demo/fallback` returns deterministic replay data.
- Mock provider output is clearly marked.
- Missing live provider config fails closed.
- Tests cover demo flow, tenant isolation, no-fabrication, publication guardrails, and fail-closed provider behavior.
