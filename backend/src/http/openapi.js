const tenantHeader = {
  name: "x-tenant-id",
  in: "header",
  required: true,
  schema: {
    type: "string"
  },
  description: "Tenant scope. In mock mode the backend may use the configured demo tenant."
};

const jsonContent = (schemaRef) => ({
  "application/json": {
    schema: {
      $ref: schemaRef
    }
  }
});

const standardErrorResponses = {
  "400": {
    description: "Invalid request",
    content: jsonContent("#/components/schemas/ApiError")
  },
  "401": {
    description: "Unauthorized",
    content: jsonContent("#/components/schemas/ApiError")
  },
  "403": {
    description: "Forbidden",
    content: jsonContent("#/components/schemas/ApiError")
  },
  "404": {
    description: "Not found",
    content: jsonContent("#/components/schemas/ApiError")
  },
  "422": {
    description: "Validation failure",
    content: jsonContent("#/components/schemas/ApiError")
  },
  "500": {
    description: "Backend failure",
    content: jsonContent("#/components/schemas/ApiError")
  }
};

function requestBody(schemaRef) {
  return {
    required: true,
    content: jsonContent(schemaRef)
  };
}

function successResponse(statusDescription, schemaRef) {
  return {
    description: statusDescription,
    content: jsonContent(schemaRef)
  };
}

