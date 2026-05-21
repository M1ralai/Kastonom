import { configurationMissing } from "../http/errors/api-error.js";
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("provider-orchestrator");

function providerConfigError(provider, fallbackAvailable) {
  return configurationMissing(
    "PROVIDER_CONFIG_MISSING",
    `${provider} provider configuration is missing.`,
    { fallbackAvailable }
  );
}

export function createProviderOrchestratorService({ ids, clock, config }) {
  async function createMockResult(context, { project, generationRequest, promptPayload, requestedProvider, fallbackReason }) {
    const now = clock.now();
    const providerJobId = `mock-job-${generationRequest.id}`;

    const videoJob = {
      id: ids.uuid(),
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
      id: ids.uuid(),
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
      id: ids.uuid(),
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

    // Save to PostgreSQL
    const createdVideoJob = await pgStore.createVideoJob(videoJob);
    const createdProviderResult = await pgStore.createProviderResult(providerResult);
    const createdVideo = await pgStore.createGeneratedVideo({
      ...generatedVideo,
      provider_result_id: createdProviderResult.id
    });

    return {
      video_job: createdVideoJob,
      provider_result: createdProviderResult,
      generated_videos: [createdVideo],
      fallback_reason: fallbackReason
    };
  }

  async function createFailedResult(context, { project, generationRequest, promptPayload, provider, errorCode, message }) {
    const now = clock.now();
    const videoJob = {
      id: ids.uuid(),
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
      id: ids.uuid(),
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

    // Save to PostgreSQL
    const createdVideoJob = await pgStore.createVideoJob(videoJob);
    const createdProviderResult = await pgStore.createProviderResult(providerResult);

    return {
      video_job: createdVideoJob,
      provider_result: createdProviderResult,
      generated_videos: []
    };
  }

  return {
    async createVideoJob(context, { project, generationRequest, promptPayload, requestedProvider }) {
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

        return createFailedResult(context, {
          project,
          generationRequest,
          promptPayload,
          provider,
          errorCode: "PROVIDER_CONFIG_MISSING",
          message: `${provider} provider configuration is missing.`
        });
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

      return createFailedResult(context, {
        project,
        generationRequest,
        promptPayload,
        provider,
        errorCode: "PROVIDER_UNAVAILABLE",
        message: "Live provider submissions are not enabled in this MVP backend."
      });
    }
  };
}
