export interface ProductDto {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  hype_score: number | null;
  trend_potential: number | null;
  sales_velocity: number | null;
  stock_movement: number | null;
  new_product_boost: number | null;
  audience_fit: number | null;
  recommendation_reason: string | null;
  is_recommended: boolean;
  source: "mock" | "live" | "unknown";
  fallback_reason: string | null;
  created_at: string;
  updated_at: string;
}
