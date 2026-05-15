# Frontend Layer Contract

## Purpose

The frontend is the user-facing creative console for Kastonom. It presents product data, insights, creative briefs, video generation status, and final ad previews.

## Responsibilities

- Render product dashboard from backend or demo fallback data.
- Show selected product details and scoring signals.
- Show audience summary and creative brief.
- Start campaign generation through backend API.
- Poll backend for video job status.
- Display final live or mock ad preview.
- Clearly label fallback/mock data.
- Provide loading, success, empty, and error states.

## Must Not Do

- Must not generate video prompts directly.
- Must not call Pollo, Kling, Runway, or other AI video APIs directly.
- Must not contain provider API keys.
- Must not calculate final product recommendation logic.
- Must not invent product facts when backend data is missing.
- Must not hide mock provider state from the user.

## Screens

### Dashboard

- Product list
- Recommended product indicator
- Basic product metrics
- Start or view campaign action

### Product Insight Page

- Selected product details
- Hype score
- Trend potential score
- Sales velocity
- Stock movement
- New product boost
- Audience fit
- Recommendation reason

### Creative Brief Preview

- Audience summary
- Creative angle
- Tone
- Visual style
- Hook
- Main claim
- CTA
- Forbidden claims
- Fallback notes

### Video Generation Status

- Campaign id
- Video job id
- Provider
- Job status
- Mock/live label
- Error state if failed

### Final Ad Preview

- Video or static fallback preview
- Provider result metadata
- CTA and platform summary
- Fallback reason when applicable

## State Requirements

Required states:

- Loading products
- Product load success
- Product load failure
- Campaign generation loading
- Creative brief ready
- Video job queued
- Video job processing
- Video job completed
- Video job failed
- Demo fallback active

State must come from backend responses or documented local fallback data. Local fallback must be clearly labeled.

## API Dependencies

- `GET /health`
- `GET /products`
- `POST /campaigns/generate`
- `GET /video-jobs/{id}`
- `GET /demo/fallback`

The frontend must treat API response contracts as stable and should not rely on undocumented fields.

## Demo Fallback Behavior

If backend product or provider flow is unavailable and fallback mode is enabled:

- Show fallback products from `/demo/fallback` or bundled demo fixture if allowed by implementation contract.
- Label the data as demo/mock.
- Preserve the same screen flow.
- Do not pretend fallback preview is live provider output.

## Acceptance Criteria

- The full demo path can be completed in under 3 minutes.
- The frontend never directly imports or calls provider SDKs.
- Prompt text is displayed only if returned by backend as an explicit artifact.
- Every screen has clear loading and failure states.
- Mock/fallback state is visible wherever used.

