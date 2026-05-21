import { ApiError, configurationMissing } from "../http/errors/api-error.js";
import { ErrorCodes } from "../http/errors/error-codes.js";
import { createLogger } from "../logger/index.js";

const log = createLogger("mcp-network");

let mcpModulePromise = null;

async function loadMcpModule() {
  if (!mcpModulePromise) {
    mcpModulePromise = import("../../../mcp/dist/index.js").catch((error) => {
      mcpModulePromise = null;
      throw error;
    });
  }

  return mcpModulePromise;
}

function compactCredentials(credentials = {}) {
  const compacted = {};

  for (const provider of ["pollo", "kling", "runway"]) {
    const credential = credentials[provider];
    if (credential?.apiKey && credential?.baseUrl) {
      compacted[provider] = {
        apiKey: credential.apiKey,
        baseUrl: credential.baseUrl
      };
    }
  }

  return compacted;
}

function toMcpPromptPayload(promptPayload) {
  return {
    id: promptPayload.id,
    tenant_id: promptPayload.tenant_id,
    project_id: promptPayload.project_id,
    generation_request_id: promptPayload.generation_request_id,
    provider: promptPayload.provider,
    prompt_text: promptPayload.prompt_text,
    negative_prompt: promptPayload.negative_prompt,
    language: promptPayload.language,
    duration_seconds: promptPayload.duration_seconds,
    aspect_ratio: promptPayload.aspect_ratio,
    source_asset_ids: promptPayload.source_asset_ids ?? [],
    provider_options: promptPayload.provider_options ?? {},
    is_mock: promptPayload.is_mock,
    fallback_reason: promptPayload.fallback_reason ?? null,
    created_at: promptPayload.created_at
  };
}

function mapMcpExecutionError(error, fallbackAvailable) {
  const code = error?.code;

  if (code === ErrorCodes.PROVIDER_CONFIG_MISSING) {
    return configurationMissing(
      ErrorCodes.PROVIDER_CONFIG_MISSING,
      error.message || "Provider configuration is missing.",
      { fallbackAvailable }
    );
  }

  if (code === ErrorCodes.PROVIDER_UNAVAILABLE) {
    return new ApiError(
      503,
      ErrorCodes.PROVIDER_UNAVAILABLE,
      error.providerMessage || error.message || "Provider is unavailable.",
      { fallbackAvailable }
    );
  }

  return new ApiError(
    503,
    ErrorCodes.PROVIDER_UNAVAILABLE,
    "MCP provider network execution is unavailable.",
    { fallbackAvailable }
  );
}

export function createMcpNetworkClient({ ids, clock, config }) {
  let executor = null;

  async function getExecutor() {
    if (executor) {
      return executor;
    }

    const mcp = await loadMcpModule();
    const createNetworkExecutor = mcp.createNetworkExecutor
      ?? ((options) => new mcp.ProviderNetworkExecutor(options));

    executor = createNetworkExecutor({
      credentials: compactCredentials(config.videoProviderCredentials),
      defaultTimeoutMs: config.providerTimeoutMs ?? 30000,
      fallbackEnabled: config.fallbackEnabled,
      mockPreviewUrl: config.mockPreviewUrl,
      idFactory: (prefix) => `${prefix}-${ids.uuid()}`,
      now: () => clock.now()
    });

    return executor;
  }

  return {
    async executeSubmission(context, promptPayload) {
      try {
        const mcpExecutor = await getExecutor();
        return await mcpExecutor.executeSubmission(toMcpPromptPayload(promptPayload), {
          fallbackEnabled: context.fallback_enabled,
          mockPreviewUrl: config.mockPreviewUrl
        });
      } catch (error) {
        log.warn("MCP provider submission failed", {
          tenant_id: context.tenant_id,
          provider: promptPayload.provider,
          error_code: error?.code ?? "MCP_NETWORK_ERROR",
          fallback_enabled: context.fallback_enabled
        });
        throw mapMcpExecutionError(error, context.fallback_enabled);
      }
    },

    async getJobStatus(context, provider, providerJobId) {
      try {
        const mcpExecutor = await getExecutor();
        return await mcpExecutor.getJobStatus(provider, providerJobId);
      } catch (error) {
        log.warn("MCP provider status polling failed", {
          tenant_id: context.tenant_id,
          provider,
          provider_job_id: providerJobId,
          error_code: error?.code ?? "MCP_STATUS_ERROR"
        });
        throw mapMcpExecutionError(error, context.fallback_enabled);
      }
    }
  };
}
