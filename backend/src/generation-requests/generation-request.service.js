import { ASPECT_RATIOS, OBJECTIVES, PLATFORMS, VIDEO_PROVIDERS } from "../domain/constants.js";
import {
  enumValue,
  optionalString,
  requireArray,
  requireInteger,
  requireObject,
  requireString,
  stringArray
} from "../domain/validation.js";
import { ErrorCodes } from "../http/errors/error-codes.js";
import { notFound, validationError } from "../http/errors/api-error.js";
import { createProviderOrchestratorService } from "../providers/provider-orchestrator.service.js";
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("generation-request");

export function createGenerationRequestService({
  ids,
  clock,
  config,
  creativeProjects,
  promptCompiler
}) {
  function fallbackNotesFor(subject, input) {
    const notes = [];
    for (const field of subject.unknown_fields ?? []) {
      notes.push(`${field}_unknown`);
    }
    if (!input.target_audience) {
      notes.push("target_audience_unknown");
    }
    if (!input.tone) {
      notes.push("tone_not_provided");
    }
    if (!input.style) {
      notes.push("style_not_provided");
    }
    if (!input.call_to_action) {
      notes.push("call_to_action_not_provided");
    }
    return Array.from(new Set(notes));
  }

  // Cost calculation constants
  const BASE_CREDIT_COST = 1;
  const PLATFORM_COST_MULTIPLIERS = {
    tiktok: 1.0,
    reels: 1.0,
    youtube_shorts: 1.1,
    meta_ads: 1.2,
    google_ads: 1.3
  };
  const DURATION_COST_MULTIPLIERS = {
    15: 1.0,
    30: 1.5,
    60: 2.0
  };
  const ASPECT_RATIO_COST_MULTIPLIERS = {
    "9:16": 1.0,
    "1:1": 0.9,
    "4:5": 0.9,
    "16:9": 0.8
  };
  const BASE_CREDIT_PRICE_TRY = 85; // Base price in TRY
  const MAX_PRICE_MULTIPLIER = 1.4; // Max 40% markup

  return {
    async create(context, body) {
      const input = requireObject(body, "request body");
      const projectId = requireString(input.project_id, "project_id");
      const sourceAssetIds = stringArray(input.source_asset_ids, "source_asset_ids", {
        minLength: 1
      });
      const provider = input.provider ?? config.defaultVideoProvider;
      if (!VIDEO_PROVIDERS.includes(provider)) {
        if (!context.fallback_enabled) {
          throw validationError("Unsupported video provider.", { error: "INVALID_REQUEST" });
        }
      }

      // Get project and subject from PostgreSQL
      const project = await creativeProjects.getProject(context, projectId);
      const creativeSubject = await creativeProjects.getSubjectForProject(context, projectId);

      // Get source assets
      const assets = await pgStore.listAssets(context.tenant_id, project.id);
      const sourceAssets = sourceAssetIds.map((assetId) => {
        const asset = assets.find(a => a.id === assetId);
        if (!asset || asset.project_id !== project.id) {
          throw notFound(ErrorCodes.SOURCE_ASSET_NOT_FOUND, "Source asset was not found.");
        }
        return asset;
      });

      const now = clock.now();
      const generationRequest = {
        id: ids.uuid(),
        tenant_id: context.tenant_id,
        project_id: project.id,
        creative_subject_id: creativeSubject.id,
        source_asset_ids: sourceAssetIds,
        status: "draft",
        objective: enumValue(input.objective, "objective", OBJECTIVES),
        target_audience: optionalString(input.target_audience, "target_audience"),
        platform: enumValue(input.platform ?? config.defaultPlatform, "platform", PLATFORMS),
        language: requireString(input.language ?? config.defaultLanguage, "language"),
        tone: optionalString(input.tone, "tone"),
        style: optionalString(input.style, "style"),
        call_to_action: optionalString(input.call_to_action, "call_to_action"),
        duration_seconds: requireInteger(
          input.duration_seconds ?? config.defaultDurationSeconds,
          "duration_seconds"
        ),
        aspect_ratio: enumValue(input.aspect_ratio ?? config.defaultAspectRatio, "aspect_ratio", ASPECT_RATIOS),
        user_notes: optionalString(input.user_notes, "user_notes"),
        fallback_notes: [],
        created_at: now,
        updated_at: now
      };
      generationRequest.fallback_notes = fallbackNotesFor(creativeSubject, generationRequest);

      // Save to PostgreSQL
      const createdRequest = await pgStore.createGenerationRequest(generationRequest);

      // Update project status
      await pgStore.updateProject(project.id, context.tenant_id, {
        status: "generating",
        latest_generation_request_id: createdRequest.id
      });

      try {
        // Compile prompt
        const promptPayload = await promptCompiler.compile(context, {
          requestedProvider: provider,
          creativeSubject,
          sourceAssets,
          generationRequest: createdRequest
        });

        // Update request status to prompt_compiled
        const promptCompiledRequest = await pgStore.updateGenerationRequest(
          createdRequest.id,
          context.tenant_id,
          { status: "prompt_compiled" }
        );

        // Use provider orchestrator to create video job
        const providerOrchestrator = createProviderOrchestratorService({
          ids,
          clock,
          config
        });

        const providerOutput = await providerOrchestrator.createVideoJob(context, {
          project,
          generationRequest: promptCompiledRequest,
          promptPayload,
          requestedProvider: provider
        });

        const finalStatus =
          providerOutput.video_job.status === "completed"
            ? "completed"
            : providerOutput.video_job.status === "failed"
              ? "failed"
              : "generating";

        // Update request and project status
        await pgStore.updateGenerationRequest(createdRequest.id, context.tenant_id, {
          status: finalStatus
        });

        await pgStore.updateProject(project.id, context.tenant_id, {
          status: finalStatus === "completed" ? "ready" : finalStatus,
          latest_generation_request_id: createdRequest.id
        });

        return {
          generation_request: { ...createdRequest, status: finalStatus },
          prompt_payload: promptPayload,
          video_job: providerOutput.video_job,
          provider_result: providerOutput.provider_result,
          generated_videos: providerOutput.generated_videos,
          fallback_reason: providerOutput.fallback_reason ?? null
        };
      } catch (error) {
        await pgStore.updateGenerationRequest(createdRequest.id, context.tenant_id, {
          status: "failed"
        });

        await pgStore.updateProject(project.id, context.tenant_id, {
          status: "failed",
          latest_generation_request_id: createdRequest.id
        });
        throw error;
      }
    },

    /**
     * Estimate cost for a generation request
     * Returns estimated credits and cost in local currency
     */
    async estimateCost(context, body) {
      const input = requireObject(body, "request body");

      const platform = enumValue(input.platform, "platform", PLATFORMS);
      const durationSeconds = requireInteger(input.duration_seconds, "duration_seconds");
      const aspectRatio = enumValue(input.aspect_ratio, "aspect_ratio", ASPECT_RATIOS);

      log.info("Estimating generation cost", {
        tenant_id: context.tenant_id,
        platform,
        duration_seconds: durationSeconds,
        aspect_ratio: aspectRatio
      });

      // Calculate credit cost
      const platformMultiplier = PLATFORM_COST_MULTIPLIERS[platform] || 1.0;
      const durationMultiplier = DURATION_COST_MULTIPLIERS[durationSeconds] || 1.0;
      const aspectMultiplier = ASPECT_RATIO_COST_MULTIPLIERS[aspectRatio] || 1.0;

      const estimatedCredits = Math.ceil(
        BASE_CREDIT_COST * platformMultiplier * durationMultiplier * aspectMultiplier
      );

      // Calculate cost in TRY
      const estimatedCost = Math.round(BASE_CREDIT_PRICE_TRY * platformMultiplier * durationMultiplier * aspectMultiplier);
      const maxAmount = Math.round(estimatedCost * MAX_PRICE_MULTIPLIER);

      log.info("Cost estimate calculated", {
        estimated_credits: estimatedCredits,
        estimated_cost: estimatedCost
      });

      return {
        estimated_credits: estimatedCredits,
        estimated_cost: {
          amount: estimatedCost,
          currency: "TRY",
          max_amount: maxAmount
        }
      };
    }
  };
}