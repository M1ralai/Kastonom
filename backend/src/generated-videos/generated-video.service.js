import { requireObject, requireString } from "../domain/validation.js";
import { notFound, validationError } from "../http/errors/api-error.js";
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("generated-video");

export function createGeneratedVideoService({ clock }) {
  return {
    async select(context, id, body) {
      const input = requireObject(body, "request body");
      const projectId = requireString(input.project_id, "project_id");

      const project = await pgStore.getProjectById(projectId, context.tenant_id);
      const video = await pgStore.getGeneratedVideoById(id, context.tenant_id);

      if (!project) {
        throw notFound("CREATIVE_PROJECT_NOT_FOUND", "Creative project was not found.");
      }

      if (!video || video.project_id !== project.id) {
        throw notFound("GENERATED_VIDEO_NOT_FOUND", "Generated video was not found.");
      }

      if (video.status === "unavailable") {
        throw validationError("Generated video is unavailable.", {
          error: "GENERATED_VIDEO_NOT_FOUND"
        });
      }

      // Deselect all other videos for this project
      await pgStore.deselectAllVideos(projectId, context.tenant_id);

      // Select this video
      const now = clock.now();
      const selectedVideo = await pgStore.updateGeneratedVideo(id, context.tenant_id, {
        status: "selected",
        is_selected: true,
        selected_at: now
      });

      // Update project
      await pgStore.updateProject(projectId, context.tenant_id, {
        selected_generated_video_id: id,
        status: "ready"
      });

      // Audit log
      await pgStore.createAuditLog({
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

      // Get updated project
      const updatedProject = await pgStore.getProjectById(projectId, context.tenant_id);

      return {
        creative_project: updatedProject,
        generated_video: selectedVideo
      };
    }
  };
}
