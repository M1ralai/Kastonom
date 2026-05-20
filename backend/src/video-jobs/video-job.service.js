import { notFound } from "../http/errors/api-error.js";
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("video-job");

export function createVideoJobService({}) {
  return {
    async get(context, id) {
      const videoJob = await pgStore.getVideoJobById(id, context.tenant_id);
      if (!videoJob) {
        throw notFound("VIDEO_JOB_NOT_FOUND", "Video job was not found.");
      }

      const generatedVideos = await pgStore.listGeneratedVideos(context.tenant_id, null);
      const jobVideos = generatedVideos.filter(v => v.video_job_id === videoJob.id);

      return {
        video_job: videoJob,
        provider_result: null,
        generated_videos: jobVideos,
        fallback_reason: videoJob.fallback_reason ?? null
      };
    }
  };
}
