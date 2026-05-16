import {
  AD_PLATFORMS,
  ASPECT_RATIOS,
  MODES,
  PLATFORMS,
  VIDEO_PROVIDERS
} from "../domain/constants.js";
import { ApiError } from "../http/errors/api-error.js";

function readString(env, name, fallback = undefined) {
  const value = env[name];
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }
  return value.trim();
}

function readBoolean(env, name, fallback) {
  const value = readString(env, name);
  if (value == null) {
    return fallback;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new ApiError(500, "CONFIGURATION_MISSING", `${name} must be true or false.`);
}

function readInteger(env, name, fallback) {
  const value = readString(env, name);
  if (value == null) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(500, "CONFIGURATION_MISSING", `${name} must be a positive integer.`);
  }
  return parsed;
}

function requireEnum(value, name, allowed) {
  if (!allowed.includes(value)) {
    throw new ApiError(500, "CONFIGURATION_MISSING", `${name} must be one of: ${allowed.join(", ")}.`);
  }
  return value;
}

function readiness(env, names) {
  const missing = names.filter((name) => readString(env, name) == null);
  return {
    ready: missing.length === 0,
    missing
  };
}

function videoProviderReadiness(env) {
  const pollo = readiness(env, ["POLLO_API_KEY", "POLLO_API_BASE_URL"]);
  const kling = readiness(env, ["KLING_API_KEY", "KLING_API_BASE_URL"]);
  const runway = readiness(env, ["RUNWAY_API_KEY", "RUNWAY_API_BASE_URL"]);

  return {
    mock: {
      ready: true,
      mode: "mock",
      is_mock: true,
      missing: []
    },
    pollo: {
      ...pollo,
      mode: "live",
      is_mock: false
    },
    kling: {
      ...kling,
      mode: "live",
      is_mock: false
    },
    runway: {
      ...runway,
      mode: "live",
      is_mock: false
    }
  };
}

function adPlatformReadiness(env, mode) {
  if (mode === "mock") {
    return {
      meta_ads: {
        ready: true,
        mode: "mock",
        is_mock: true,
        missing: []
      },
      google_ads: {
        ready: true,
        mode: "mock",
        is_mock: true,
        missing: []
      }
    };
  }

  const meta = readiness(env, ["META_ADS_ACCOUNT_ID", "META_ADS_ACCESS_TOKEN"]);
  const google = readiness(env, ["GOOGLE_ADS_ACCOUNT_ID", "GOOGLE_ADS_DEVELOPER_TOKEN"]);

  return {
    meta_ads: {
      ...meta,
      mode: "live",
      is_mock: false
    },
    google_ads: {
      ...google,
      mode: "live",
      is_mock: false
    }
  };
}

export function loadConfig(env = process.env) {
  const mode = requireEnum(readString(env, "KASTONOM_MODE", "mock"), "KASTONOM_MODE", MODES);
  const fallbackEnabled = readBoolean(env, "KASTONOM_FALLBACK_ENABLED", mode === "mock");
  const defaultVideoProvider = requireEnum(
    readString(env, "KASTONOM_DEFAULT_VIDEO_PROVIDER", "mock"),
    "KASTONOM_DEFAULT_VIDEO_PROVIDER",
    VIDEO_PROVIDERS
  );
  const defaultPlatform = requireEnum(
    readString(env, "KASTONOM_DEFAULT_PLATFORM", "generic_vertical"),
    "KASTONOM_DEFAULT_PLATFORM",
    PLATFORMS
  );
  const defaultAspectRatio = requireEnum(
    readString(env, "KASTONOM_DEFAULT_ASPECT_RATIO", "9:16"),
    "KASTONOM_DEFAULT_ASPECT_RATIO",
    ASPECT_RATIOS
  );

  const config = {
    version: "0.1.0",
    mode,
    fallbackEnabled,
    demoTenantId: readString(env, "KASTONOM_DEMO_TENANT_ID", "demo-tenant"),
    defaultVideoProvider,
    defaultLanguage: readString(env, "KASTONOM_DEFAULT_LANGUAGE", "Turkish"),
    defaultPlatform,
    defaultDurationSeconds: readInteger(env, "KASTONOM_DEFAULT_DURATION_SECONDS", 15),
    defaultAspectRatio,
    publicBaseUrl: readString(env, "KASTONOM_PUBLIC_BASE_URL", "http://localhost:3001"),
    mockPreviewUrl: readString(env, "KASTONOM_MOCK_PREVIEW_URL", "/demo-assets/mock-ad-preview.mp4")
  };

  config.videoProviderReadiness = videoProviderReadiness(env);
  config.adPlatformReadiness = adPlatformReadiness(env, mode);
  config.supportedAdPlatforms = AD_PLATFORMS;

  return config;
}
