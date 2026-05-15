# Kastonom Integration Flow

## Main Demo Flow

ERP/product data -> MCP commerce intelligence -> product recommendation -> audience summary -> creative brief -> prompt compiler -> backend video job -> external or mock video provider -> frontend ad preview

## Sequence Diagram In Text Form

```text
User
  -> Frontend: Open dashboard
Frontend
  -> Backend: GET /products
Backend
  -> Product Source: Load tenant products or mock products
Product Source
  -> Backend: Product[]
Backend
  -> Frontend: Product[]

User
  -> Frontend: Generate campaign for selected product
Frontend
  -> Backend: POST /campaigns/generate
Backend
  -> MCP / AI Layer: Analyze product, metrics, audience, preferences
MCP / AI Layer
  -> Backend: Recommendation + audience summary + creative brief
Backend
  -> Prompt Compiler: Compile creative brief for provider
Prompt Compiler
  -> Backend: Provider prompt payload
Backend
  -> Video Provider Adapter: Create video job
Video Provider Adapter
  -> Backend: Normalized provider result
Backend
  -> Frontend: Campaign + creative brief + video job

Frontend
  -> Backend: GET /video-jobs/{id}
Backend
  -> Frontend: Job status and preview result
Frontend
  -> User: Final ad preview
```

## Data Handoff Between Layers

Frontend to backend:

- Product id
- Provider preference
- Platform preference
- Duration
- Language

Backend to MCP / AI layer:

- Tenant context
- Product facts
- Product metrics
- Audience segments
- Campaign preferences
- Brand constraints when available

MCP / AI layer to backend:

- Scores
- Recommendation reason
- Audience summary
- Structured creative brief
- Fallback notes

Backend to prompt compiler:

- Creative brief
- Provider target
- Platform target
- Duration
- Language
- Negative instructions

Backend to video provider adapter:

- Provider prompt payload
- Normalized job metadata
- Provider configuration from environment

Backend to frontend:

- Campaign id
- Creative brief
- Video job status
- Provider name
- Mock/live label
- Preview URL or fallback result

## Backend To MCP Call

The backend must send structured data only. It must not ask the MCP / AI layer open-ended questions like "make an ad." The MCP / AI call must request specific output fields defined in `docs/contracts/ai-behavior.contract.yaml`.

## MCP To Prompt Compiler Handoff

The MCP / AI layer returns a structured creative brief. The prompt compiler converts that brief into a provider-specific prompt. The compiler must preserve:

- Product facts
- Forbidden claims
- Required words
- Language
- Tone
- Visual style
- CTA
- Fallback notes

## Backend To Video Provider Call

The backend calls providers only through adapters:

- Pollo
- Kling
- Runway
- Mock

The backend must validate configuration before live provider calls. Missing live configuration fails closed unless mock fallback mode is explicitly enabled.

## Frontend Polling Behavior

The frontend should poll `GET /video-jobs/{id}` until:

- `completed`
- `failed`
- timeout defined by implementation contract

The frontend must show status changes and must not fabricate progress. If the backend returns mock status, show it as mock.

## Fallback Flow

```text
Provider config missing or provider call fails
  -> Backend checks fallback mode
  -> If fallback enabled: use mock provider
  -> Store fallback reason
  -> Return mock video job with is_mock=true
  -> Frontend displays fallback label and preview

Provider config missing and fallback disabled
  -> Backend fails closed
  -> Frontend displays actionable error
```

