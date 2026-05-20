# Video Generation Prompt Template

## Advertised Subject

- Subject type: `{{creative_subject.subject_type}}`
- Name: `{{creative_subject.name}}`
- Description: `{{creative_subject.description}}`
- Known price: `{{creative_subject.price}} {{creative_subject.currency}}`
- Unknown fields: `{{creative_subject.unknown_fields}}`

## Source Assets

- Asset references: `{{source_assets}}`

## Generation Request

- Objective: `{{generation_request.objective}}`
- Platform: `{{generation_request.platform}}`
- Aspect ratio: `{{generation_request.aspect_ratio}}`
- Duration: `{{generation_request.duration_seconds}}`
- Language: `{{generation_request.language}}`
- Target audience: `{{generation_request.target_audience}}`
- Tone: `{{generation_request.tone}}`
- Style: `{{generation_request.style}}`
- CTA: `{{generation_request.call_to_action}}`

## Scene Direction

Create a short vertical ad that keeps the advertised subject clearly visible. Use the supplied source assets as visual references. Show only features and claims provided in the creative subject fields or allowed claims. Use clean pacing, simple transitions, and a direct composition suitable for the requested platform.

Placeholder scene beats:

1. Open with the advertised subject visible in the first second.
2. Show the subject context or use case without inventing unavailable features.
3. Reinforce one approved claim when available.
4. End with CTA and subject visibility.

## User Notes

`{{generation_request.user_notes}}`

## Allowed Claims

`{{creative_subject.allowed_claims}}`

## CTA

`{{generation_request.call_to_action}}`

## Rules

- Do not invent subject claims.
- Do not show unavailable features.
- Keep suitable for ecommerce advertising when the subject is a product or offer.
- Use short Turkish text overlays only when requested language allows it.
- Prioritize subject visibility.
- Output vertical video suitable for TikTok/Reels unless changed by contract.
- Use only facts present in the stored creative input records.
- Respect forbidden claims and negative instructions.

## Negative Instructions

Do not include:

- Unsupported discounts
- Unsupported guarantees
- Fake scarcity
- Medical, legal, financial, or safety claims not present in source data
- Unavailable variants
- Provider watermarks unless unavoidable
- Long text overlays
