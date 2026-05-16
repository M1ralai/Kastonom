import { CONFIDENCE_VALUES, SUGGESTION_STATUSES } from "../domain/constants.js";
import {
  enumValue,
  isPlainObject,
  optionalString,
  requireArray,
  requireObject,
  requireString,
  stringArray
} from "../domain/validation.js";
import { notFound, validationError } from "../http/errors/api-error.js";

export function createIterationSuggestionService({ store, ids, clock }) {
  return {
    create(context, body) {
      const input = requireObject(body, "request body");
      const projectId = requireString(input.project_id, "project_id");
      const project = store.getByTenant("creativeProjects", context.tenant_id, projectId);
      if (!project) {
        throw notFound("CREATIVE_PROJECT_NOT_FOUND", "Creative project was not found.");
      }

      const adPublicationId = optionalString(input.ad_publication_id, "ad_publication_id");
      if (adPublicationId && !store.getByTenant("adPublications", context.tenant_id, adPublicationId)) {
        throw notFound("AD_PUBLICATION_NOT_FOUND", "Ad publication was not found.");
      }

      const metricsSnapshotId = optionalString(input.metrics_snapshot_id, "metrics_snapshot_id");
      if (
        metricsSnapshotId &&
        !store.getByTenant("adMetricsSnapshots", context.tenant_id, metricsSnapshotId)
      ) {
        throw notFound("METRICS_SNAPSHOT_NOT_FOUND", "Metrics snapshot was not found.");
      }

      const baseGenerationRequestId = optionalString(
        input.base_generation_request_id,
        "base_generation_request_id"
      );
      if (
        baseGenerationRequestId &&
        !store.getByTenant("generationRequests", context.tenant_id, baseGenerationRequestId)
      ) {
        throw notFound("INVALID_ITERATION_SUGGESTION", "Base generation request was not found.");
      }

      const payload = requireObject(input.suggestion_payload, "suggestion_payload");
      const suggestedChanges = requireObject(payload.suggested_changes, "suggestion_payload.suggested_changes");
      if (!isPlainObject(suggestedChanges)) {
        throw validationError("suggested_changes must be an object.", {
          error: "INVALID_ITERATION_SUGGESTION"
        });
      }

      const now = clock.now();
      const suggestion = {
        id: ids.next("creative-iteration-suggestion"),
        tenant_id: context.tenant_id,
        project_id: project.id,
        ad_publication_id: adPublicationId,
        metrics_snapshot_id: metricsSnapshotId,
        base_generation_request_id: baseGenerationRequestId,
        new_generation_request_id: null,
        status: payload.status
          ? enumValue(payload.status, "suggestion_payload.status", SUGGESTION_STATUSES, {
              error: "INVALID_ITERATION_SUGGESTION"
            })
          : "suggested",
        reason: requireString(payload.reason, "suggestion_payload.reason", {
          error: "INVALID_ITERATION_SUGGESTION"
        }),
        metric_drivers: requireArray(payload.metric_drivers, "suggestion_payload.metric_drivers").map(
          (item, index) =>
            requireString(item, `suggestion_payload.metric_drivers[${index}]`, {
              error: "INVALID_ITERATION_SUGGESTION"
            })
        ),
        suggested_changes: suggestedChanges,
        confidence: enumValue(payload.confidence, "suggestion_payload.confidence", CONFIDENCE_VALUES, {
          error: "INVALID_ITERATION_SUGGESTION"
        }),
        fallback_notes: stringArray(payload.fallback_notes, "suggestion_payload.fallback_notes", {
          error: "INVALID_ITERATION_SUGGESTION"
        }),
        created_at: now,
        updated_at: now
      };

      store.insert("creativeIterationSuggestions", suggestion);
      return {
        creative_iteration_suggestion: suggestion
      };
    }
  };
}
