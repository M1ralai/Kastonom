import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { notFound } from "../http/errors/api-error.js";
import { createLogger } from "../logger/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const log = createLogger("demo-replay");

/**
 * Load demo fixture from fixtures/demo-replay.json
 */
function loadDemoFixture() {
  try {
    const fixturePath = resolve(__dirname, "../../fixtures/demo-replay.json");
    const content = readFileSync(fixturePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    log.error("Failed to load demo fixture", { error: error.message });
    return null;
  }
}

export function createDemoReplayService() {
  const fixture = loadDemoFixture();

  return {
    /**
     * Get complete demo fallback data for hackathon mode
     */
    getFallback(context) {
      if (!fixture) {
        throw notFound("DEMO_FALLBACK_UNAVAILABLE", "Demo fixture is not available.");
      }

      // Filter to demo tenant only
      const demoTenantId = "00000000-0000-0000-0000-000000000001";

      if (context.tenant_id !== demoTenantId && context.tenant_id !== "demo-tenant") {
        throw notFound("DEMO_FALLBACK_UNAVAILABLE", "Demo fallback is only available for demo tenant.");
      }

      log.info("Serving demo fallback", { tenant_id: context.tenant_id });

      return {
        creative_project: fixture.creative_project,
        creative_subject: fixture.creative_subject,
        source_assets: fixture.source_assets,
        generation_request: fixture.generation_request,
        prompt_payload: fixture.prompt_payload,
        video_job: fixture.video_job,
        provider_result: fixture.provider_result,
        generated_videos: fixture.generated_videos,
        selected_generated_video: fixture.selected_generated_video,
        ad_publication: fixture.ad_publication,
        metrics_snapshot: fixture.metrics_snapshot,
        creative_iteration_suggestion: fixture.creative_iteration_suggestion,
        fallback_reason: "demo_fallback"
      };
    },

    /**
     * Check if demo fixture is available
     */
    isAvailable() {
      return fixture !== null;
    },

    /**
     * Get demo tenant ID
     */
    getDemoTenantId() {
      return "00000000-0000-0000-0000-000000000001";
    }
  };
}
