import { requireObject, requireString } from "../domain/validation.js";
import { notFound, validationError } from "../http/errors/api-error.js";

export function createGeneratedVideoService({ store, clock }) {
  return {
    select(context, id, body) {
      const input = requireObject(body, "request body");
      const projectId = requireString(input.project_id, "project_id");
      const project = store.getByTenant("creativeProjects", context.tenant_id, projectId);
      if (!project) {
        throw notFound("CREATIVE_PROJECT_NOT_FOUND", "Creative project was not found.");
      }

      const video = store.getByTenant("generatedVideos", context.tenant_id, id);
      if (!video || video.project_id !== project.id) {
        throw notFound("GENERATED_VIDEO_NOT_FOUND", "Generated video was not found.");
      }

      if (video.status === "unavailable") {
        throw validationError("Generated video is unavailable.", {
          error: "GENERATED_VIDEO_NOT_FOUND"
        });
      }

      const projectVideos = store.listByTenant(
        "generatedVideos",
        context.tenant_id,
        (item) => item.project_id === project.id
      );
      for (const projectVideo of projectVideos) {
        store.updateByTenant("generatedVideos", context.tenant_id, projectVideo.id, (current) => ({
          ...current,
          status: current.id === video.id ? "selected" : "generated",
          is_selected: current.id === video.id,
          selected_at: current.id === video.id ? clock.now() : null
        }));
      }

      const selectedVideo = store.getByTenant("generatedVideos", context.tenant_id, video.id);
      const updatedProject = store.updateByTenant(
        "creativeProjects",
        context.tenant_id,
        project.id,
        (current) => ({
          ...current,
          selected_generated_video_id: selectedVideo.id,
          status: "ready",
          updated_at: clock.now()
        })
      );

      return {
        creative_project: updatedProject,
        generated_video: selectedVideo
      };
    }
  };
}
