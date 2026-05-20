/**
 * Backend Webhook Handler
 * @description Handle incoming webhooks from video providers (Pollo, Kling, Runway)
 */

import { notFound, badRequest } from "../http/errors/api-error.js";

/**
 * Create webhook handler service
 */
export function createWebhookHandlerService({ store, videoJobService, generatedVideoService, clock }) {
  /**
   * Parse webhook payload based on provider
   */
  function parseWebhookPayload(provider, body) {
    const normalized = {
      provider,
      timestamp: clock.now()
    };

    if (provider === "pollo") {
      return {
        ...normalized,
        provider_job_id: body.id ?? body.job_id,
        status: body.status,
        video_url: body.url ?? body.video_url,
        error: body.error ?? body.error_message
      };
    } else if (provider === "kling") {
      return {
        ...normalized,
        provider_job_id: body.task_id,
        status: body.task_status,
        video_url: body.video?.url,
        error: body.error
      };
    } else if (provider === "runway") {
      return {
        ...normalized,
        provider_job_id: body.id,
        status: body.status,
        video_url: body.output?.video_url ?? body.video_url,
        error: body.error
      };
    }

    return normalized;
  }

  /**
   * Map provider status to normalized status
   */
  function mapProviderStatus(provider, rawStatus) {
    const status = String(rawStatus).toLowerCase();

    if (status === "completed" || status === "done" || status === "succeed") {
      return "completed";
    }
    if (status === "failed" || status === "error") {
      return "failed";
    }
    if (status === "processing" || status === "generating" || status === "running") {
      return "processing";
    }
    return "queued";
  }

  /**
   * Handle webhook from provider
   */
  function handleWebhook(provider, body) {
    const payload = parseWebhookPayload(provider, body);

    // Find video job by provider job ID
    const videoJobs = store.findAll("videoJobs", { provider_job_id: payload.provider_job_id });

    if (videoJobs.length === 0) {
      console.warn(`Webhook received for unknown job: ${payload.provider_job_id}`);
      return { status: "ignored", reason: "job_not_found" };
    }

    const videoJob = videoJobs[0];

    // Update video job status
    videoJobService.updateVideoJob(videoJob.id, {
      status: mapProviderStatus(provider, payload.status),
      updated_at: clock.now()
    });

    // If completed, create generated video record
    if (payload.status === "completed" && payload.video_url) {
      const existingVideos = store.findAll("generatedVideos", {
        video_job_id: videoJob.id
      });

      if (existingVideos.length === 0) {
        generatedVideoService.createGeneratedVideo({
          tenant_id: videoJob.tenant_id,
          project_id: videoJob.project_id,
          generation_request_id: videoJob.generation_request_id,
          video_job_id: videoJob.id,
          url: payload.video_url,
          status: "generated"
        });
      }
    }

    // Store webhook event for audit
    store.insert("webhookEvents", {
      id: `webhook-${Date.now()}`,
      tenant_id: videoJob.tenant_id,
      video_job_id: videoJob.id,
      provider,
      provider_job_id: payload.provider_job_id,
      status: payload.status,
      video_url: payload.video_url,
      error: payload.error,
      received_at: clock.now()
    });

    return {
      status: "processed",
      video_job_id: videoJob.id,
      new_status: mapProviderStatus(provider, payload.status)
    };
  }

  return {
    handleWebhook,
    parseWebhookPayload
  };
}

/**
 * Webhook routes
 */
export function createWebhookRoutes(webhookService) {
  return {
    /**
     * POST /webhooks/pollo - Pollo webhook endpoint
     */
    async handlePolloWebhook(req, res) {
      try {
        const result = webhookService.handleWebhook("pollo", req.body);
        res.status(200).json(result);
      } catch (error) {
        console.error("Pollo webhook error:", error);
        res.status(500).json({ error: "webhook_processing_failed" });
      }
    },

    /**
     * POST /webhooks/kling - Kling webhook endpoint
     */
    async handleKlingWebhook(req, res) {
      try {
        const result = webhookService.handleWebhook("kling", req.body);
        res.status(200).json(result);
      } catch (error) {
        console.error("Kling webhook error:", error);
        res.status(500).json({ error: "webhook_processing_failed" });
      }
    },

    /**
     * POST /webhooks/runway - Runway webhook endpoint
     */
    async handleRunwayWebhook(req, res) {
      try {
        const result = webhookService.handleWebhook("runway", req.body);
        res.status(200).json(result);
      } catch (error) {
        console.error("Runway webhook error:", error);
        res.status(500).json({ error: "webhook_processing_failed" });
      }
    }
  };
}
