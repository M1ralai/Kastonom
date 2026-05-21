import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("recent-activities");

export function createRecentActivitiesService({ clock }) {
  return {
    /**
     * Get recent activities for dashboard
     * Returns recent projects with their latest status and metrics
     */
    async getActivities(context, options = {}) {
      const tenantId = context.tenant_id;
      const limit = options.limit || 10;

      log.info("Getting recent activities", { tenant_id: tenantId, limit });

      // Get all projects
      const projects = await pgStore.listProjects(tenantId);

      // Build activities from projects
      const activities = [];

      for (const project of projects.slice(0, limit)) {
        // Get subject for project name
        const subjects = await pgStore.listSubjects(tenantId, project.id);
        const subject = subjects.length > 0 ? subjects[0] : null;

        // Get generated videos for this project to calculate metrics
        const videos = await pgStore.listGeneratedVideos(tenantId, project.id);
        
        // Get the latest video job
        const videoJobs = await pgStore.listVideoJobs(tenantId, project.id);
        const latestJob = videoJobs.length > 0 ? videoJobs[0] : null;

        // Calculate metrics from published ad
        const publications = await pgStore.listAdPublications(tenantId, project.id);
        const publishedAd = publications.find(p => p.status === "published");

        let generatedVideo = null;
        if (videos.length > 0) {
          generatedVideo = {
            impressions: publishedAd?.impressions || 0,
            ctr: publishedAd?.ctr || 0
          };
        }

        // Determine icon based on status
        let icon = "⚪";
        switch (project.status) {
          case "published":
            icon = "🟢";
            break;
          case "ready":
            icon = "🔵";
            break;
          case "generating":
            icon = "🟡";
            break;
          case "failed":
            icon = "🔴";
            break;
          default:
            icon = "⚪";
        }

        activities.push({
          id: project.id,
          project_id: project.id,
          project_name: subject?.name || project.name,
          status: project.status,
          icon,
          generated_video: generatedVideo,
          updated_at: project.updated_at
        });
      }

      log.info("Activities retrieved", { tenant_id: tenantId, count: activities.length });

      return {
        activities
      };
    }
  };
}