import { STANDARD_NEGATIVE_INSTRUCTIONS, VIDEO_PROVIDERS } from "../domain/constants.js";
import { validationError } from "../http/errors/api-error.js";
import * as pgStore from "../db/pg-store.js";

function adapterName(provider) {
  return {
    mock: "MockPromptAdapter",
    pollo: "PolloPromptAdapter",
    kling: "KlingPromptAdapter",
    runway: "RunwayPromptAdapter"
  }[provider];
}

function compactJoin(items, separator = " ") {
  return items.filter((item) => typeof item === "string" && item.trim() !== "").join(separator);
}

export function createPromptCompilerService({ ids, clock, config }) {
  return {
    async compile(context, { requestedProvider, creativeSubject, sourceAssets, generationRequest }) {
      let provider = requestedProvider;
      const fallbackNotes = [...generationRequest.fallback_notes];

      if (!VIDEO_PROVIDERS.includes(provider)) {
        if (!context.fallback_enabled) {
          throw validationError("Unsupported video provider.", {
            error: "PROMPT_COMPILATION_FAILED"
          });
        }
        fallbackNotes.push(`unsupported_provider_fallback:${provider}`);
        provider = "mock";
      }

      const assetReferences = sourceAssets.map((asset) => `${asset.id}:${asset.url}`).join(", ");
      const allowedClaims = creativeSubject.allowed_claims.length
        ? creativeSubject.allowed_claims.join("; ")
        : "not_available";
      const unknownFields = creativeSubject.unknown_fields.length
        ? creativeSubject.unknown_fields.join(", ")
        : "none";

      const promptText = compactJoin([
        `Create a ${generationRequest.duration_seconds} second ${generationRequest.aspect_ratio} ${generationRequest.language} video ad for ${creativeSubject.name}.`,
        creativeSubject.description ? `Description: ${creativeSubject.description}.` : null,
        `Subject type: ${creativeSubject.subject_type}.`,
        `Objective: ${generationRequest.objective}.`,
        `Platform: ${generationRequest.platform}.`,
        generationRequest.target_audience
          ? `Target audience supplied by user: ${generationRequest.target_audience}.`
          : "Target audience: unknown.",
        generationRequest.tone ? `Tone: ${generationRequest.tone}.` : null,
        generationRequest.style ? `Style: ${generationRequest.style}.` : null,
        generationRequest.call_to_action ? `CTA: ${generationRequest.call_to_action}.` : null,
        `Use source assets as visual references: ${assetReferences}.`,
        `Use only approved claims: ${allowedClaims}.`,
        `Unknown fields: ${unknownFields}.`,
        generationRequest.user_notes ? `User notes: ${generationRequest.user_notes}.` : null,
        "Keep the advertised subject visible in the first second and do not add unsupported product facts."
      ]);

      const negativePrompt = [
        ...STANDARD_NEGATIVE_INSTRUCTIONS,
        ...creativeSubject.forbidden_claims
      ].join(" ");

      const promptPayload = {
        id: ids.next("prompt-payload"),
        tenant_id: context.tenant_id,
        project_id: generationRequest.project_id,
        generation_request_id: generationRequest.id,
        provider,
        prompt_text: promptText,
        negative_prompt: negativePrompt,
        language: generationRequest.language,
        duration_seconds: generationRequest.duration_seconds,
        aspect_ratio: generationRequest.aspect_ratio,
        source_asset_ids: sourceAssets.map((asset) => asset.id),
        provider_options: {
          adapter: adapterName(provider),
          platform: generationRequest.platform,
          objective: generationRequest.objective,
          source_asset_count: sourceAssets.length
        },
        is_mock: provider === "mock",
        fallback_notes: fallbackNotes,
        created_at: clock.now()
      };

      // Save to PostgreSQL
      const createdPayload = await pgStore.createPromptPayload(promptPayload);
      return createdPayload;
    }
  };
}
