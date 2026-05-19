import { notFound } from "../http/errors/api-error.js";

export function createVideoJobService({ store }) {
  return {
    get(context, id) {
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
