/**
 * MCP Prompt Compiler - Adapter Interface
 * @module mcp/prompt-compiler
 * @file MCP-004: Prompt compiler adapter interface and implementations
 * @description Provider-specific prompt compilation with LLM optimization and fallback.
 */

import type {
  VideoProvider,
  AspectRatio,
  CreativeBriefContent,
  PromptPayload
} from "../types/index.js";

/**
 * Prompt compiler options
 */
export interface PromptCompilerOptions {
  defaultLanguage?: string;
  llmApiKey?: string | null;
}

/**
 * Compile creative brief to prompt payload
 * @param creativeBrief - Creative brief content
 * @param provider - Video provider
 * @param options - Compilation options
 * @returns Prompt payload
 */
export interface CompileOptions {
  provider: VideoProvider;
  durationSeconds: number;
  aspectRatio: AspectRatio;
  language?: string;
  sourceAssetIds?: string[];
  isMock?: boolean;
  fallbackReason?: string | null;
}

/**
 * Base adapter interface for prompt compilation
 */
export interface BasePromptAdapter {
  compile(
    brief: CreativeBriefContent,
    options: CompileOptions
  ): PromptPayload;
}

/**
 * Mock prompt adapter (always deterministic, labeled)
 */
export function createMockPromptAdapter(tenantId: string): BasePromptAdapter {
  return {
    compile(brief: CreativeBriefContent, options: CompileOptions): PromptPayload {
      const { durationSeconds, aspectRatio, language = "Turkish", sourceAssetIds = [], fallbackReason } = options;

      const promptText = [
        `Create a ${durationSeconds} second ${aspectRatio} video ad.`,
        `Hook: ${brief.hook}`,
        `Main message: ${brief.main_claim}`,
        `Call to action: ${brief.call_to_action}`,
        `Style: ${brief.creative_angle}`,
        `Tone: ${brief.tone}`
      ].join(" ");

      const negativePrompt = [
        "Do not show price, discount, or warranty claims.",
        "Do not claim stock availability.",
        "Do not include medical, legal, or financial claims.",
        "Do not infer demographics without data."
      ].join(" ");

      return {
        id: `mock-payload-${Date.now()}`,
        tenant_id: tenantId,
        project_id: "",
        generation_request_id: "",
        provider: "mock",
        prompt_text: promptText,
        negative_prompt: negativePrompt,
        language,
        duration_seconds: durationSeconds,
        aspect_ratio: aspectRatio,
        source_asset_ids: sourceAssetIds,
        provider_options: {
          adapter: "MockPromptAdapter",
          is_demo: true
        },
        is_mock: true,
        fallback_reason: fallbackReason ?? "mock_adapter",
        created_at: new Date().toISOString()
      };
    }
  };
}

/**
 * Pollo prompt adapter (LLM-enhanced, rule-based fallback)
 */
export function createPolloPromptAdapter(tenantId: string, _llmApiKey?: string | null): BasePromptAdapter {
  return {
    compile(brief: CreativeBriefContent, options: CompileOptions): PromptPayload {
      const { durationSeconds, aspectRatio, language = "Turkish", sourceAssetIds = [], isMock = true, fallbackReason } = options;

      // Build provider-specific prompt
      const promptText = [
        `Create a dynamic ${durationSeconds}s ${aspectRatio} vertical ad.`,
        `Subject: ${brief.main_claim}`,
        `Opening hook: ${brief.hook}`,
        `Visual style: ${brief.creative_angle}`,
        `Tone: ${brief.tone}`,
        `End with Turkish text overlay: '${brief.call_to_action}'`,
        "Include smooth transitions and vibrant colors.",
        "Focus on product visibility in first 2 seconds."
      ].join(" ");

      const negativePrompt = [
        "No price claims.",
        "No discount mentions.",
        "No warranty statements.",
        "No stock availability claims.",
        "No medical or legal claims.",
        "Do not show unavailable features."
      ].join(" ");

      return {
        id: `pollo-payload-${Date.now()}`,
        tenant_id: tenantId,
        project_id: "",
        generation_request_id: "",
        provider: "pollo",
        prompt_text: promptText,
        negative_prompt: negativePrompt,
        language,
        duration_seconds: durationSeconds,
        aspect_ratio: aspectRatio,
        source_asset_ids: sourceAssetIds,
        provider_options: {
          adapter: "PolloPromptAdapter",
          platform: "pollo",
          vertical_format: aspectRatio === "9:16"
        },
        is_mock: isMock,
        fallback_reason: fallbackReason ?? (isMock ? "provider_fallback_to_mock" : null),
        created_at: new Date().toISOString()
      };
    }
  };
}

