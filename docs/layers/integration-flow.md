# Kastonom Integration Flow

## Main Demo Flow

User-provided creative subject + source asset -> backend generation request -> prompt compiler -> backend video job -> external or mock video provider -> generated video variants -> user selects a video -> optional ad publication -> optional metrics snapshot -> optional creative iteration suggestion

## Sequence Diagram In Text Form

```text
User
  -> Frontend: Create creative project
Frontend
  -> Backend: POST /creative-projects
Backend
  -> Repository: Store CreativeProject, CreativeSubject, SourceAsset[]
Repository
  -> Backend: Stored project bundle
Backend
  -> Frontend: CreativeProject + CreativeSubject + SourceAsset[]

User
  -> Frontend: Generate video variants
Frontend
  -> Backend: POST /generation-requests
Backend
  -> Repository: Load project, subject, and selected source assets by tenant
Backend
  -> Prompt Compiler: Compile PromptPayload from subject, assets, and generation settings
Prompt Compiler
  -> Backend: PromptPayload
Backend
  -> Video Provider Adapter: Create video job
Video Provider Adapter
  -> Backend: Normalized ProviderResult
Backend
  -> Repository: Store VideoJob, ProviderResult, GeneratedVideo[]
Backend
  -> Frontend: GenerationRequest + PromptPayload + VideoJob + GeneratedVideo[]

Frontend
  -> Backend: GET /video-jobs/{id}
Backend
  -> Frontend: Job status and generated video result

User
  -> Frontend: Select generated video
Frontend
  -> Backend: POST /generated-videos/{id}/select
Backend
  -> Repository: Mark selected video and project selected_generated_video_id
Backend
  -> Frontend: Selected GeneratedVideo + CreativeProject

User
  -> Frontend: Publish selected video
Frontend
  -> Backend: POST /ad-publications
Backend
  -> Ad Platform Adapter: Publish only if connection, config, and scopes are ready
Ad Platform Adapter
  -> Backend: Normalized publication result
Backend
  -> Frontend: AdPublication

User
  -> Frontend: View or accept externally supplied iteration suggestion
Frontend
  -> Backend: POST /creative-iteration-suggestions
Backend
  -> Repository: Store suggestion payload supplied by external owner or demo fixture
Backend
  -> Frontend: CreativeIterationSuggestion
```

## Data Handoff Between Layers

Frontend to backend:

- Creative project name
- Creative subject facts entered by the user or imported explicitly
- Source asset references
- Provider preference
- Platform preference
- Duration
- Aspect ratio
- Language
- Tone, style, CTA, target audience, and user notes
- Explicit generated video selection
- Explicit ad publication request

Backend to prompt compiler:

- Creative subject
- Source asset references
- Generation request settings
- Provider target
- Platform target
- Duration
- Aspect ratio
- Language
- Negative instructions and forbidden claims
- Fallback notes

Backend to video provider adapter:

- `PromptPayload`
- Normalized job metadata
- Provider configuration from environment

Backend to frontend:

- Creative project state
- Source asset state
- Generation request state
- Prompt payload artifact when allowed by API contract
- Video job status
- Generated video variants
- Provider name
- Mock/live label
- Preview URL or explicit fallback result
- Publication status
- Metrics snapshots and iteration suggestions when requested

## MCP Ownership Boundary

MCP is not part of the backend workstream. Backend tasks must not implement MCP services, MCP mocks, AI validators, model prompts, product scoring, audience inference, or metric-informed suggestion generation.

Backend may only store or consume externally supplied MCP outputs after a separate explicit integration contract is provided by the MCP owner.

## Prompt Compiler Handoff

The prompt compiler converts the backend-owned input bundle into a provider-specific prompt payload. The compiler must preserve:

- Creative subject facts
- Source asset references
- Forbidden claims
- Required words or negative instructions
- Language
- Tone
- Style
- CTA
- Duration and aspect ratio
- Fallback notes

## Backend To Video Provider Call

The backend calls video providers only through adapters:

- Pollo
- Kling
- Runway
- Mock

The backend must validate configuration before live provider calls. Missing live configuration fails closed unless mock fallback mode is explicitly enabled.

## Frontend Polling Behavior

The frontend should poll `GET /video-jobs/{id}` until:

- `completed`
- `failed`
- `canceled`
- timeout defined by implementation contract

The frontend must show status changes and must not fabricate progress. If the backend returns mock status, show it as mock.

## Publication Flow

```text
User selects generated video
  -> Backend validates tenant ownership
  -> Backend checks ad platform connection and required configuration
  -> If ready: create AdPublication and call backend ad platform adapter
  -> If not ready: fail closed with configuration or connection error
```

The backend must not publish ads without explicit user action.

## Fallback Flow

```text
Provider config missing or provider call fails
  -> Backend checks fallback mode
  -> If fallback enabled: use mock provider
  -> Store fallback reason
  -> Return mock video job and generated video with is_mock=true
  -> Frontend displays fallback label and preview

Provider config missing and fallback disabled
  -> Backend fails closed
  -> Frontend displays actionable error
```
