# Prompt Compiler Contract

## Purpose

The prompt compiler converts a structured creative brief into provider-specific video generation prompt payloads. It is not responsible for product recommendation, audience inference, or provider network calls.

## Input Schema

Input must include:

- `provider`: `pollo | kling | runway | mock`
- `product.id`
- `product.name`
- `product.category`
- `product.is_new`
- `audience.primary_segment`
- `audience.age_range`
- `audience.buying_motivation`
- `insight.hype_score`
- `insight.trend_potential_score`
- `insight.reason`
- `campaign.goal`
- `campaign.platform`
- `campaign.duration`
- `campaign.creative_angle`
- `campaign.tone`
- `campaign.visual_style`
- `message.hook`
- `message.main_claim`
- `message.call_to_action`
- `constraints.forbidden_claims`
- `constraints.required_words`
- `constraints.language`
- `fallback_notes`

The preferred source template is `docs/prompts/creative-brief.template.yaml`.

## Output Schema

Output must include:

- `provider`
- `prompt_text`
- `negative_prompt`
- `duration_seconds`
- `aspect_ratio`
- `language`
- `metadata`
- `is_mock`
- `fallback_notes`

Provider-specific adapters may add provider fields under `metadata.provider_options`.

## Rules

- Use only facts present in the creative brief.
- Preserve forbidden claims.
- Preserve fallback notes.
- Keep output suitable for ecommerce advertising.
- Default to vertical video for TikTok/Reels unless contract says otherwise.
- Use short Turkish text overlays only if needed.
- Prioritize product visibility.
- Keep prompts concise enough for provider APIs.
- Return deterministic output for the same input.

## Provider Adapters

### PolloPromptAdapter

- Converts normalized creative brief to Pollo-compatible prompt payload.
- Must fail closed if required Pollo-specific configuration is missing.
- When live submission is enabled, the resulting PromptPayload is handed to the MCP network execution layer for HTTP delivery.

### KlingPromptAdapter

- Converts normalized creative brief to Kling-compatible prompt payload.
- Must preserve negative instructions.

### RunwayPromptAdapter

- Converts normalized creative brief to Runway-compatible prompt payload.
- Must keep provider-specific options under metadata.

### MockPromptAdapter

- Converts normalized creative brief to deterministic mock prompt payload.
- Must mark output as mock.
- Must not require external credentials.

## Forbidden Behavior

- Do not invent product claims.
- Do not invent unavailable features.
- Do not add discounts, guarantees, or shipping promises unless explicitly present.
- Do not remove negative instructions.
- Do not execute provider HTTP requests directly; hand off live submission to the MCP network execution layer.
- Do not expose secrets.
- Do not silently change language, platform, or duration.

## Acceptance Criteria

- Valid creative brief input produces provider prompt payload.
- Unsupported provider returns clear error or mock fallback only when allowed.
- Same input produces same prompt output.
- Negative instructions are included.
- Mock output is clearly marked.
- Prompt output can be stored with a campaign or video job.

