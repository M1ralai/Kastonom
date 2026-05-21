import { VIDEO_JOB_STATUSES, VIDEO_PROVIDERS } from "../domain/constants.js";
import { ApiError } from "../http/errors/api-error.js";
import { ErrorCodes } from "../http/errors/error-codes.js";
import { createLogger } from "../logger/index.js";
import { createMcpNetworkClient } from "../integrations/mcp-network-client.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("provider-orchestrator");

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireNormalizedProviderResult(context, result) {
  if (!isObject(result)) {
    throw new ApiError(502, ErrorCodes.PROVIDER_UNAVAILABLE, "MCP provider result was not an object.");
  }

  if (result.tenant_id !== context.tenant_id) {
    throw new ApiError(502, ErrorCodes.PROVIDER_UNAVAILABLE, "MCP provider result tenant did not match request tenant.");
  }

  if (!VIDEO_PROVIDERS.includes(result.provider)) {
    // Allow "mock" in result for backward compatibility during migration
    if (result.provider !== "mock") {
      throw new ApiError(502, ErrorCodes.PROVIDER_UNAVAILABLE, "MCP provider result used an unsupported provider.");
    }
  }

  if (!VIDEO_JOB_STATUSES.includes(result.normalized_status)) {
    throw new ApiError(502, ErrorCodes.PROVIDER_UNAVAILABLE, "MCP provider result used an unsupported status.");
  }

  if (!Array.isArray(result.result_urls) || !result.result_urls.every((url) => typeof url === "string")) {
    throw new ApiError(502, ErrorCodes.PROVIDER_UNAVAILABLE, "MCP provider result URLs were invalid.");
  }
}

function metadataValue(result, key) {
  return isObject(result.redacted_metadata) ? result.redacted_metadata[key] : null;
}

function fallbackReasonFor(result, requestedProvider) {
  const fallbackReason = metadataValue(result, "fallback_reason");
  if (typeof fallbackReason === "string" && fallbackReason.trim() !== "") {
    return fallbackReason;
  }

  if (result.provider === "mock" && requestedProvider !== "mock") {
    return "provider_fallback_to_mock";
  }

  return null;
}

function isMockResult(result) {
  return result.provider === "mock" || metadataValue(result, "is_mock") === true;
}

function terminalCompletedAt(status, now) {
  return ["completed", "failed", "canceled"].includes(status) ? now : null;
}

export function createProviderOrchestratorService({ ids, clock, config }) {
  const mcpNetwork = createMcpNetworkClient({ ids, clock, config });

  async function persistMcpResult(context, {
    project,
    generationRequest,
    promptPayload,
    requestedProvider,
    mcpResult
  }) {
    requireNormalizedProviderResult(context, mcpResult);

    const now = clock.now();
    const fallbackReason = fallbackReasonFor(mcpResult, requestedProvider);
    const isMock = isMockResult(mcpResult);
    const completedAt = terminalCompletedAt(mcpResult.normalized_status, now);

    const createdVideoJob = await pgStore.createVideoJob({
      id: ids.uuid(),
      tenant_id: context.tenant_id,
      project_id: project.id,
      generation_request_id: generationRequest.id,
      prompt_payload_id: promptPayload.id,
      provider: mcpResult.provider,
      status: mcpResult.normalized_status,
      provider_job_id: mcpResult.provider_job_id,
      is_mock: isMock,
      fallback_reason: fallbackReason,
      error_code: mcpResult.error_code,
      error_message: mcpResult.error_message,
      attempt_count: 1
    });

    const videoJob = await pgStore.updateVideoJob(createdVideoJob.id, context.tenant_id, {
      status: mcpResult.normalized_status,
      provider_job_id: mcpResult.provider_job_id,
      fallback_reason: fallbackReason,
      error_code: mcpResult.error_code,
      error_message: mcpResult.error_message,
      attempt_count: 1,
      submitted_at: now,
      completed_at: completedAt
    }) ?? createdVideoJob;

    const providerResult = await pgStore.createProviderResult({
      id: ids.uuid(),
      tenant_id: context.tenant_id,
      video_job_id: videoJob.id,
      provider: mcpResult.provider,
      provider_job_id: mcpResult.provider_job_id,
      raw_status: mcpResult.raw_status,
      normalized_status: mcpResult.normalized_status,
      result_urls: mcpResult.result_urls,
      error_code: mcpResult.error_code,
      error_message: mcpResult.error_message,
      redacted_metadata: {
        ...(isObject(mcpResult.redacted_metadata) ? mcpResult.redacted_metadata : {}),
        requested_provider: requestedProvider,
        mcp_network: true
      }
    });

    const generatedVideos = [];
    if (mcpResult.normalized_status === "completed") {
      for (const url of mcpResult.result_urls) {
        generatedVideos.push(await pgStore.createGeneratedVideo({
          id: ids.uuid(),
          tenant_id: context.tenant_id,
          project_id: project.id,
          generation_request_id: generationRequest.id,
          video_job_id: videoJob.id,
          provider_result_id: providerResult.id,
          url,
          thumbnail_url: null,
          duration_seconds: generationRequest.duration_seconds,
          aspect_ratio: generationRequest.aspect_ratio,
          status: "generated",
          is_selected: false,
          is_mock: isMock
        }));
      }
    }

    log.info("MCP provider result persisted", {
      tenant_id: context.tenant_id,
      provider: mcpResult.provider,
      status: mcpResult.normalized_status,
      is_mock: isMock,
      generated_video_count: generatedVideos.length
    });

    return {
      video_job: videoJob,
      provider_result: providerResult,
      generated_videos: generatedVideos,
      fallback_reason: fallbackReason
    };
  }

  return {
    async createVideoJob(context, { project, generationRequest, promptPayload, requestedProvider }) {
      const mcpResult = await mcpNetwork.executeSubmission(context, promptPayload);

      return persistMcpResult(context, {
        project,
        generationRequest,
        promptPayload,
        requestedProvider,
        mcpResult
      });
    }
  };
}
