# AGENTS.md

## Project Identity

Kastonom is a hackathon MVP for a no-prompt AI advertising engine for ecommerce SMEs. It converts ERP, commerce, product, customer, sales, stock, and trend signals into a structured creative brief and a video-generation prompt for AI video providers.

The project goal is a working, demoable MVP. Prefer clarity, deterministic behavior, and safe fallbacks over broad architecture.

## Three-Layer Architecture

1. **Frontend Layer**
   - Presents products, insights, selected product state, creative brief, video job status, and final ad preview.
   - Does not generate prompts directly.
   - Does not call AI video APIs directly.
   - Must work with mock data for the demo fallback path.

2. **Backend Layer**
   - Provides stable orchestration APIs for the frontend.
   - Handles tenant boundaries, product APIs, campaign APIs, video jobs, provider adapter calls, result storage, and fallback behavior.
   - Calls the MCP / AI intelligence layer for commerce decisions.
   - Fails closed when required configuration is missing.

3. **MCP / AI Intelligence Layer**
   - Reads commerce/product data and computes recommendation signals.
   - Produces product recommendation, audience summary, creative angle, and structured creative brief.
   - Sends structured input to the prompt compiler.
   - Must not invent missing product facts, claims, prices, discounts, guarantees, stock, or customer demographics.

## Read These Files Before Coding

Before making implementation changes, read:

- `docs/project-brief.md`
- `docs/architecture.md`
- `docs/contracts/mvp.contract.yaml`
- `docs/contracts/task.contract.template.yaml`
- `docs/contracts/api.contract.yaml`
- `docs/contracts/data-model.contract.yaml`
- `docs/contracts/ai-behavior.contract.yaml`
- Relevant files in `docs/layers/`
- Relevant files in `docs/prompts/`
- `docs/codex-task-queue.md`

If a task contract references additional files, read those files before editing.

## Agent Behavior Rules

- Do not modify unrelated files.
- Ask only if blocked; otherwise make the best safe assumption and document it.
- Fail closed on missing configuration, missing credentials, invalid tenant scope, or unsafe provider state.
- Prefer deterministic behavior over creative randomness.
- No hidden side effects. Do not perform network calls, writes, migrations, or provider submissions unless the task explicitly allows them.
- Every feature must be demoable through a visible screen, API response, fixture, or documented fallback path.
- Respect contracts in `docs/contracts/`.
- Keep the MVP simple and hackathon-friendly.
- Do not introduce unnecessary dependencies.
- Write readable, testable code when implementation begins.

## Engineering Rules

- No secrets in code, docs examples, tests, logs, fixtures, or commits.
- Use environment variables for API keys and provider credentials.
- Mock external providers when needed.
- Default to the mock provider for local development and demo fallback.
- Validate inputs at layer boundaries.
- Keep frontend presentation logic separate from backend orchestration.
- Keep AI decision logic separate from provider-specific prompt formatting.
- Store provider responses and failures in a way that can be replayed or shown in fallback mode.
- Prefer explicit JSON/YAML schemas and typed objects over free-form strings.
- Do not invent data to make a demo look better. Use mock fixtures with clear labels when real data is unavailable.

## Safety Boundaries

- The frontend must not call Pollo, Kling, Runway, or any other AI video provider directly.
- The frontend must not generate final video prompts directly.
- The backend must not bypass tenant checks.
- The backend must not call a real provider unless provider configuration is complete and the selected mode allows live provider calls.
- The MCP / AI layer must not fabricate product claims, discounts, guarantees, stock levels, prices, or customer demographics.
- Missing data must be represented as `unknown`, `not_available`, or an explicit fallback reason.

## Task Completion Format

Every coding or documentation task must end with:

- **Changed files:** list each changed file.
- **Tests run:** list commands and results, or state `Not run` with reason.
- **Assumptions:** list assumptions made to avoid blocking.
- **Risks:** list remaining risks or unknowns.
- **Next safe step:** one concrete next task that follows the contracts.

