import { configurationMissing } from "../http/errors/api-error.js";

function providerConfigError(provider, fallbackAvailable) {
  return configurationMissing(
    "PROVIDER_CONFIG_MISSING",
    `${provider} provider configuration is missing.`,
    { fallbackAvailable }
  );
}

export function createProviderOrchestratorService({ store, ids, clock, config }) {
  function createMockResult(context, { project, generationRequest, promptPayload, requestedProvider, fallbackReason }) {
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
      fallback_reason: fallbackReason,
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
      fallback_reason: fallbackReason
    };
  }

  function createFailedResult(context, { project, generationRequest, promptPayload, provider, errorCode, message }) {
    const now = clock.now();
    const videoJob = {
      id: ids.next("video-job"),
      tenant_id: context.tenant_id,
      project_id: project.id,
      generation_request_id: generationRequest.id,
      prompt_payload_id: promptPayload.id,
      provider,
      status: "failed",
      provider_job_id: null,
      is_mock: false,
      fallback_reason: null,
      error_code: errorCode,
      error_message: message,
      attempt_count: 1,
      created_at: now,
      submitted_at: null,
      completed_at: now,
      updated_at: now
    };

    const providerResult = {
      id: ids.next("provider-result"),
      tenant_id: context.tenant_id,
      video_job_id: videoJob.id,
      provider,
      provider_job_id: null,
      raw_status: "failed",
      normalized_status: "failed",
      result_urls: [],
      error_code: errorCode,
      error_message: message,
      redacted_metadata: {
        adapter: provider,
        redacted: true
      },
      received_at: now
    };

    store.insert("videoJobs", videoJob);
    store.insert("providerResults", providerResult);
    return { video_job: videoJob, provider_result: providerResult, generated_videos: [] };
  }

  return {
    createVideoJob(context, { project, generationRequest, promptPayload, requestedProvider }) {
      const provider = promptPayload.provider;

      if (provider === "mock") {
        return createMockResult(context, {
          project,
          generationRequest,
          promptPayload,
          requestedProvider,
          fallbackReason: requestedProvider === "mock" ? null : "provider_fallback_to_mock"
        });
      }

      const readiness = config.videoProviderReadiness[provider];
      if (!readiness?.ready) {
        if (context.fallback_enabled) {
          return createMockResult(context, {
            project,
            generationRequest,
            promptPayload,
            requestedProvider: provider,
            fallbackReason: "provider_config_missing_fallback_to_mock"
          });
        }

        createFailedResult(context, {
          project,
          generationRequest,
          promptPayload,
          provider,
          errorCode: "PROVIDER_CONFIG_MISSING",
          message: `${provider} provider configuration is missing.`
        });
        throw providerConfigError(provider, false);
      }

      if (context.fallback_enabled) {
        return createMockResult(context, {
          project,
          generationRequest,
          promptPayload,
          requestedProvider: provider,
          fallbackReason: "live_provider_not_enabled_fallback_to_mock"
        });
      }

      createFailedResult(context, {
        project,
        generationRequest,
        promptPayload,
        provider,
        errorCode: "PROVIDER_UNAVAILABLE",
        message: "Live provider submissions are not enabled in this MVP backend."
      });
      throw configurationMissing(
        "PROVIDER_UNAVAILABLE",
        "Live provider submissions are not enabled in this MVP backend.",
        { fallbackAvailable: false }
      );
    }
  };
}
