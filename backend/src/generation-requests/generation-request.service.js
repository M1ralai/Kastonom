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

  function createMockVideoJobResult(context, { project, generationRequest, promptPayload, requestedProvider }) {
    const now = clock.now();
    const providerJobId = `mock-job-${generationRequest.id}`;

    const videoJob = {
      id: ids.next("video-job"),
      tenant_id: context.tenant_id,
      project_id: project.id,
      generation_request_id: generationRequest.id,
      prompt_payload_id: promptPayload.id,
      provider: "mock",
      status: "completed",
      provider_job_id: providerJobId,
      is_mock: true,
      fallback_reason: requestedProvider === "mock" ? null : "provider_fallback_to_mock",
      error_code: null,
      error_message: null,
      attempt_count: 1,
      created_at: now,
      submitted_at: now,
      completed_at: now,
      updated_at: now
    };

    const providerResult = {
      id: ids.next("provider-result"),
      tenant_id: context.tenant_id,
      video_job_id: videoJob.id,
      provider: "mock",
      provider_job_id: providerJobId,
      raw_status: "mock_completed",
      normalized_status: "completed",
      result_urls: [config.mockPreviewUrl],
      error_code: null,
      error_message: null,
      redacted_metadata: {
        adapter: "mock",
        requested_provider: requestedProvider,
        is_mock: true
      },
      received_at: now
    };

    const generatedVideo = {
      id: ids.next("generated-video"),
      tenant_id: context.tenant_id,
      project_id: project.id,
      generation_request_id: generationRequest.id,
      video_job_id: videoJob.id,
      provider_result_id: providerResult.id,
      url: config.mockPreviewUrl,
      thumbnail_url: null,
      duration_seconds: generationRequest.duration_seconds,
      aspect_ratio: generationRequest.aspect_ratio,
      status: "generated",
      is_selected: false,
      is_mock: true,
      created_at: now,
      selected_at: null
    };

    store.insert("videoJobs", videoJob);
    store.insert("providerResults", providerResult);
    store.insert("generatedVideos", generatedVideo);

    return {
      video_job: videoJob,
      provider_result: providerResult,
      generated_videos: [generatedVideo],
      fallback_reason: videoJob.fallback_reason
    };
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

        // TODO: MCP-007 implementation will replace this mock provider call
        // For now, use mock provider for demo purposes
        // When MCP is implemented, this will call MCP-006 facade
        const providerOutput = createMockVideoJobResult(context, {
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