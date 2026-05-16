# Prompt Compiler Contract

## Purpose

The prompt compiler converts backend-owned creative input records into provider-specific video generation prompt payloads. It is not responsible for product recommendation, audience inference, provider network calls, ad platform publication, or metric-informed iteration.

## Input Schema

Input must include:

- `provider`: `pollo | kling | runway | mock`
- `creative_subject.id`
- `creative_subject.subject_type`
- `creative_subject.name`
- `creative_subject.description`
- `creative_subject.landing_url`
- `creative_subject.price`
- `creative_subject.currency`
- `creative_subject.allowed_claims`
- `creative_subject.forbidden_claims`
- `creative_subject.unknown_fields`
- `creative_subject.source`
- `source_assets[].id`
- `source_assets[].asset_type`
- `source_assets[].source`
- `source_assets[].url`
- `generation_request.id`
- `generation_request.objective`
- `generation_request.target_audience`
- `generation_request.platform`
- `generation_request.language`
- `generation_request.tone`
- `generation_request.style`
- `generation_request.call_to_action`
- `generation_request.duration_seconds`
- `generation_request.aspect_ratio`
- `generation_request.user_notes`
- `generation_request.fallback_notes`

The input source is the stored `CreativeSubject`, selected `SourceAsset` records, and `GenerationRequest` from `docs/contracts/data-model.contract.yaml`.

## Output Schema

Output must map to `PromptPayload` and include:

- `provider`
- `prompt_text`
- `negative_prompt`
- `duration_seconds`
- `aspect_ratio`
- `language`
- `source_asset_ids`
- `provider_options`
- `is_mock`
- `fallback_notes`

Provider-specific adapters may add provider fields under `provider_options`.

## Rules

- Use only facts present in the creative subject, source assets, generation request, and fallback notes.
- Preserve forbidden claims.
- Preserve source asset references.
- Preserve fallback notes.
- Keep output suitable for ecommerce advertising when the subject is a product or offer.
- Default to vertical video for TikTok/Reels unless contract says otherwise.
- Use short Turkish text overlays only when the language and request settings allow them.
- Prioritize visibility of the advertised subject.
- Keep prompts concise enough for provider APIs.
- Return deterministic output for the same input.

## Provider Adapters

### PolloPromptAdapter

- Converts normalized creative input to Pollo-compatible prompt payload.
- Must fail closed if required Pollo-specific configuration is missing.

### KlingPromptAdapter

- Converts normalized creative input to Kling-compatible prompt payload.
- Must preserve negative instructions.

### RunwayPromptAdapter

- Converts normalized creative input to Runway-compatible prompt payload.
- Must keep provider-specific options under `provider_options`.

### MockPromptAdapter

- Converts normalized creative input to deterministic mock prompt payload.
- Must mark output as mock.
- Must not require external credentials.

## Forbidden Behavior

- Do not invent subject claims.
- Do not invent unavailable features.
- Do not add discounts, guarantees, stock claims, shipping promises, or performance claims unless explicitly present.
- Do not infer audience demographics.
- Do not remove negative instructions.
- Do not call provider APIs.
- Do not call ad platform APIs.
- Do not expose secrets.
- Do not silently change language, platform, duration, or aspect ratio.

## Acceptance Criteria

- Valid creative input produces provider prompt payload.
- Unsupported provider returns clear error or mock fallback only when allowed.
- Same input produces same prompt output.
- Negative instructions are included.
- Mock output is clearly marked.
- Prompt output can be stored as `PromptPayload` for a generation request.
