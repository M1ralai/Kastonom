export interface CampaignGenerateRequestDto {
  product_id: string;
  provider?: "pollo" | "kling" | "runway" | "mock";
  platform?: "tiktok" | "reels" | "youtube_shorts";
  duration_seconds?: number;
  language?: string;
}

export interface CampaignGenerateResponseDto {
  campaign_id: string;
  creative_brief: CreativeBriefDto;
  prompt_payload: Record<string, unknown>;
  video_job: VideoJobDto;
  fallback_reason: string | null;
}
