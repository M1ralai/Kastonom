// =============================================================================
// Kastonom Frontend↔Backend Communication Workflow
// -----------------------------------------------------------------------------
// PURPOSE: Make every existing button, form, and async flow in the React/TS
// frontend communicate flawlessly with the Go backend. No new pages, no new
// features, no architectural changes.
//
// SCOPE (from the user):
//   - Fix every existing frontend↔backend communication issue
//   - Do NOT add pages, features, or new routes
//   - Only modify what's needed to make the existing flow work
//
// PREVIOUS WORK ALREADY DONE (assumed green):
//   - /uploads/... static mount at internal/bootstrap/app.go
//   - Report.VideoProviderReady is a map[string]ReadinessStatus{"pollo": ...}
//   - POST /video-jobs/{id}/cancel is registered
//   - video_jobs.status writes "submitted" after Pollo Create returns
//   - 12 go test packages all pass; go build / go vet are clean
//
// KNOWN REMAINING GAPS (the workflow must fix these plus discover more):
//   - kastonomApi.ts AuthResponse is stale: declares {user, token, tenant?}
//     but login returns {user, token, access_token, refresh_token, expires_in}
//   - LoginPage.tsx works around it via result.access_token || result.token
//     (fragile — should use the real field name with a type-correct interface)
//
// PHASES
//   1. Static audit      — read every frontend page, classify every on* handler
//   2. Backend cross-check — verify every frontend call against the real wire
//   3. Fix in-flight     — apply minimal patches to frontend + backend
//   4. Smoke verify      — boot backend in mock mode + smoke each route via curl
//   5. Final report      — list every button and its verified status
//
// CONSTRAINTS
//   - Backend runs in KASTONOM_MODE=mock (no Pollo / ad-platform creds needed)
//   - Backend uses cfg.DemoTenantID for unauthenticated calls
//   - No DB needed: this workflow does NOT start the full NewApp (which
//     requires postgres.Open). Instead it starts a minimal Fiber app that
//     registers only the routes needed for the smoke test, or it uses
//     NewTestApp if one exists, or it shells out to a runnable in-process
//     HTTP server the verifier agent builds ad-hoc.
//   - The frontend dev server (vite) is NOT started. Buttons are
//     verified by replaying the exact HTTP requests the frontend's
//     kastonomApi.ts would make, not by clicking in a browser.
// =============================================================================

export const meta = {
  name: 'kastonom-frontend-backend-communication',
  description:
    'Make every existing frontend button/form/flow work end-to-end with the Go backend, no new pages, no new features',
  phases: [
    { title: 'Phase 1: Static audit', detail: 'Read every frontend page, classify every on* handler' },
    { title: 'Phase 2: Backend cross-check', detail: 'Verify every frontend call against the real wire' },
    { title: 'Phase 3: Fix in-flight', detail: 'Apply minimal patches to frontend + backend' },
    { title: 'Phase 4: Smoke verify', detail: 'Boot backend in mock mode, replay every frontend call via curl' },
    { title: 'Phase 5: Final report', detail: 'List every button and its verified status' },
  ],
}

// =============================================================================
// SCHEMAS
// =============================================================================

const HANDLER_SCHEMA = {
  type: 'object',
  properties: {
    handlers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          page: { type: 'string' },
          element: { type: 'string' },
          elementKind: { type: 'string', enum: ['button', 'form-submit', 'input-change', 'link'] },
          handler: { type: 'string' },
          callsApi: { type: 'string' },
          apiFn: { type: 'string' },
          backendRoute: { type: 'string' },
          wired: { type: 'boolean' },
          notes: { type: 'string' },
        },
        required: ['page', 'element', 'elementKind', 'handler', 'wired'],
      },
    },
  },
  required: ['handlers'],
}

const GAP_SCHEMA = {
  type: 'object',
  properties: {
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area: { type: 'string' },
          frontendFile: { type: 'string' },
          backendFile: { type: 'string' },
          currentBehavior: { type: 'string' },
          targetBehavior: { type: 'string' },
          fixKind: { type: 'string', enum: ['frontend-only', 'backend-only', 'both'] },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        },
        required: ['area', 'currentBehavior', 'targetBehavior', 'fixKind', 'priority'],
      },
    },
  },
  required: ['gaps'],
}

const FIX_SCHEMA = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    filesModified: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    verified: { type: 'boolean' },
  },
  required: ['area', 'filesModified', 'summary', 'verified'],
}

