import { METRIC_SOURCES } from "../domain/constants.js";
import {
  dateString,
  enumValue,
  isPlainObject,
  optionalNumber,
  requireObject
} from "../domain/validation.js";
import { configurationMissing, notFound } from "../http/errors/api-error.js";
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("metrics");

const NUMERIC_METRIC_FIELDS = [
  "impressions",
  "clicks",
  "spend",
  "ctr",
  "cpc",
  "conversions",
  "conversion_value",
  "roas",
  "video_views",
  "video_view_rate",
  "cost_per_video_view"
];

export function createMetricsService({ store, ids, clock, config }) {
  return {
    sync(context, adPublicationId, body) {
      const input = requireObject(body, "request body");
      const publication = store.getByTenant("adPublications", context.tenant_id, adPublicationId);
      if (!publication) {
        throw notFound("AD_PUBLICATION_NOT_FOUND", "Ad publication was not found.");
      }

      const source = enumValue(input.source, "source", METRIC_SOURCES);
      if (
        (source === "meta_ads_api" || source === "google_ads_api") &&
        !config.adPlatformReadiness[publication.platform]?.ready
      ) {
        throw configurationMissing(
          "METRICS_SOURCE_UNAVAILABLE",
          "Metrics source is unavailable for this platform."
        );
      }

      const metricsInput = isPlainObject(input.metrics) ? input.metrics : {};
      const metrics = {};
      for (const field of NUMERIC_METRIC_FIELDS) {
        if (Object.hasOwn(metricsInput, field)) {
          metrics[field] = optionalNumber(metricsInput[field], `metrics.${field}`);
        }
      }
      if (Object.hasOwn(metricsInput, "currency")) {
        metrics.currency =
          typeof metricsInput.currency === "string" && metricsInput.currency.trim() !== ""
            ? metricsInput.currency.trim()
            : null;
      }

      const snapshot = {
        id: ids.next("ad-metrics-snapshot"),
        tenant_id: context.tenant_id,
        ad_publication_id: publication.id,
        platform: publication.platform,
        date_start: dateString(input.date_start, "date_start"),
        date_end: dateString(input.date_end, "date_end"),
        ...metrics,
        source,
        redacted_metadata: {
          source
        },
        fetched_at: clock.now()
      };

      store.insert("adMetricsSnapshots", snapshot);

      // Save to PostgreSQL
      try {
        pgStore.createMetricsSnapshot(snapshot);

        // Audit log
        pgStore.createAuditLog({
          userId: context.user_id,
          tenantId: context.tenant_id,
          action: "metrics.sync",
          entity: "ad_metrics_snapshots",
          entityId: snapshot.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId,
          afterData: { adPublicationId, source },
        });

        log.info("Metrics snapshot saved to PostgreSQL", { snapshotId: snapshot.id });
      } catch (err) {
        log.error("Failed to save metrics to PostgreSQL", { error: err.message });
      }

      return {
        metrics_snapshot: snapshot
      };
    }
  };
}