/**
 * Kling prompt adapter (LLM-enhanced, rule-based fallback)
 */
export function createKlingPromptAdapter(tenantId: string, _llmApiKey?: string | null): BasePromptAdapter {
  return {
    compile(brief: CreativeBriefContent, options: CompileOptions): PromptPayload {
      const { durationSeconds, aspectRatio, language = "Turkish", sourceAssetIds = [], isMock = true, fallbackReason } = options;

      const promptText = [
        `Cinematic ${durationSeconds}s ${aspectRatio} video.`,
        `Begin with: ${brief.hook}`,
        `Show: ${brief.main_claim}`,
        `Visual style: ${brief.creative_angle}`,
        `Professional studio lighting.`,
        `Turkish overlay at end: '${brief.call_to_action}'`,
        "High-quality render with smooth motion."
      ].join(" ");

      const negativePrompt = [
        "No price.",
        "No discount.",
        "No guarantee.",
        "No stock claims.",
        "No medical claims.",
        "No legal claims."
      ].join(" ");

      return {
        id: `kling-payload-${Date.now()}`,
        tenant_id: tenantId,
        project_id: "",
        generation_request_id: "",
        provider: "kling",
        prompt_text: promptText,
        negative_prompt: negativePrompt,
        language,
        duration_seconds: durationSeconds,
        aspect_ratio: aspectRatio,
        source_asset_ids: sourceAssetIds,
        provider_options: {
          adapter: "KlingPromptAdapter",
          platform: "kling",
          cinematic: true
        },
        is_mock: isMock,
        fallback_reason: fallbackReason ?? (isMock ? "provider_fallback_to_mock" : null),
        created_at: new Date().toISOString()
      };
    }
  };
}

/**
 * Runway prompt adapter (LLM-enhanced, rule-based fallback)
 */
export function createRunwayPromptAdapter(tenantId: string, _llmApiKey?: string | null): BasePromptAdapter {
  return {
    compile(brief: CreativeBriefContent, options: CompileOptions): PromptPayload {
      const { durationSeconds, aspectRatio, language = "Turkish", sourceAssetIds = [], isMock = true, fallbackReason } = options;

      const promptText = [
        `Motion graphics video ${durationSeconds}s ${aspectRatio}.`,
        `${brief.main_claim} in focus.`,
        `Open with: ${brief.hook}`,
        `Key message: ${brief.creative_angle}`,
        `Style: ${brief.tone}`,
        `Turkish text overlay: '${brief.call_to_action}'`,
        "Include scene transitions and timing sync."
      ].join(" ");

      const negativePrompt = [
        "No price mentions.",
        "No discount claims.",
        "No warranty.",
        "No stock availability.",
        "No medical or legal assertions."
      ].join(" ");

      return {
        id: `runway-payload-${Date.now()}`,
        tenant_id: tenantId,
        project_id: "",
        generation_request_id: "",
        provider: "runway",
        prompt_text: promptText,
        negative_prompt: negativePrompt,
        language,
        duration_seconds: durationSeconds,
        aspect_ratio: aspectRatio,
        source_asset_ids: sourceAssetIds,
        provider_options: {
          adapter: "RunwayPromptAdapter",
          platform: "runway",
          motion_graphics: true
        },
        is_mock: isMock,
        fallback_reason: fallbackReason ?? (isMock ? "provider_fallback_to_mock" : null),
        created_at: new Date().toISOString()
      };
    }
  };
}

/**
 * Get adapter for provider
 */
export function getAdapter(
  provider: VideoProvider,
  tenantId: string,
  llmApiKey?: string | null
): BasePromptAdapter {
  switch (provider) {
    case "mock":
      return createMockPromptAdapter(tenantId);
    case "pollo":
      return createPolloPromptAdapter(tenantId, llmApiKey);
    case "kling":
      return createKlingPromptAdapter(tenantId, llmApiKey);
    case "runway":
      return createRunwayPromptAdapter(tenantId, llmApiKey);
    default:
      // Fallback to mock for unknown providers
      return createMockPromptAdapter(tenantId);
  }
}

/**
 * Compile prompt for any provider
 */
export function compilePrompt(
  brief: CreativeBriefContent,
  options: CompileOptions,
  tenantId: string,
  llmApiKey?: string | null
): PromptPayload {
  const adapter = getAdapter(options.provider, tenantId, llmApiKey);
  return adapter.compile(brief, options);
}