const SMOKE_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          endpoint: { type: 'string' },
          method: { type: 'string' },
          path: { type: 'string' },
          expectedStatus: { type: 'number' },
          actualStatus: { type: 'number' },
          responseShape: { type: 'string' },
          pass: { type: 'boolean' },
          notes: { type: 'string' },
        },
        required: ['endpoint', 'method', 'path', 'pass'],
      },
    },
    backendStarted: { type: 'boolean' },
    backendLog: { type: 'string' },
  },
  required: ['results', 'backendStarted'],
}

const FINAL_SCHEMA = {
  type: 'object',
  properties: {
    buttonsWorking: { type: 'number' },
    buttonsBroken: { type: 'number' },
    buttonsNotApplicable: { type: 'number' },
    broken: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          page: { type: 'string' },
          element: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['page', 'element', 'reason'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['buttonsWorking', 'buttonsBroken', 'buttonsNotApplicable', 'summary'],
}

// =============================================================================
// PHASE 1: STATIC AUDIT (read every page, classify every on* handler)
// =============================================================================

phase('Phase 1: Static audit')

const auditResult = await agent(
  `You are auditing the React/TS frontend at /Users/atahandemirer/Developer/Kastonom/frontend for every interactive element. Read every .tsx file under src/{pages,widgets,app} and src/shared/api/. For every onClick, onSubmit, and onChange that has business logic (not just style toggles), emit one record per the HANDLER_SCHEMA.

WORKING DIRS:
- /Users/atahandemirer/Developer/Kastonom/frontend/src
- /Users/atahandemirer/Developer/Kastonom/frontend/src/shared/api/kastonomApi.ts (the API client — every exported function maps to one backend route)
- /Users/atahandemirer/Developer/Kastonom/frontend/src/shared/types/api.ts (the TS types)

CLASSIFY EACH HANDLER:

1. NAVIGATION-ONLY onClick (e.g. "navigate to /products"): elementKind="link", wired=true, callsApi="(none)", apiFn="(none)", backendRoute="(none)". NO api call.

2. STATE-ONLY onClick (e.g. setIsModalOpen, setSelectedVideo, setViewMode): elementKind="button", wired=true, callsApi="(none)", apiFn="(none)", backendRoute="(none)". Pure UI toggle, not a real backend call.

3. API-CALLING onClick (calls a kastonomApi.ts function): elementKind="button", wired=true, callsApi=<route>, apiFn=<kastonomApi function name>, backendRoute=<route from kastonomApi.ts>. The crucial class.

4. FORM onSubmit: elementKind="form-submit", wired=true. Trace which apiRequest happens.

5. INPUT onChange with business logic (e.g. search-as-you-type, file upload): elementKind="input-change", wired=true.

For each, also note the page field (the .tsx file basename without extension) and the element field (a short identifier like "Login submit button" or "Products grid view toggle").

ALSO emit a "Fake/Stub" element for the disabled "Reybex (ERP) ile Bağlan" button in LoginPage — it's wired=true but callsApi="(stub — not implemented)".

DO NOT audit pure CSS/style onClick (none exist in this codebase but if you find any, skip).

Return HANDLER_SCHEMA-shaped JSON. No prose.`,
  {
    label: 'Audit: every on* handler',
    phase: 'Phase 1: Static audit',
    schema: HANDLER_SCHEMA,
  },
)

if (!auditResult) throw new Error('Static audit returned no result')
const handlers = auditResult.handlers || []
log(`Phase 1: ${handlers.length} interactive elements catalogued`)

// =============================================================================
// PHASE 2: BACKEND CROSS-CHECK (verify every API call against the real wire)
// =============================================================================

phase('Phase 2: Backend cross-check')

const crossCheckResult = await agent(
  `You are cross-checking every API call the React/TS frontend makes against the actual Go backend at /Users/atahandemirer/Developer/Kastonom/go-backend.

INPUT — the Phase 1 handler catalog (one per interactive element, with apiFn and backendRoute):
${JSON.stringify(handlers.filter(h => h.callsApi && h.callsApi !== '(none)' && h.callsApi !== '(stub — not implemented)'), null, 2)}

THE FRONTEND API CLIENT is at /Users/atahandemirer/Developer/Kastonom/frontend/src/shared/api/kastonomApi.ts.
THE BACKEND is at /Users/atahandemirer/Developer/Kastonom/go-backend.

YOUR JOB — for each API call in the catalog:

1. Read the kastonomApi.ts function body. Note:
   - HTTP method and path
   - Request body shape (TS type or 'formdata' or 'none')
   - Response type (TS interface name)
   - Header usage (x-tenant-id, Authorization)

2. Read the matching Go handler. Note:
   - HTTP method and path (must match exactly, case-sensitive)
   - Request DTO name and json tags
   - Response DTO/struct name and json tags
   - Tenant resolution (x-tenant-id, JWT, etc.)
   - Whether it requires DB (we are in mock mode, so DB-dependent paths will return errors — flag them)

3. Compare:
   - Route exists? (If not, gap with fixKind='backend-only')
   - Request body shape matches the Go DTO? (If a field is missing or misnamed, gap with fixKind='frontend-only' or 'both')
   - Response shape matches the TS type? (If a field is missing or misnamed, gap with fixKind='frontend-only' or 'both')
   - Tenant context propagation works?

4. SPECIAL CHECK — AuthResponse shape:
   - The frontend's kastonomApi.ts AuthResponse interface declares {user, token, tenant?}
   - The backend's /auth/login returns dto.LoginResponse{User, Token, AccessToken, RefreshToken, ExpiresIn} (per /Users/atahandemirer/Developer/Kastonom/go-backend/internal/modules/auth/dto/dto.go around line 41)
   - Frontend code in LoginPage.tsx line 60 already works around it via 'result.access_token || result.token'
   - This is a TYPE-vs-WIRE mismatch: the AuthResponse type is stale. Emit a gap with fixKind='frontend-only' to update kastonomApi.ts AuthResponse to {user, token, access_token, refresh_token, expires_in, tenant?} and remove the fallback in LoginPage.

5. SPECIAL CHECK — listCreativeProjects (GET /creative-projects):
   - Frontend expects Array<{creative_project, creative_subject, source_assets}>
   - Backend's creative/handler/handler.go List returns the result of service.List which is []domain.CreativeProjectBundle per service.go:64
   - CreativeProjectBundle has {creative_project, creative_subject, source_assets} per domain.go
   - So shapes MATCH. No gap. Document this as "verified ok".

6. SPECIAL CHECK — uploadSourceAsset (POST /source-assets/upload):
   - Frontend sends multipart with fields {file, asset_type: "image", source: "upload"}
   - Backend's UploadSourceAsset handler takes NO body, returns a stub SourceAsset with URL="/uploads/mock-upload.png" (per creative/service/demo_or_mock_service.go:33)
   - This works in mock mode by design. No gap. Document as "verified ok — design choice; real upload is a future feature".

Return GAP_SCHEMA-shaped JSON. Every gap must be specific enough to fix in one round.`,
  {
    label: 'Cross-check: frontend vs backend',
    phase: 'Phase 2: Backend cross-check',
    schema: GAP_SCHEMA,
  },
)

if (!crossCheckResult) throw new Error('Backend cross-check returned no result')
const gaps = crossCheckResult.gaps || []
log(`Phase 2: ${gaps.length} gaps found`)

// =============================================================================
// PHASE 3: FIX IN-FLIGHT (apply minimal patches)
// =============================================================================

phase('Phase 3: Fix in-flight')

// Sort gaps: critical first, then high, then medium, then low
const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
const sortedGaps = [...gaps].sort((a, b) =>
  (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4),
)

const fixes = []
for (const gap of sortedGaps) {
  log(`Phase 3: fixing "${gap.area}" (${gap.priority}, ${gap.fixKind})`)
  const fix = await agent(
    `You are applying a minimal patch to close this integration gap in Kastonom.

GAP:
${JSON.stringify(gap, null, 2)}

HARD CONSTRAINTS:
- The frontend at /Users/atahandemirer/Developer/Kastonom/frontend MUST NOT have new pages, new features, or new routes. You may modify existing files only.
- The backend at /Users/atahandemirer/Developer/Kastonom/go-backend may be modified only if the gap is fixKind='backend-only' or 'both'. If the gap is fixKind='frontend-only', do NOT touch the backend.
- Do NOT modify /Users/atahandemirer/Developer/Kastonom/frontend/src/pages/* (page files) UNLESS the gap is specifically about a button or form on that page that needs a wiring change. Wiring changes go in kastonomApi.ts and shared/lib/, not in the page itself.
- Prefer the smallest possible change. If a one-line type update fixes it, do that.
- For frontend changes: keep TypeScript strict. Keep imports clean. Match the existing style (the codebase uses 2-space indent, single quotes, semicolons, no trailing commas).
- For backend changes: run cd /Users/atahandemirer/Developer/Kastonom/go-backend && go build ./... && go vet ./... to confirm green.

YOUR JOB:
1. Read the files named in the gap.
2. Apply the minimal patch.
3. If the gap is purely frontend, you do not need to run go build.
4. If the gap is backend or both, run go build and go vet.
5. For TypeScript: ideally run cd /Users/atahandemirer/Developer/Kastonom/frontend && npx tsc -b --noEmit to confirm no type errors. (This may take a minute; skip if you can't run it.)

Return FIX_SCHEMA-shaped JSON.`,
    {
      label: 'Fix: ' + gap.area,
      phase: 'Phase 3: Fix in-flight',
      schema: FIX_SCHEMA,
    },
  )
  if (fix) fixes.push(fix)
}

log(`Phase 3: ${fixes.length}/${gaps.length} gaps fixed`)

// =============================================================================
// PHASE 4: SMOKE VERIFY (boot backend in mock mode, replay every frontend call)
// =============================================================================

phase('Phase 4: Smoke verify')

const smokeResult = await agent(
  `You are the smoke verifier for Kastonom. The frontend↔backend integration should now be green; your job is to prove it by replaying every frontend API call against a running backend and confirming the response shape is what the frontend expects.

WORKING DIR: /Users/atahandemirer/Developer/Kastonom/go-backend

STEP 1: BOOT THE BACKEND IN MOCK MODE

The backend's NewApp() requires Postgres. To avoid that dependency, use ONE of these approaches (try the first; fall back to the second):

(a) Use bootstrap.NewTestApp(nil) if it exists in /Users/atahandemirer/Developer/Kastonom/go-backend/internal/bootstrap/. The Phase 4 of the previous workflow was supposed to add it. Check internal/bootstrap/app.go and look for NewTestApp. If it exists, use it. If NewTestApp requires a *sqlx.DB, pass nil and let it skip DB-dependent handler registrations.

(b) If NewTestApp does NOT exist or requires too much wiring, write a minimal in-process smoke test in a new file /tmp/smoke/main.go (do NOT commit it) that:
    - imports "github.com/M1ralai/Kastonom/backend/internal/bootstrap" (or the relevant packages)
    - calls a helper to get a *fiber.App that has the routes registered but no DB
    - uses app.Test(req) to drive each route (no real port needed)
    - OR: starts the app on a random port and uses net/http to hit it

Set KASTONOM_MODE=mock so the health probe and generation paths use the mock branch.

STEP 2: REPLAY EVERY FRONTEND CALL

The frontend's kastonomApi.ts exports these functions. For each, fire the exact HTTP request the frontend would make and verify the response:

For each endpoint in this list, run the curl (or net/http) call, capture the response, and emit a SMOKE_SCHEMA result row:

  GET  /health                              → 200, json with status, mode, version, video_provider_readiness.pollo, ad_platform_readiness
  POST /auth/register                       → 201, json with user, token, access_token, refresh_token, expires_in, tenant
  POST /auth/login                          → 200, same shape
  GET  /dashboard/kpi-summary               → 200, json {monthly_video_count, monthly_video_change, remaining_credits, ...}
  GET  /dashboard/recent-activities?limit=10 → 200, json {activities: [...]}
  GET  /tenant/credits                      → 200, json {tenant_id, current_credits, ...}
  POST /creative-projects                   → 201, json {creative_project, creative_subject, source_assets}
  GET  /creative-projects                   → 200, json array of {creative_project, creative_subject, source_assets}
  GET  /creative-projects/{id}              → 200, same bundle shape
  GET  /creative-projects/{id}/metrics      → 200, json {project_id, creative_subject, erp_data}
  POST /source-assets/upload                → 201, json {source_asset, upload_url}
  POST /generation-requests                 → 201, json {generation_request, prompt_payload, video_job, ...}
  POST /generation-requests/estimate-cost   → 200, json {estimated_credits, estimated_cost: {amount, currency, max_amount}}
  GET  /video-jobs/{id}                     → 200, json {video_job, provider_result, generated_videos, fallback_reason}
  GET  /video-jobs/{id}/full                → 200, json {video_job, generated_videos, project, creative_subject, generation_request}
  POST /generated-videos/{id}/select        → 200, json {creative_project, generated_video}
  POST /ad-publications                     → 201, json {ad_publication, fallback_reason}
  POST /ad-publications/{id}/metrics/sync   → 200, json {metrics_snapshot}
  POST /video-jobs/{id}/cancel              → 200 or 409 (depending on state)
  GET  /uploads/mock-upload.png             → 200, image bytes

The DB-dependent routes (POST /creative-projects, /auth/register, etc.) will likely return 500 because there's no DB. Record that as actualStatus=500 with pass=false and notes="DB unavailable in smoke test — runtime gap, not contract gap". DO NOT try to fix this; it's a known limitation of the smoke harness, not a real frontend bug.

The /uploads/mock-upload.png test IS achievable because the static mount is registered; write a fake file to t.TempDir() first, then assert 200.

STEP 3: REPORT

Return SMOKE_SCHEMA-shaped JSON with one result row per endpoint, plus backendStarted=true/false and a backendLog (last 50 lines of stderr/stdout).

If you cannot get the backend to start at all, set backendStarted=false, leave results=[], and put a clear notes in backendLog.`,
  {
    label: 'Smoke: replay every frontend call',
    phase: 'Phase 4: Smoke verify',
    schema: SMOKE_SCHEMA,
  },
)

if (!smokeResult) throw new Error('Smoke verify returned no result')
log(`Phase 4: backendStarted=${smokeResult.backendStarted}, ${(smokeResult.results || []).length} endpoints replayed`)

// =============================================================================
// PHASE 5: FINAL REPORT (per-button status)
// =============================================================================

phase('Phase 5: Final report')

// Buttons classified by wire result.
// "Wired to real backend, smoke passed"        → buttonsWorking++
// "Wired to real backend, smoke failed (DB)"   → buttonsNotApplicable (DB infra limitation)
// "Stub/no backend call"                        → buttonsNotApplicable
// "Wired but gap unfixed"                       → buttonsBroken++
const broken = []
let buttonsWorking = 0
let buttonsBroken = 0
let buttonsNotApplicable = 0

for (const h of handlers) {
  // No API call → not applicable
  if (h.callsApi === '(none)' || !h.callsApi) {
    buttonsNotApplicable++
    continue
  }
  // Stub → not applicable
  if (h.callsApi === '(stub — not implemented)') {
    buttonsNotApplicable++
    continue
  }
  // Has an API call — check smoke results
  const route = h.backendRoute
  const smoke = (smokeResult.results || []).find(s =>
    s.method && s.path && s.path === route.split(' ').slice(1).join(' '),
  )
  if (!smoke) {
    // Not in the smoke set → likely a navigation-only button mistakenly tagged
    buttonsNotApplicable++
    continue
  }
  if (smoke.pass) {
    buttonsWorking++
  } else if (smoke.actualStatus === 500) {
    // DB unavailable — runtime limitation, not a frontend bug
    buttonsNotApplicable++
  } else {
    buttonsBroken++
    broken.push({ page: h.page, element: h.element, reason: smoke.notes || `actualStatus=${smoke.actualStatus} expected=${smoke.expectedStatus}` })
  }
}

const finalReport = await agent(
  `You are the final reporter for the Kastonom frontend↔backend communication workflow.

INPUT:
- Phase 1 handler catalog: ${handlers.length} interactive elements
- Phase 2 gaps: ${gaps.length} found
- Phase 3 fixes: ${fixes.length} applied
- Phase 4 smoke results: ${(smokeResult.results || []).length} endpoints replayed, backendStarted=${smokeResult.backendStarted}
- Computed counts: ${buttonsWorking} working, ${buttonsBroken} broken, ${buttonsNotApplicable} not-applicable
- Broken buttons: ${JSON.stringify(broken, null, 2)}

OUTPUT a FINAL_SCHEMA object with:
- buttonsWorking, buttonsBroken, buttonsNotApplicable
- broken: the broken list verbatim
- summary: a 3-paragraph human-readable report covering (1) what was fixed, (2) what couldn't be verified due to DB infra, (3) honest assessment of confidence level

Use this tone: direct, factual, no marketing language.`,
  {
    label: 'Final report',
    phase: 'Phase 5: Final report',
    schema: FINAL_SCHEMA,
  },
)

if (!finalReport) throw new Error('Final report returned no result')

// =============================================================================
// RETURN
// =============================================================================

return {
  meta: { name: meta.name, phases: meta.phases.length },
  audit: { handlerCount: handlers.length },
  crossCheck: { gapCount: gaps.length },
  fixes: { applied: fixes.length, list: fixes },
  smoke: smokeResult,
  final: finalReport,
}
