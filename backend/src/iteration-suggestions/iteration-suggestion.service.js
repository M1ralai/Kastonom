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
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("iteration-suggestion");

export function createIterationSuggestionService({ ids, clock }) {
  return {
    async create(context, body) {
      const input = requireObject(body, "request body");
      const projectId = requireString(input.project_id, "project_id");
      const project = await pgStore.getProjectById(projectId, context.tenant_id);
      if (!project) {
        throw notFound("CREATIVE_PROJECT_NOT_FOUND", "Creative project was not found.");
      }

      const adPublicationId = optionalString(input.ad_publication_id, "ad_publication_id");
      if (adPublicationId) {
        const pub = await pgStore.getAdPublicationById(adPublicationId, context.tenant_id);
        if (!pub) {
          throw notFound("AD_PUBLICATION_NOT_FOUND", "Ad publication was not found.");
        }
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
        suggestion_type: payload.reason || "general",
        current_value: null,
        suggested_value: JSON.stringify(suggestedChanges),
        reason: requireString(payload.reason, "suggestion_payload.reason", {
          error: "INVALID_ITERATION_SUGGESTION"
        }),
        priority: "medium",
        status: "pending"
      };

      // Save to PostgreSQL
      const createdSuggestion = await pgStore.createIterationSuggestion({
        id: suggestion.id,
        tenant_id: suggestion.tenant_id,
        project_id: suggestion.project_id,
        ad_publication_id: suggestion.ad_publication_id,
        suggestion_type: suggestion.suggestion_type,
        current_value: suggestion.current_value,
        suggested_value: suggestion.suggested_value,
        reason: suggestion.reason,
        priority: suggestion.priority,
        status: suggestion.status
      });

      // Audit log
      await pgStore.createAuditLog({
        userId: context.user_id,
        tenantId: context.tenant_id,
        action: "iteration_suggestion.create",
        entity: "creative_iteration_suggestions",
        entityId: createdSuggestion.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        afterData: { projectId, reason: suggestion.reason },
      });

      log.info("Iteration suggestion saved to PostgreSQL", { suggestionId: createdSuggestion.id });

      return {
        creative_iteration_suggestion: createdSuggestion
      };
    }
  };
}
