import type { SourceAsset } from "@/shared/types/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function resolveAssetPreviewUrl(url?: string | null): string | null {
  const value = url?.trim();
  if (!value) return null;

  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value;
  }

  if (value.startsWith("/uploads/")) {
    return `${API_BASE_URL}${value}`;
  }

  return value;
}

export function getImageAssetPreviewUrl(assets: SourceAsset[]): string | null {
  const imageAsset = assets.find((asset) => asset.asset_type === "image" && asset.url);
  return resolveAssetPreviewUrl(imageAsset?.url);
}
