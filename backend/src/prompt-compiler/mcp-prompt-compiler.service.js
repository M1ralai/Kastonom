import { STANDARD_NEGATIVE_INSTRUCTIONS, VIDEO_PROVIDERS } from "../domain/constants.js";
import { validationError } from "../http/errors/api-error.js";
import * as pgStore from "../db/pg-store.js";

// MCP imports - these will be dynamically imported to avoid build issues
let mcpFacade = null;
let mcpModule = null;

/**
 * Dynamically load MCP module
 */
async function getMCPLayer() {
  if (!mcpModule) {
    try {
      mcpModule = await import("../../../mcp/src/index.js");
    } catch (err) {
      console.warn("MCP module not available, using built-in prompt compiler");
      return null;
    }
  }
  return mcpModule;
}

/**
 * Initialize MCP facade with optional LLM key
 */
async function getMCPFacade() {
  if (!mcpFacade) {
    const mcp = await getMCPLayer();
    if (mcp) {
      const llmApiKey = process.env.OPENAI_API_KEY || null;
      mcpFacade = mcp.createMCPFacade({ llmApiKey });
    }
  }
  return mcpFacade;
}

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

/**
 * Compile creative brief to prompt payload using MCP layer
 * Falls back to built-in compilation if MCP is unavailable
 */
export async function compileWithMCP(context, { requestedProvider, creativeSubject, sourceAssets, generationRequest }) {
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

  // Try to use MCP layer for enhanced prompt compilation
  const mcpFacade = await getMCPFacade();

  let promptText, negativePrompt;

  if (mcpFacade) {
    // Use MCP for scoring and brief generation, then compile prompt
    try {
      const productMetrics = {
        sales_velocity: 0,
        search_volume_trend: 0,
        stock_level: "unknown",
        days_to_stock_out: null,
        competitor_signals: [],
        seasonality_factor: 1.0,
        new_product_boost: false,
        return_rate: null,
        average_order_value: null
      };

      // Generate scoring output from MCP
      const scoringOutput = mcpFacade.generateInitialCampaign({
        tenantContext: {
          tenantId: context.tenant_id,
          mode: context.mode || "demo",
          status: "active",
          tier: "standard"
        },
        productId: creativeSubject.id,
        productMetrics
      });

      // Generate creative brief from scoring
      const briefContent = mcpFacade.generateCreativeBrief({
        scoringOutput
      });

      // Compile prompt using MCP
      const mcpPayload = mcpFacade.compilePrompt({
        creativeBrief: briefContent,
        provider,
        durationSeconds: generationRequest.duration_seconds,
        aspectRatio: generationRequest.aspect_ratio,
        language: generationRequest.language
      }, context.tenant_id);

      promptText = mcpPayload.prompt_text;
      negativePrompt = mcpPayload.negative_prompt;

      fallbackNotes.push("mcp_enhanced");

    } catch (mcpError) {
      console.warn("MCP compilation failed, using fallback:", mcpError.message);
      // Fall through to built-in compilation
      const { promptText: builtIn, negativePrompt: builtInNeg } = buildBuiltInPrompt(
        creativeSubject,
        sourceAssets,
        generationRequest
      );
      promptText = builtIn;
      negativePrompt = builtInNeg;
      fallbackNotes.push("mcp_fallback");
    }
  } else {
    // Use built-in prompt compilation
    const { promptText: builtIn, negativePrompt: builtInNeg } = buildBuiltInPrompt(
      creativeSubject,
      sourceAssets,
      generationRequest
    );
    promptText = builtIn;
    negativePrompt = builtInNeg;
    fallbackNotes.push("built_in_compiler");
  }

  // Add asset references to prompt
  const assetReferences = sourceAssets.map((asset) => `${asset.id}:${asset.url}`).join(", ");
  const fullPromptText = [
    promptText,
    `Use source assets as visual references: ${assetReferences}.`,
    "Keep the advertised subject visible in the first second and do not add unsupported product facts."
  ].join(" ");

  const promptPayload = {
    id: ids.uuid(),
    tenant_id: context.tenant_id,
    project_id: generationRequest.project_id,
    generation_request_id: generationRequest.id,
    provider,
    prompt_text: fullPromptText,
    negative_prompt: [
      ...STANDARD_NEGATIVE_INSTRUCTIONS,
      ...creativeSubject.forbidden_claims,
      negativePrompt
    ].join(" "),
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
    created_at: new Date().toISOString()
  };

  // Save to PostgreSQL
  const createdPayload = await pgStore.createPromptPayload(promptPayload);
  return createdPayload;
}

/**
 * Built-in prompt compilation (fallback when MCP is unavailable)
 */
function buildBuiltInPrompt(creativeSubject, sourceAssets, generationRequest) {
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
    `Use only approved claims: ${allowedClaims}.`,
    `Unknown fields: ${unknownFields}.`,
    generationRequest.user_notes ? `User notes: ${generationRequest.user_notes}.` : null
  ]);

  const negativePrompt = compactJoin([
    creativeSubject.forbidden_claims.map(c => `Do not claim: ${c}`)
  ]);

  return { promptText, negativePrompt };
}

/**
 * Simple ID generator for prompt payloads (uses timestamp-based IDs)
 */
function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
        id: ids.uuid(),
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
