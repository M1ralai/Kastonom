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

export function createCreativeProjectService({ ids, clock }) {
  return {
    async create(context, body) {
      const input = requireObject(body, "request body");
      const creativeSubjectInput = requireObject(input.creative_subject, "creative_subject");
      const sourceAssetInputs = requireArray(input.source_assets, "source_assets", {
        minLength: 1
      });
      const now = clock.now();

      log.info("Creating creative project", { tenant_id: context.tenant_id, name: input.name });

      const project = {
        id: ids.uuid(),
        tenant_id: context.tenant_id,
        name: requireString(input.name, "name"),
        status: "draft",
        selected_generated_video_id: null,
        latest_generation_request_id: null,
        created_at: now,
        updated_at: now
      };

      const creativeSubject = {
        id: ids.uuid(),
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
          id: ids.uuid(),
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

      // Save to PostgreSQL
      const createdProject = await pgStore.createProject(project);
      const createdSubject = await pgStore.createSubject(creativeSubject);
      const createdAssets = [];
      for (const asset of sourceAssets) {
        const createdAsset = await pgStore.createAsset(asset);
        createdAssets.push(createdAsset);
      }

      // Audit log
      await pgStore.createAuditLog({
        userId: context.user_id,
        tenantId: context.tenant_id,
        action: "creative_project.create",
        entity: "creative_projects",
        entityId: createdProject.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        afterData: { name: createdProject.name },
      });

      log.info("Creative project saved to PostgreSQL", { projectId: createdProject.id });

      return {
        creative_project: createdProject,
        creative_subject: createdSubject,
        source_assets: createdAssets,
        fallback_reason: null
      };
    },

    async getBundle(context, projectId) {
      const pgProject = await pgStore.getProjectById(projectId, context.tenant_id);
      if (!pgProject) {
        throw notFound("CREATIVE_PROJECT_NOT_FOUND", "Creative project was not found.");
      }

      const pgSubject = await pgStore.getSubjectById(projectId, context.tenant_id);
      const pgAssets = await pgStore.listAssets(context.tenant_id, projectId);
      const pgRequests = await pgStore.listGenerationRequests(context.tenant_id, projectId);
      const pgVideos = await pgStore.listGeneratedVideos(context.tenant_id, projectId);

      return {
        creative_project: pgProject,
        creative_subject: pgSubject,
        source_assets: pgAssets,
        generation_requests: pgRequests,
        generated_videos: pgVideos
      };
    },

    async getProject(context, projectId) {
      const project = await pgStore.getProjectById(projectId, context.tenant_id);
      if (!project) {
        throw notFound("CREATIVE_PROJECT_NOT_FOUND", "Creative project was not found.");
      }
      return project;
    },

    async getSubjectForProject(context, projectId) {
      const subjects = await pgStore.listSubjects(context.tenant_id, projectId);
      if (subjects.length === 0) {
        throw notFound("CREATIVE_PROJECT_NOT_FOUND", "Creative subject was not found.");
      }
      return subjects[0];
    },

    async listProjects(context) {
      const projects = await pgStore.listProjects(context.tenant_id);
      if (!projects || projects.length === 0) {
        return [];
      }

      // Build bundles with subjects
      const bundles = await Promise.all(projects.map(async (project) => {
        const subjects = await pgStore.listSubjects(context.tenant_id, project.id);
        const assets = await pgStore.listAssets(context.tenant_id, project.id);
        return {
          creative_project: project,
          creative_subject: subjects.length > 0 ? subjects[0] : null,
          source_assets: assets
        };
      }));

      return bundles;
    },

    async uploadSourceAsset(context, rawRequest) {
      log.info("Uploading source asset", { tenant_id: context.tenant_id });

      if (!rawRequest) {
        throw validationError("No raw request provided for multipart upload", { error: "INVALID_REQUEST" });
      }

      // Parse multipart form data
      const chunks = [];
      for await (const chunk of rawRequest) {
        chunks.push(chunk);
      }
      const bodyBuffer = Buffer.concat(chunks);

      // Simple multipart parser for single file
      const contentType = rawRequest.headers["content-type"] || "";
      const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
      if (!boundaryMatch) {
        throw validationError("Missing multipart boundary", { error: "INVALID_REQUEST" });
      }
      const boundary = boundaryMatch[1] || boundaryMatch[2];

      // Parse parts
      const parts = this._parseMultipart(bodyBuffer, boundary);
      const filePart = parts.find(p => p.name === "file");
      const assetType = parts.find(p => p.name === "asset_type")?.value || "image";

      if (!filePart || !filePart.data) {
        throw validationError("No file provided", { error: "INVALID_REQUEST" });
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      const mimeType = filePart.contentType || "application/octet-stream";

      // Allow any image type for MVP
      if (!mimeType.startsWith("image/") && mimeType !== "application/octet-stream") {
        throw validationError("Only image files are allowed", { error: "INVALID_REQUEST" });
      }

      const now = clock.now();
      const assetId = ids.uuid();

      // Generate a simple URL for the uploaded file (in production, use S3/GCS)
      const fileExt = mimeType.split("/")[1] || "jpg";
      const fileName = `${assetId}.${fileExt}`;
      const uploadUrl = `/uploads/${fileName}`;

      // For MVP, we'll store as a data URL or just return the upload path
      // In production, you would upload to S3/GCS here
      const sourceAsset = {
        id: assetId,
        tenant_id: context.tenant_id,
        project_id: null, // No project yet - will be linked when creating project
        asset_type: enumValue(assetType, "asset_type", ASSET_TYPES, { error: "INVALID_ASSET_TYPE" }),
        source: "upload",
        url: uploadUrl,
        storage_key: fileName,
        mime_type: mimeType,
        width: null,
        height: null,
        duration_seconds: null,
        checksum: null,
        metadata: { original_name: filePart.filename },
        created_at: now
      };

      // Save to PostgreSQL
      const createdAsset = await pgStore.createAsset(sourceAsset);

      log.info("Source asset uploaded", { assetId: createdAsset.id, tenant_id: context.tenant_id });

      return {
        source_asset: createdAsset,
        upload_url: uploadUrl
      };
    },

    _parseMultipart(buffer, boundary) {
      const parts = [];
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      const endBoundary = Buffer.from(`--${boundary}--`);

      let start = 0;
      let idx = buffer.indexOf(boundaryBuffer, start);

      while (idx !== -1) {
        const nextIdx = buffer.indexOf(boundaryBuffer, idx + boundaryBuffer.length);
        if (nextIdx === -1) break;

        const partData = buffer.slice(idx + boundaryBuffer.length + 2, nextIdx - 2); // Skip \r\n
        const separatorIdx = partData.indexOf("\r\n\r\n");
        if (separatorIdx === -1) {
          idx = nextIdx;
          continue;
        }

        const headers = partData.slice(0, separatorIdx).toString();
        const content = partData.slice(separatorIdx + 4);

        // Parse Content-Disposition
        const nameMatch = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);

        if (nameMatch) {
          parts.push({
            name: nameMatch[1],
            filename: filenameMatch ? filenameMatch[1] : null,
            contentType: contentTypeMatch ? contentTypeMatch[1].trim() : null,
            data: content,
            value: content.toString("utf8")
          });
        }

        idx = nextIdx;
      }

      return parts;
    }
  };
}
