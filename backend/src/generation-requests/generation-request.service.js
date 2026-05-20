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
          throw notFound("SOURCE_ASSET_NOT_FOUND", "Source asset was not found.");
        }
        return asset;
      });

      const now = clock.now();
      const generationRequest = {
        id: ids.next("generation-request"),
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
    }
  };
}
