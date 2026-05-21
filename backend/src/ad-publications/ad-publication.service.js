import { AD_PLATFORMS } from "../domain/constants.js";
import {
  enumValue,
  optionalSafeDestinationUrl,
  optionalString,
  requireBoolean,
  requireObject,
  requireString
} from "../domain/validation.js";
import { ErrorCodes } from "../http/errors/error-codes.js";
import { configurationMissing, notFound, validationError } from "../http/errors/api-error.js";
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("ad-publication");

export function createAdPublicationService({ ids, clock, config }) {
  return {
    async create(context, body) {
      const raw = requireObject(body, "request body");
      const input = {
        project_id: requireString(raw.project_id, "project_id"),
        generated_video_id: requireString(raw.generated_video_id, "generated_video_id"),
        platform: enumValue(raw.platform, "platform", AD_PLATFORMS),
        ad_platform_connection_id: optionalString(
          raw.ad_platform_connection_id,
          "ad_platform_connection_id"
        ),
        destination_url: optionalSafeDestinationUrl(raw.destination_url, "destination_url"),
        user_confirmed_publish: requireBoolean(raw.user_confirmed_publish, "user_confirmed_publish")
      };

      if (input.user_confirmed_publish !== true) {
        throw validationError("Publication requires explicit user confirmation.", {
          error: "INVALID_REQUEST"
        });
      }

      log.info("Creating ad publication", { tenant_id: context.tenant_id, platform: input.platform });

      const project = await pgStore.getProjectById(input.project_id, context.tenant_id);
      if (!project) {
        throw notFound(ErrorCodes.CREATIVE_PROJECT_NOT_FOUND, "Creative project was not found.");
      }

      const generatedVideo = await pgStore.getGeneratedVideoById(input.generated_video_id, context.tenant_id);
      if (!generatedVideo || generatedVideo.project_id !== project.id) {
        throw notFound(ErrorCodes.GENERATED_VIDEO_NOT_FOUND, "Generated video was not found.");
      }

      if (!generatedVideo.is_selected || project.selected_generated_video_id !== generatedVideo.id) {
        throw validationError("Generated video must be selected before publication.", {
          error: "INVALID_REQUEST"
        });
      }

      const readiness = config.adPlatformReadiness[input.platform];
      if (!readiness?.ready) {
        throw configurationMissing(
          ErrorCodes.AD_PLATFORM_CONFIG_MISSING,
          `${input.platform} configuration is missing.`
        );
      }

      if (config.mode !== "mock") {
        throw configurationMissing(
          ErrorCodes.AD_PLATFORM_CONNECTION_NOT_READY,
          "Live ad publishing is not enabled in this MVP backend."
        );
      }

      const now = clock.now();
      const publication = {
        id: ids.uuid(),
        tenant_id: context.tenant_id,
        project_id: project.id,
        generated_video_id: generatedVideo.id,
        ad_platform_connection_id: input.ad_platform_connection_id,
        platform: input.platform,
        status: "published",
        external_campaign_id: `mock-campaign-${generatedVideo.id}`,
        external_ad_group_id: `mock-ad-group-${generatedVideo.id}`,
        external_ad_id: `mock-ad-${generatedVideo.id}`,
        destination_url: input.destination_url,
        published_at: now,
        paused_at: null,
        error_code: null,
        error_message: null,
        created_at: now,
        updated_at: now
      };

      // Save to PostgreSQL
      const createdPublication = await pgStore.createAdPublication(publication);
      await pgStore.updateProject(project.id, context.tenant_id, { status: "published" });
      await pgStore.updateGeneratedVideo(generatedVideo.id, context.tenant_id, { status: "published" });

      // Audit log
      await pgStore.createAuditLog({
        userId: context.user_id,
        tenantId: context.tenant_id,
        action: "ad_publication.create",
        entity: "ad_publications",
        entityId: createdPublication.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        afterData: { platform: input.platform, projectId: project.id },
      });

      log.info("Ad publication saved to PostgreSQL", { publicationId: createdPublication.id });

      return {
        ad_publication: createdPublication,
        fallback_reason: "mock_ad_publication"
      };
    }
  };
}
