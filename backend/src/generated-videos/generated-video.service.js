import { requireObject, requireString } from "../domain/validation.js";
import { notFound, validationError } from "../http/errors/api-error.js";
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("generated-video");

export function createGeneratedVideoService({ store, clock }) {
  return {
    select(context, id, body) {
      const input = requireObject(body, "request body");
      const projectId = requireString(input.project_id, "project_id");

      // Try PostgreSQL first
      try {
        const project = pgStore.getProjectById(projectId, context.tenant_id);
        const video = pgStore.getGeneratedVideoById(id, context.tenant_id);

        if (project && video && video.project_id === project.id) {
          // Deselect all other videos for this project
          pgStore.deselectAllVideos(projectId, context.tenant_id);

          // Select this video
          const now = new Date().toISOString();
          pgStore.updateGeneratedVideo(id, context.tenant_id, {
            status: "selected",
            is_selected: true,
            selected_at: now
          });

          // Update project
          pgStore.updateProject(projectId, context.tenant_id, {
            selected_generated_video_id: id,
            status: "ready"
          });

          // Audit log
          pgStore.createAuditLog({
            userId: context.user_id,
            tenantId: context.tenant_id,
            action: "generated_video.select",
            entity: "generated_videos",
            entityId: id,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            requestId: context.requestId,
            afterData: { projectId, videoId: id },
          });

          log.info("Video selected in PostgreSQL", { videoId: id, projectId });

          // Get updated video
          const selectedVideo = pgStore.getGeneratedVideoById(id, context.tenant_id);
          const updatedProject = pgStore.getProjectById(projectId, context.tenant_id);

          return {
            creative_project: updatedProject,
            generated_video: selectedVideo
          };
        }
      } catch (err) {
        log.warn("PG select failed, fallback to memory", { error: err.message });
      }

      // Fallback to memory store
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
