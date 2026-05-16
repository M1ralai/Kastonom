# Kastonom Frontend - Sayfa Bazlı Must-Have Attributes

> Tüm API responselar `{ data: T, message: string }` formatında (ApiResponse) gelir.  
> Mock veriler de bu formatta döndürülür.

---

## 1. Dashboard (`/dashboard`)

| Must-Have Attribute | Kaynak |
|---|---|
| **Product List** | `GET /products` → `ApiResponse<ProductDto[]>` |
| **Recommended Product Indicator** | `is_recommended: true` vurgusu |
| **Basic Product Metrics** | `hype_score`, `trend_potential`, `sales_velocity` |
| **Mock/Demo Badge** | `source === "mock"` veya `fallback_reason` varsa etiket |
| **Start Campaign Action** | Her ürün için "Generate Ad" butonu → `/campaigns/generate` |
| **Loading State** | `Loading products` spinner |
| **Error State** | `Product load failure` mesajı |
| **Empty State** | Ürün listesi boşsa bilgilendirme |
| **Fallback Mode Toggle** | Demo fallback aktif mi göster |

---

## 2. Product Insight Page (`/product/[id]`)

| Must-Have Attribute | Kaynak |
|---|---|
| **Selected Product Details** | Ürün adı, açıklaması, fiyatı, resmi |
| **Hype Score** | `hype_score` (0-100) |
| **Trend Potential Score** | `trend_potential` (0-100) |
| **Sales Velocity** | `sales_velocity` |
| **Stock Movement** | `stock_movement` |
| **New Product Boost** | `new_product_boost` |
| **Audience Fit** | `audience_fit` |
| **Recommendation Reason** | `recommendation_reason` metni |
| **Source Badge** | `source` (mock / live / unknown) |
| **Generate Campaign Button** | `POST /campaigns/generate` tetikler |
| **Back to Dashboard Link** | Geri dönüş |
| **Loading / Error States** | `Loading products` / `Product load failure` |

---

## 3. Creative Brief Preview (`/creative-brief`)

| Must-Have Attribute | Kaynak |
|---|---|
| **Audience Summary** | `creative_brief.audience_summary` |
| **Creative Angle** | `creative_brief.creative_angle` |
| **Tone** | `creative_brief.tone` |
| **Visual Style** | `creative_brief.visual_style` |
| **Hook** | `creative_brief.hook` |
| **Main Claim** | `creative_brief.main_claim` |
| **CTA** | `creative_brief.cta` |
| **Forbidden Claims** | `creative_brief.forbidden_claims[]` |
| **Fallback Notes** | `creative_brief.fallback_notes[]` |
| **Prompt Payload Display** | Backend explicit olarak gönderdiyse `prompt_payload` |
| **Campaign ID** | `campaign_id` |
| **Video Job Link** | Job status sayfasına geçiş butonu |
| **Mock/Fallback Label** | `fallback_reason` varsa etiket |
| **Creative Brief Ready State** | Durum göstergesi |

---

## 4. Video Generation Status (`/video-status/[id]`)

| Must-Have Attribute | Kaynak |
|---|---|
| **Campaign ID** | İlişkili kampanya |
| **Video Job ID** | `video_job.id` |
| **Provider Name** | `video_job.provider` (pollo / kling / runway / mock) |
| **Job Status** | `queued` → `processing` → `completed` / `failed` |
| **Mock/Live Label** | `is_mock === true` ise "Mock Provider" badge |
| **Preview URL** | `status === "completed"` ise göster |
| **Error State** | `status === "failed"` ise `error.code` + `error.message` |
| **Auto-Poll** | Her 3-5 sn `GET /video-jobs/{id}` |
| **Status Badge** | Renkli durum göstergesi |
| **Timestamp Info** | `created_at`, `updated_at` |
| **Go to Preview Button** | `completed` ise "View Ad" |

---

## 5. Final Ad Preview (`/ad-preview/[id]`)

| Must-Have Attribute | Kaynak |
|---|---|
| **Video/Static Preview** | `preview_url` varsa video, yoksa placeholder |
| **Provider Result Metadata** | Provider adı, job ID, oluşturma tarihi |
| **CTA and Platform Summary** | Platform (tiktok / reels / youtube_shorts) |
| **Fallback Reason** | `fallback_reason` varsa neden mock olduğu |
| **Mock Badge** | `is_mock === true` ise belirgin etiket |
| **Download/Share Actions** | Mock'ta disabled olabilir |
| **Create New Campaign Button** | Yeni kampanyaya dönüş |
| **Prompt Text Display** | Backend explicit olarak gönderdiyse |
| **Do Not Pretend Live** | Mock preview asla "live AI generated" gibi gösterilmemeli |

---

## 6. Campaign Generate Page (`/campaigns/generate`)

| Must-Have Attribute | Kaynak |
|---|---|
| **Product ID** | Readonly / hidden — hangi ürün için |
| **Provider Selector** | `pollo` / `kling` / `runway` / `mock` dropdown |
| **Platform Selector** | `tiktok` / `reels` / `youtube_shorts` dropdown |
| **Duration Input** | Video süresi (saniye) |
| **Language Input** | Prompt dili (default: Turkish) |
| **Submit Button** | `POST /campaigns/generate` |
| **Campaign Generation Loading** | `Campaign generation loading` spinner |
| **Error Handling** | `fallback_available === true` ise teklif |
| **Success Redirect** | `202` → Creative Brief sayfası |
| **Validation Errors** | `INVALID_PRODUCT_ID`, `PRODUCT_NOT_FOUND` vs. |

---

## 7. Settings Page (`/settings`)

| Must-Have Attribute | Kaynak |
|---|---|
| **Tenant ID Display** | `x-tenant-id` (demo: "demo-tenant") |
| **Demo Mode Toggle** | Fallback modu aç/kapat |
| **Provider Config Status** | Hangi provider'lar configured |
| **Reset Demo Data Button** | Mock veriyi sıfırla |
| **Environment Info** | `mode`, `version`, `source` |

---

## 8. Global Layout (Tüm Sayfalarda)

| Must-Have Attribute | Açıklama |
|---|---|
| **Navigation** | Dashboard, Settings, Help linkleri |
| **Mock/Demo Banner** | Fallback aktif ise üstte sarı banner |
| **Loading State Component** | Tüm async operasyonlarda |
| **Error Boundary** | Beklenmeyen hataları yakala |
| **Tenant Scope Indicator** | Hangi tenant'ta olduğu |
| **Backend Mode Badge** | `mock` / `live` / `degraded` |
| **Health Check** | `GET /health` → mode, version, status |

---

## 9. Auth / Login (eğer scope'a girerse)

| Must-Have Attribute | Açıklama |
|---|---|
| **Username / Email Input** | Giriş kimliği |
| **Password Input** | Şifre |
| **Demo Login Button** | "Continue as Demo" |
| **Error Message** | `UNAUTHORIZED`, `INVALID_TENANT` |
| **Remember Me** | Opsiyonel |

---

## Kaynaklar

- `docs/contracts/api.contract.yaml`
- `docs/layers/frontend.contract.md`
- `docs/contracts/data-model.contract.yaml`
