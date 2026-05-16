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

export function createGenerationRequestService({
  store,
  ids,
  clock,
  config,
  creativeProjects,
  promptCompiler,
  providerOrchestrator
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
    create(context, body) {
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

      const project = creativeProjects.getProject(context, projectId);
      const creativeSubject = creativeProjects.getSubjectForProject(context, projectId);
      const sourceAssets = sourceAssetIds.map((assetId) => {
        const asset = store.getByTenant("sourceAssets", context.tenant_id, assetId);
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

      store.insert("generationRequests", generationRequest);
      store.updateByTenant("creativeProjects", context.tenant_id, project.id, (current) => ({
        ...current,
        status: "generating",
        latest_generation_request_id: generationRequest.id,
        updated_at: clock.now()
      }));

      try {
        const promptPayload = promptCompiler.compile(context, {
          requestedProvider: provider,
          creativeSubject,
          sourceAssets,
          generationRequest
        });

        const promptCompiledRequest = store.updateByTenant(
          "generationRequests",
          context.tenant_id,
          generationRequest.id,
          (current) => ({
            ...current,
            status: "prompt_compiled",
            updated_at: clock.now()
          })
        );

        const providerOutput = providerOrchestrator.createVideoJob(context, {
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

        const finalRequest = store.updateByTenant(
          "generationRequests",
          context.tenant_id,
          generationRequest.id,
          (current) => ({
            ...current,
            status: finalStatus,
            updated_at: clock.now()
          })
        );

        store.updateByTenant("creativeProjects", context.tenant_id, project.id, (current) => ({
          ...current,
          status: finalStatus === "completed" ? "ready" : finalStatus,
          latest_generation_request_id: finalRequest.id,
          updated_at: clock.now()
        }));

        return {
          generation_request: finalRequest,
          prompt_payload: promptPayload,
          video_job: providerOutput.video_job,
          provider_result: providerOutput.provider_result,
          generated_videos: providerOutput.generated_videos,
          fallback_reason: providerOutput.fallback_reason ?? null
        };
      } catch (error) {
        store.updateByTenant("generationRequests", context.tenant_id, generationRequest.id, (current) => ({
          ...current,
          status: "failed",
          updated_at: clock.now()
        }));
        store.updateByTenant("creativeProjects", context.tenant_id, project.id, (current) => ({
          ...current,
          status: "failed",
          latest_generation_request_id: generationRequest.id,
          updated_at: clock.now()
        }));
        throw error;
      }
    }
  };
}
