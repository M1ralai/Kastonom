import { ApiError } from "../http/errors/api-error.js";
import { cloneDemoFixture } from "./demo-fixture.loader.js";

export function createDemoReplayService({ fixturePath }) {
  return {
    getFallbackReplay() {
      const fixture = cloneDemoFixture(fixturePath);
      const required = [
        "creative_project",
        "creative_subject",
        "source_assets",
        "generation_request",
        "prompt_payload",
        "video_job",
        "provider_result",
        "generated_videos"
      ];

      for (const key of required) {
        if (!fixture[key]) {
          throw new ApiError(
            500,
            "DEMO_FALLBACK_UNAVAILABLE",
            `Demo fallback fixture is missing ${key}.`
          );
        }
      }

      if (!Array.isArray(fixture.generated_videos) || fixture.generated_videos.length === 0) {
        throw new ApiError(
          500,
          "DEMO_FALLBACK_UNAVAILABLE",
          "Demo fallback fixture has no generated videos."
        );
      }

      for (const video of fixture.generated_videos) {
        if (!video.url || video.is_mock !== true) {
          throw new ApiError(
            500,
            "DEMO_FALLBACK_UNAVAILABLE",
            "Demo fallback generated videos must have mock preview URLs."
          );
        }
      }

      return {
        creative_project: fixture.creative_project,
        creative_subject: fixture.creative_subject,
        source_assets: fixture.source_assets,
        generation_request: fixture.generation_request,
        prompt_payload: fixture.prompt_payload,
        video_job: fixture.video_job,
        provider_result: fixture.provider_result,
        generated_videos: fixture.generated_videos,
        selected_generated_video: fixture.selected_generated_video ?? null,
        ad_publication: fixture.ad_publication ?? null,
        metrics_snapshot: fixture.metrics_snapshot ?? null,
        creative_iteration_suggestion: fixture.creative_iteration_suggestion ?? null,
        fallback_reason: fixture.fallback_reason ?? "demo_fallback"
      };
    }
  };
}
