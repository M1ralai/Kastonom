import { notFound } from "../http/errors/api-error.js";
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("video-job");

export function createVideoJobService({ store }) {
  return {
    get(context, id) {
      // Try PostgreSQL first
      try {
        const videoJob = pgStore.getVideoJobById(id, context.tenant_id);
        if (videoJob) {
          // Get related data from PG
          const providerResults = []; // TODO: Add getProviderResultsForJob if needed
          const generatedVideos = pgStore.listGeneratedVideos(context.tenant_id, id);

          return {
            video_job: videoJob,
            provider_result: null, // Simplified
            generated_videos: generatedVideos,
            fallback_reason: videoJob.fallback_reason ?? null
          };
        }
      } catch (err) {
        log.warn("PG get failed, fallback to memory", { error: err.message });
      }

      // Fallback to memory store
      const videoJob = store.getByTenant("videoJobs", context.tenant_id, id);
      if (!videoJob) {
        throw notFound("VIDEO_JOB_NOT_FOUND", "Video job was not found.");
      }

      const providerResult =
        store.findByTenant(
          "providerResults",
          context.tenant_id,
          (result) => result.video_job_id === videoJob.id
        ) ?? null;
      const generatedVideos = store.listByTenant(
        "generatedVideos",
        context.tenant_id,
        (video) => video.video_job_id === videoJob.id
      );

      return {
        video_job: videoJob,
        provider_result: providerResult,
        generated_videos: generatedVideos,
        fallback_reason: videoJob.fallback_reason ?? null
      };
    }
  };
}