export function createOpenApiSpec(config) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Kastonom Backend API",
      version: config.version,
      description:
        "Tenant-scoped orchestration API for creative projects, backend prompt payloads, mock video jobs, explicit ad publication, metrics snapshots, iteration suggestions, and demo fallback replay."
    },
    servers: [
      {
        url: config.publicBaseUrl,
        description: "Configured backend base URL"
      }
    ],
    tags: [
      { name: "Health" },
      { name: "Creative Projects" },
      { name: "Generation Requests" },
      { name: "Video Jobs" },
      { name: "Generated Videos" },
      { name: "Ad Publications" },
      { name: "Metrics" },
      { name: "Iteration Suggestions" },
      { name: "Demo" },
      { name: "Documentation" }
    ],
    paths: {
      "/openapi.json": {
        get: {
          tags: ["Documentation"],
          operationId: "getOpenApiSpec",
          summary: "Return the OpenAPI document used by Swagger UI.",
          responses: {
            "200": {
              description: "OpenAPI document",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: true
                  }
                }
              }
            }
          }
        }
      },
      "/docs": {
        get: {
          tags: ["Documentation"],
          operationId: "getSwaggerDocs",
          summary: "Return the Swagger UI documentation page.",
          responses: {
            "200": {
              description: "Swagger UI HTML",
              content: {
                "text/html": {
                  schema: {
                    type: "string"
                  }
                }
              }
            }
          }
        }
      },
      "/health": {
        get: {
          tags: ["Health"],
          operationId: "getHealth",
          summary: "Return service health and safe readiness state.",
          responses: {
            "200": successResponse("Health response", "#/components/schemas/HealthResponse"),
            "500": standardErrorResponses["500"]
          }
        }
      },
      "/creative-projects": {
        post: {
          tags: ["Creative Projects"],
          operationId: "createCreativeProject",
          summary: "Create a tenant-scoped creative project with subject facts and source assets.",
          parameters: [tenantHeader],
          requestBody: requestBody("#/components/schemas/CreateCreativeProjectRequest"),
          responses: {
            "201": successResponse(
              "Creative project created",
              "#/components/schemas/CreateCreativeProjectResponse"
            ),
            ...standardErrorResponses
          }
        }
      },
      "/creative-projects/{id}": {
        get: {
          tags: ["Creative Projects"],
          operationId: "getCreativeProject",
          summary: "Return a tenant-scoped creative project bundle.",
          parameters: [
            tenantHeader,
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": successResponse(
              "Creative project bundle",
              "#/components/schemas/CreativeProjectBundle"
            ),
            ...standardErrorResponses
          }
        }
      },
      "/generation-requests": {
        post: {
          tags: ["Generation Requests"],
          operationId: "createGenerationRequest",
          summary: "Create a generation request, prompt payload, video job, and generated videos.",
          parameters: [tenantHeader],
          requestBody: requestBody("#/components/schemas/CreateGenerationRequestRequest"),
          responses: {
            "202": successResponse(
              "Generation request accepted",
              "#/components/schemas/CreateGenerationRequestResponse"
            ),
            ...standardErrorResponses
          }
        }
      },
      "/video-jobs/{id}": {
        get: {
          tags: ["Video Jobs"],
          operationId: "getVideoJob",
          summary: "Return current video generation job status and generated videos.",
          parameters: [
            tenantHeader,
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": successResponse("Video job state", "#/components/schemas/VideoJobResponse"),
            ...standardErrorResponses
          }
        }
      },
      "/generated-videos/{id}/select": {
        post: {
          tags: ["Generated Videos"],
          operationId: "selectGeneratedVideo",
          summary: "Select one tenant-owned generated video for a creative project.",
          parameters: [
            tenantHeader,
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          requestBody: requestBody("#/components/schemas/SelectGeneratedVideoRequest"),
          responses: {
            "200": successResponse(
              "Generated video selected",
              "#/components/schemas/SelectGeneratedVideoResponse"
            ),
            ...standardErrorResponses
          }
        }
      },
      "/ad-publications": {
        post: {
          tags: ["Ad Publications"],
          operationId: "createAdPublication",
          summary: "Track an explicit user request to publish a selected generated video.",
          parameters: [tenantHeader],
          requestBody: requestBody("#/components/schemas/CreateAdPublicationRequest"),
          responses: {
            "201": successResponse(
              "Ad publication created",
              "#/components/schemas/CreateAdPublicationResponse"
            ),
            ...standardErrorResponses
          }
        }
      },
      "/ad-publications/{id}/metrics/sync": {
        post: {
          tags: ["Metrics"],
          operationId: "syncAdPublicationMetrics",
          summary: "Store a metrics snapshot for a published ad.",
          parameters: [
            tenantHeader,
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          requestBody: requestBody("#/components/schemas/SyncMetricsRequest"),
          responses: {
            "201": successResponse("Metrics snapshot stored", "#/components/schemas/SyncMetricsResponse"),
            ...standardErrorResponses
          }
        }
      },
      "/creative-iteration-suggestions": {
        post: {
          tags: ["Iteration Suggestions"],
          operationId: "createCreativeIterationSuggestion",
          summary: "Store an externally supplied or demo-fixture creative iteration suggestion.",
          parameters: [tenantHeader],
          requestBody: requestBody("#/components/schemas/CreateIterationSuggestionRequest"),
          responses: {
            "201": successResponse(
              "Creative iteration suggestion stored",
              "#/components/schemas/CreateIterationSuggestionResponse"
            ),
            ...standardErrorResponses
          }
        }
      },
      "/demo/fallback": {
        get: {
          tags: ["Demo"],
          operationId: "getDemoFallback",
          summary: "Return deterministic fallback replay data for hackathon demo mode.",
          responses: {
            "200": successResponse("Demo fallback replay", "#/components/schemas/DemoFallbackResponse"),
            "500": standardErrorResponses["500"]
          }
        }
      }
    },
    components: {
      schemas: {
        ApiError: {
          type: "object",
          required: ["error", "message", "request_id"],
          properties: {
            error: { type: "string" },
            message: { type: "string" },
            request_id: { type: "string" },
            fallback_available: { type: "boolean" }
          }
        },
        HealthResponse: {
          type: "object",
          required: [
            "status",
            "mode",
            "version",
            "video_provider_readiness",
            "ad_platform_readiness"
          ],
          properties: {
            status: { enum: ["ok", "degraded"] },
            mode: { enum: ["mock", "live", "degraded"] },
            version: { type: "string" },
            video_provider_readiness: { type: "object", additionalProperties: true },
            ad_platform_readiness: { type: "object", additionalProperties: true }
          }
        },
        CreativeSubjectInput: {
          type: "object",
          required: [
            "subject_type",
            "name",
            "allowed_claims",
            "forbidden_claims",
            "unknown_fields",
            "source"
          ],
          properties: {
            subject_type: {
              enum: ["product", "service", "brand", "offer", "event", "place", "other", "unknown"]
            },
            name: { type: "string" },
            description: { type: ["string", "null"] },
            landing_url: { type: ["string", "null"], format: "uri" },
            price: { type: ["number", "null"] },
            currency: { type: ["string", "null"] },
            allowed_claims: { type: "array", items: { type: "string" } },
            forbidden_claims: { type: "array", items: { type: "string" } },
            unknown_fields: { type: "array", items: { type: "string" } },
            source: { enum: ["user_input", "import", "mock", "unknown"] }
          }
        },
        SourceAssetInput: {
          type: "object",
          required: ["asset_type", "source", "url"],
          properties: {
            asset_type: { enum: ["image", "video", "url"] },
            source: { enum: ["upload", "external_url", "generated", "mock"] },
            url: { type: "string" },
            metadata: { type: "object", additionalProperties: true }
          }
        },
        CreateCreativeProjectRequest: {
          type: "object",
          required: ["name", "creative_subject", "source_assets"],
          properties: {
            name: { type: "string" },
            creative_subject: { $ref: "#/components/schemas/CreativeSubjectInput" },
            source_assets: {
              type: "array",
              minItems: 1,
              items: { $ref: "#/components/schemas/SourceAssetInput" }
            }
          }
        },
        CreateGenerationRequestRequest: {
          type: "object",
          required: [
            "project_id",
            "source_asset_ids",
            "objective",
            "platform",
            "duration_seconds",
            "aspect_ratio",
            "language"
          ],
          properties: {
            project_id: { type: "string" },
            source_asset_ids: { type: "array", minItems: 1, items: { type: "string" } },
            provider: { enum: ["pollo", "kling", "runway", "mock"] },
            objective: {
              enum: [
                "awareness",
                "traffic",
                "conversions",
                "engagement",
                "app_promotion",
                "lead_generation",
                "unknown"
              ]
            },
            target_audience: { type: ["string", "null"] },
            platform: {
              enum: [
                "meta_ads",
                "google_ads",
                "tiktok",
                "reels",
                "youtube_shorts",
                "generic_vertical",
                "unknown"
              ]
            },
            duration_seconds: { type: "integer" },
            aspect_ratio: { enum: ["9:16", "1:1", "4:5", "16:9", "unknown"] },
            language: { type: "string" },
            tone: { type: ["string", "null"] },
            style: { type: ["string", "null"] },
            call_to_action: { type: ["string", "null"] },
            user_notes: { type: ["string", "null"] }
          }
        },
        SelectGeneratedVideoRequest: {
          type: "object",
          required: ["project_id"],
          properties: {
            project_id: { type: "string" }
          }
        },
        CreateAdPublicationRequest: {
          type: "object",
          required: ["project_id", "generated_video_id", "platform", "user_confirmed_publish"],
          properties: {
            project_id: { type: "string" },
            generated_video_id: { type: "string" },
            platform: { enum: ["meta_ads", "google_ads"] },
            ad_platform_connection_id: { type: ["string", "null"] },
            destination_url: { type: ["string", "null"], format: "uri" },
            user_confirmed_publish: { type: "boolean", const: true }
          }
        },
        SyncMetricsRequest: {
          type: "object",
          required: ["source", "date_start", "date_end"],
          properties: {
            source: { enum: ["meta_ads_api", "google_ads_api", "mock", "manual", "unknown"] },
            date_start: { type: "string", format: "date" },
            date_end: { type: "string", format: "date" },
            metrics: { type: "object", additionalProperties: true }
          }
        },
        CreateIterationSuggestionRequest: {
          type: "object",
          required: ["project_id", "suggestion_payload"],
          properties: {
            project_id: { type: "string" },
            ad_publication_id: { type: ["string", "null"] },
            metrics_snapshot_id: { type: ["string", "null"] },
            base_generation_request_id: { type: ["string", "null"] },
            suggestion_payload: {
              type: "object",
              required: ["reason", "metric_drivers", "suggested_changes", "confidence", "fallback_notes"],
              properties: {
                status: {
                  enum: ["suggested", "accepted", "dismissed", "generated", "failed"]
                },
                reason: { type: "string" },
                metric_drivers: { type: "array", items: { type: "string" } },
                suggested_changes: { type: "object", additionalProperties: true },
                confidence: { enum: ["low", "medium", "high"] },
                fallback_notes: { type: "array", items: { type: "string" } }
              }
            }
          }
        },
        CreativeProjectBundle: {
          type: "object",
          additionalProperties: true
        },
        CreateCreativeProjectResponse: {
          type: "object",
          additionalProperties: true
        },
        CreateGenerationRequestResponse: {
          type: "object",
          additionalProperties: true
        },
        VideoJobResponse: {
          type: "object",
          additionalProperties: true
        },
        SelectGeneratedVideoResponse: {
          type: "object",
          additionalProperties: true
        },
        CreateAdPublicationResponse: {
          type: "object",
          additionalProperties: true
        },
        SyncMetricsResponse: {
          type: "object",
          additionalProperties: true
        },
        CreateIterationSuggestionResponse: {
          type: "object",
          additionalProperties: true
        },
        DemoFallbackResponse: {
          type: "object",
          additionalProperties: true
        }
      }
    }
  };
}

export function createSwaggerHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kastonom Backend API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body {
        margin: 0;
        background: #ffffff;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.addEventListener("load", () => {
        window.ui = SwaggerUIBundle({
          url: "/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis],
          layout: "BaseLayout"
        });
      });
    </script>
  </body>
</html>`;
}
