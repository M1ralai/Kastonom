import {
  ASSET_SOURCES,
  ASSET_TYPES,
  SUBJECT_SOURCES,
  SUBJECT_TYPES
} from "../domain/constants.js";
import {
  enumValue,
  isPlainObject,
  optionalNumber,
  optionalString,
  optionalUrl,
  requireArray,
  requireObject,
  requireString,
  stringArray
} from "../domain/validation.js";
import { notFound, validationError } from "../http/errors/api-error.js";
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("creative-project");

export function createCreativeProjectService({ store, ids, clock }) {
  function buildBundle(context, project) {
    const creativeSubject = store.findByTenant(
      "creativeSubjects",
      context.tenant_id,
      (subject) => subject.project_id === project.id
    );
    const sourceAssets = store.listByTenant(
      "sourceAssets",
      context.tenant_id,
      (asset) => asset.project_id === project.id
    );
    const generationRequests = store.listByTenant(
      "generationRequests",
      context.tenant_id,
      (request) => request.project_id === project.id
    );
    const generatedVideos = store.listByTenant(
      "generatedVideos",
      context.tenant_id,
      (video) => video.project_id === project.id
    );

    return {
      creative_project: project,
      creative_subject: creativeSubject,
      source_assets: sourceAssets,
      generation_requests: generationRequests,
      generated_videos: generatedVideos
    };
  }

  return {
    create(context, body) {
      const input = requireObject(body, "request body");
      const creativeSubjectInput = requireObject(input.creative_subject, "creative_subject");
      const sourceAssetInputs = requireArray(input.source_assets, "source_assets", {
        minLength: 1
      });
      const now = clock.now();

      log.info("Creating creative project", { tenant_id: context.tenant_id, name: input.name });

      const project = {
        id: ids.next("creative-project"),
        tenant_id: context.tenant_id,
        name: requireString(input.name, "name"),
        status: "draft",
        selected_generated_video_id: null,
        latest_generation_request_id: null,
        created_at: now,
        updated_at: now
      };

      const creativeSubject = {
        id: ids.next("creative-subject"),
        tenant_id: context.tenant_id,
        project_id: project.id,
        subject_type: enumValue(
          creativeSubjectInput.subject_type,
          "creative_subject.subject_type",
          SUBJECT_TYPES,
          { error: "CREATIVE_SUBJECT_INVALID" }
        ),
        name: requireString(creativeSubjectInput.name, "creative_subject.name", {
          error: "CREATIVE_SUBJECT_INVALID"
        }),
        description: optionalString(creativeSubjectInput.description, "creative_subject.description"),
        landing_url: optionalUrl(creativeSubjectInput.landing_url, "creative_subject.landing_url"),
        price: optionalNumber(creativeSubjectInput.price, "creative_subject.price"),
        currency: optionalString(creativeSubjectInput.currency, "creative_subject.currency"),
        allowed_claims: stringArray(
          creativeSubjectInput.allowed_claims,
          "creative_subject.allowed_claims",
          { error: "CREATIVE_SUBJECT_INVALID" }
        ),
        forbidden_claims: stringArray(
          creativeSubjectInput.forbidden_claims,
          "creative_subject.forbidden_claims",
          { error: "CREATIVE_SUBJECT_INVALID" }
        ),
        unknown_fields: stringArray(
          creativeSubjectInput.unknown_fields,
          "creative_subject.unknown_fields",
          { error: "CREATIVE_SUBJECT_INVALID" }
        ),
        source: enumValue(creativeSubjectInput.source, "creative_subject.source", SUBJECT_SOURCES, {
          error: "CREATIVE_SUBJECT_INVALID"
        }),
        created_at: now,
        updated_at: now
      };

      const sourceAssets = sourceAssetInputs.map((assetInput, index) => {
        if (!isPlainObject(assetInput)) {
          throw validationError(`source_assets[${index}] must be an object.`, {
            error: "SOURCE_ASSET_INVALID"
          });
        }

        return {
          id: ids.next("source-asset"),
          tenant_id: context.tenant_id,
          project_id: project.id,
          asset_type: enumValue(assetInput.asset_type, `source_assets[${index}].asset_type`, ASSET_TYPES, {
            error: "SOURCE_ASSET_INVALID"
          }),
          source: enumValue(assetInput.source, `source_assets[${index}].source`, ASSET_SOURCES, {
            error: "SOURCE_ASSET_INVALID"
          }),
          url: requireString(assetInput.url, `source_assets[${index}].url`, {
            error: "SOURCE_ASSET_INVALID"
          }),
          storage_key: optionalString(assetInput.storage_key, `source_assets[${index}].storage_key`),
          mime_type: optionalString(assetInput.mime_type, `source_assets[${index}].mime_type`),
          width: assetInput.width ?? null,
          height: assetInput.height ?? null,
          duration_seconds: assetInput.duration_seconds ?? null,
          checksum: optionalString(assetInput.checksum, `source_assets[${index}].checksum`),
          metadata: isPlainObject(assetInput.metadata) ? assetInput.metadata : {},
          created_at: now
        };
      });

      // Insert into memory store
      store.insert("creativeProjects", project);
      store.insert("creativeSubjects", creativeSubject);
      for (const asset of sourceAssets) {
        store.insert("sourceAssets", asset);
      }

      // Save to PostgreSQL
      try {
        pgStore.createProject(project);
        pgStore.createSubject(creativeSubject);
        for (const asset of sourceAssets) {
          pgStore.createAsset(asset);
        }

        // Audit log
        pgStore.createAuditLog({
          userId: context.user_id,
          tenantId: context.tenant_id,
          action: "creative_project.create",
          entity: "creative_projects",
          entityId: project.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId,
          afterData: { name: project.name },
        });

        log.info("Creative project saved to PostgreSQL", { projectId: project.id });
      } catch (err) {
        log.error("Failed to save creative project to PostgreSQL", { error: err.message, projectId: project.id });
        // Continue with memory store fallback
      }

      return {
        creative_project: project,
        creative_subject: creativeSubject,
        source_assets: sourceAssets,
        fallback_reason: null
      };
    },

    getBundle(context, projectId) {
      // Try PostgreSQL first
      try {
        const pgProject = pgStore.getProjectById(projectId, context.tenant_id);
        if (pgProject) {
          // Build bundle from PG data
          const pgSubject = pgStore.getSubjectById(projectId, context.tenant_id);
          const pgAssets = pgStore.listAssets(context.tenant_id, projectId);
          const pgRequests = pgStore.listGenerationRequests(context.tenant_id, projectId);
          const pgVideos = pgStore.listGeneratedVideos(context.tenant_id, projectId);

          return {
            creative_project: pgProject,
            creative_subject: pgSubject,
            source_assets: pgAssets,
            generation_requests: pgRequests,
            generated_videos: pgVideos
          };
        }
      } catch (err) {
        log.warn("PG getBundle failed, fallback to memory", { error: err.message });
      }

      // Fallback to memory store
      const project = store.getByTenant("creativeProjects", context.tenant_id, projectId);
      if (!project) {
        throw notFound("CREATIVE_PROJECT_NOT_FOUND", "Creative project was not found.");
      }
      return buildBundle(context, project);
    },

    getProject(context, projectId) {
      // Try PostgreSQL first
      try {
        const project = pgStore.getProjectById(projectId, context.tenant_id);
        if (project) return project;
      } catch (err) {
        log.warn("PG getProject failed, fallback to memory", { error: err.message });
      }

      // Fallback to memory store
      const project = store.getByTenant("creativeProjects", context.tenant_id, projectId);
      if (!project) {
        throw notFound("CREATIVE_PROJECT_NOT_FOUND", "Creative project was not found.");
      }
      return project;
    },

    getSubjectForProject(context, projectId) {
      // Try PostgreSQL first
      try {
        const subjects = pgStore.listSubjects(context.tenant_id, projectId);
        if (subjects.length > 0) return subjects[0];
      } catch (err) {
        log.warn("PG getSubjectForProject failed, fallback to memory", { error: err.message });
      }

      // Fallback to memory store
      const subject = store.findByTenant(
        "creativeSubjects",
        context.tenant_id,
        (item) => item.project_id === projectId
      );
      if (!subject) {
        throw notFound("CREATIVE_PROJECT_NOT_FOUND", "Creative subject was not found.");
      }
      return subject;
    }
  };
}
