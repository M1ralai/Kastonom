import { notFound } from "../http/errors/api-error.js";
import { createLogger } from "../logger/index.js";
import { createMcpNetworkClient } from "../integrations/mcp-network-client.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("video-job");
const TERMINAL_STATUSES = new Set(["completed", "failed", "canceled"]);

function shouldPollProvider(videoJob) {
  return (
    videoJob
    && !videoJob.is_mock
    && videoJob.provider !== "mock"
    && videoJob.provider_job_id
    && !TERMINAL_STATUSES.has(videoJob.status)
  );
}

function isUnpollableLiveJob(videoJob) {
  return (
    videoJob
    && !videoJob.is_mock
    && videoJob.provider !== "mock"
    && !videoJob.provider_job_id
    && !TERMINAL_STATUSES.has(videoJob.status)
  );
}

function redactedMetadata(providerResult, updates = {}) {
  const current = providerResult?.redacted_metadata;
  return {
    ...(current && typeof current === "object" ? current : {}),
    ...updates
  };
}

export function createVideoJobService({ ids, clock, config }) {
  const mcpNetwork = createMcpNetworkClient({ ids, clock, config });

  async function maybeRefreshFromProvider(context, videoJob) {
    if (isUnpollableLiveJob(videoJob)) {
      const message = "Provider did not return a pollable task id.";
      const now = clock.now();
      const updatedJob = await pgStore.updateVideoJob(videoJob.id, context.tenant_id, {
        status: "failed",
        error_code: "PROVIDER_TASK_ID_MISSING",
        error_message: message,
        completed_at: now
      }) ?? videoJob;

      const existingResult = await pgStore.getProviderResultByVideoJobId(videoJob.id, context.tenant_id);
      if (existingResult) {
        await pgStore.updateProviderResult(existingResult.id, context.tenant_id, {
          normalized_status: "failed",
          error_code: "PROVIDER_TASK_ID_MISSING",
          error_message: message,
          redacted_metadata: redactedMetadata(existingResult, {
            mcp_status_poll: true,
            unpollable_provider_job: true
          })
        });
      }

      await pgStore.updateGenerationRequest(videoJob.generation_request_id, context.tenant_id, {
        status: "failed"
      });
      await pgStore.updateProject(videoJob.project_id, context.tenant_id, {
        status: "failed",
        latest_generation_request_id: videoJob.generation_request_id
      });

      return updatedJob;
    }

    if (!shouldPollProvider(videoJob)) {
      return videoJob;
    }

    try {
      const providerStatus = await mcpNetwork.getJobStatus(
        context,
        videoJob.provider,
        videoJob.provider_job_id
      );
      const now = clock.now();
      const resultUrls = providerStatus.videoUrl ? [providerStatus.videoUrl] : undefined;
      const status = providerStatus.status;

      const updatedJob = await pgStore.updateVideoJob(videoJob.id, context.tenant_id, {
        status,
        error_code: status === "failed" ? "VIDEO_GENERATION_FAILED" : null,
        error_message: status === "failed" ? providerStatus.error ?? "Provider reported failure." : null,
        attempt_count: (videoJob.attempt_count ?? 0) + 1,
        completed_at: TERMINAL_STATUSES.has(status) ? now : null
      });

      const existingResult = await pgStore.getProviderResultByVideoJobId(videoJob.id, context.tenant_id);
      let providerResult = existingResult;
      if (existingResult) {
        providerResult = await pgStore.updateProviderResult(existingResult.id, context.tenant_id, {
          raw_status: status,
          normalized_status: status,
          result_urls: resultUrls ?? existingResult.result_urls,
          error_code: status === "failed" ? "VIDEO_GENERATION_FAILED" : null,
          error_message: status === "failed" ? providerStatus.error ?? "Provider reported failure." : null,
          redacted_metadata: redactedMetadata(existingResult, {
            mcp_status_poll: true
          })
        });
      } else {
        providerResult = await pgStore.createProviderResult({
          id: ids.uuid(),
          tenant_id: context.tenant_id,
          video_job_id: videoJob.id,
          provider: videoJob.provider,
          provider_job_id: videoJob.provider_job_id,
          raw_status: status,
          normalized_status: status,
          result_urls: resultUrls ?? [],
          error_code: status === "failed" ? "VIDEO_GENERATION_FAILED" : null,
          error_message: status === "failed" ? providerStatus.error ?? "Provider reported failure." : null,
          redacted_metadata: {
            mcp_status_poll: true
          }
        });
      }

      if (status === "completed" && providerStatus.videoUrl) {
        const existingVideos = await pgStore.listGeneratedVideos(context.tenant_id, videoJob.project_id);
        const videoExists = existingVideos.some((video) => video.video_job_id === videoJob.id && video.url === providerStatus.videoUrl);

        if (!videoExists) {
          await pgStore.createGeneratedVideo({
            id: ids.uuid(),
            tenant_id: context.tenant_id,
            project_id: videoJob.project_id,
            generation_request_id: videoJob.generation_request_id,
            video_job_id: videoJob.id,
            provider_result_id: providerResult.id,
            url: providerStatus.videoUrl,
            thumbnail_url: null,
            duration_seconds: null,
            aspect_ratio: "unknown",
            status: "generated",
            is_selected: false,
            is_mock: false
          });
        }
      }

      if (status === "completed") {
        await pgStore.updateGenerationRequest(videoJob.generation_request_id, context.tenant_id, {
          status: "completed"
        });
        await pgStore.updateProject(videoJob.project_id, context.tenant_id, {
          status: "ready",
          latest_generation_request_id: videoJob.generation_request_id
        });
      } else if (status === "failed") {
        await pgStore.updateGenerationRequest(videoJob.generation_request_id, context.tenant_id, {
          status: "failed"
        });
        await pgStore.updateProject(videoJob.project_id, context.tenant_id, {
          status: "failed",
          latest_generation_request_id: videoJob.generation_request_id
        });
      }

      return updatedJob ?? videoJob;
    } catch (error) {
      log.warn("Returning stored video job after MCP status refresh failed", {
        tenant_id: context.tenant_id,
        job_id: videoJob.id,
        provider: videoJob.provider,
        error: error.message
      });
      return videoJob;
    }
  }

  return {
    async get(context, id) {
      const storedVideoJob = await pgStore.getVideoJobById(id, context.tenant_id);
      if (!storedVideoJob) {
        throw notFound("VIDEO_JOB_NOT_FOUND", "Video job was not found.");
      }

      const videoJob = await maybeRefreshFromProvider(context, storedVideoJob);
      const providerResult = await pgStore.getProviderResultByVideoJobId(videoJob.id, context.tenant_id);
      const generatedVideos = await pgStore.listGeneratedVideos(context.tenant_id, null);
      const jobVideos = generatedVideos.filter(v => v.video_job_id === videoJob.id);

      return {
        video_job: videoJob,
        provider_result: providerResult ?? null,
        generated_videos: jobVideos,
        fallback_reason: videoJob.fallback_reason ?? null
      };
    },

    /**
     * Get full video job details with project, subject, and generation request
     * Returns complete information for PreviewPage
     */
    async getFull(context, jobId) {
      const storedVideoJob = await pgStore.getVideoJobById(jobId, context.tenant_id);
      if (!storedVideoJob) {
        throw notFound("VIDEO_JOB_NOT_FOUND", "Video job was not found.");
      }

      const videoJob = await maybeRefreshFromProvider(context, storedVideoJob);

      // Get project
      const project = await pgStore.getProjectById(videoJob.project_id, context.tenant_id);
      if (!project) {
        throw notFound("CREATIVE_PROJECT_NOT_FOUND", "Creative project was not found.");
      }

      // Get subject
      const subjects = await pgStore.listSubjects(context.tenant_id, videoJob.project_id);
      const creativeSubject = subjects.length > 0 ? subjects[0] : null;

      // Get generated videos for this job
      const allVideos = await pgStore.listGeneratedVideos(context.tenant_id, videoJob.project_id);
      const generatedVideos = allVideos.filter(v => v.video_job_id === videoJob.id);

      // Get generation request for details (tone, style, CTA)
      const generationRequests = await pgStore.listGenerationRequests(
        context.tenant_id,
        videoJob.project_id
      );
      const generationRequest = generationRequests.find(r => r.id === videoJob.generation_request_id);

      log.info("Full video job retrieved", {
        tenant_id: context.tenant_id,
        job_id: jobId,
        project_id: videoJob.project_id
      });

      return {
        video_job: {
          id: videoJob.id,
          status: videoJob.status,
          provider: videoJob.provider,
          is_mock: videoJob.is_mock,
          fallback_reason: videoJob.fallback_reason,
          created_at: videoJob.created_at
        },
        generated_videos: generatedVideos.map(v => ({
          id: v.id,
          url: v.url,
          thumbnail_url: v.thumbnail_url,
          duration_seconds: v.duration_seconds,
          aspect_ratio: v.aspect_ratio,
          status: v.status,
          is_selected: v.is_selected
        })),
        project: {
          id: project.id,
          name: project.name
        },
        creative_subject: creativeSubject ? {
          id: creativeSubject.id,
          name: creativeSubject.name,
          img: creativeSubject.description ? "📦" : null
        } : null,
        generation_request: generationRequest ? {
          platform: generationRequest.platform,
          tone: generationRequest.tone,
          style: generationRequest.style,
          call_to_action: generationRequest.call_to_action
        } : null
      };
    }
  };
}
