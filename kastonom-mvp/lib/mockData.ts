export interface ProductDto {
  id: string;
  name: string;
  category: string;
  hype_score: number;
  trend_potential: 'High' | 'Medium' | 'Low';
  sales_velocity: string;
  is_recommended: boolean;
  recommendation_reason: string | null;
  stock: number;
}

export interface CreativeBriefDto {
  id: string;
  productId: string;
  audience_summary: string;
  creative_angle: string;
  tone: string;
  visual_style: string;
  hook: string;
  main_claim: string;
  cta: string;
  forbidden_claims: string[];
  fallback_notes: string[];
}

// mockProducts dizisini dışarıya aktarıyoruz (export)
export const mockProducts: ProductDto[] = [
  {
    id: 'p-101',
    name: 'Ergonomic Standing Desk Pro',
    category: 'Office Furniture',
    hype_score: 92,
    trend_potential: 'High',
    sales_velocity: '15 units/day (Rising)',
    is_recommended: true,
    recommendation_reason: 'High search volume correlation with "WFH back pain" + strong inventory depth.',
    stock: 145,
  },
  {
    id: 'p-102',
    name: 'Ceramic Pour-Over Coffee Set',
    category: 'Kitchenware',
    hype_score: 45,
    trend_potential: 'Medium',
    sales_velocity: '2 units/day (Stable)',
    is_recommended: false,
    recommendation_reason: null,
    stock: 30,
  },
];

export const getMockProduct = (id: string) => mockProducts.find(p => p.id === id);

export const generateMockBrief = (productId: string): CreativeBriefDto => ({
  id: `cb-${Math.floor(Math.random() * 1000)}`,
  productId,
  audience_summary: 'Remote workers, ages 25-45, experiencing posture issues.',
  creative_angle: 'Transformation from fatigue to focus.',
  tone: 'Empathetic, Professional, Energetic',
  visual_style: 'Modern office, bright lighting, dynamic transitions',
  hook: 'Tired of back pain ruining your productivity?',
  main_claim: 'Elevate your workspace and your posture in seconds.',
  cta: 'Shop the Ergo Pro today with 15% off.',
  forbidden_claims: ['Cures scoliosis', 'Medical grade'],
  fallback_notes: ['If lifestyle imagery is low quality, rely on product 3D renders.'],
});

export const mockVideoJob = {
  id: 'vj-999',
  provider: 'Mock Pollo AI API',
  status: 'processing',
  predicted_conversion: '+24% vs static image benchmark',
};