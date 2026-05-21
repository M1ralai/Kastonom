# Missing Backend Endpoints for Live Mode

This document lists all backend endpoints that need to be implemented for the frontend to work in full live mode without any mock/fallback data.

---

## 1. KPI Summary Endpoint

**Endpoint**: `GET /dashboard/kpi-summary`

**Purpose**: HomePage KPI kartları için gerekli verileri sağlar.

**Request Headers**:
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Response**:
```json
{
  "monthly_video_count": 47,
  "monthly_video_change": 12,
  "remaining_credits": 1240,
  "credit_currency": "TRY",
  "average_ctr": 2.8,
  "sector_average_ctr": 1.4,
  "ctr_change_percent": 18
}
```

**Location**: `backend/src/dashboard/kpi-summary.service.js` (new file)

---

## 2. Recent Activities Endpoint

**Endpoint**: `GET /dashboard/recent-activities`

**Purpose**: HomePage "Son Aktiviteler" listesini besler.

**Request Headers**:
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Query Parameters**:
- `limit`: number (default: 10)

**Response**:
```json
{
  "activities": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "project_name": "Erkek Spor Ayakkabı – Nike Run",
      "status": "published|ready|generating|failed",
      "icon": "🟢",
      "generated_video": {
        "impressions": 4200,
        "ctr": 3.1
      },
      "updated_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

**Location**: `backend/src/dashboard/recent-activities.service.js` (new file)

---

## 3. Tenant Credits Endpoint

**Endpoint**: `GET /tenant/credits`

**Purpose**: Kredi bakiyesi ve kullanım bilgisi.

**Request Headers**:
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Response**:
```json
{
  "tenant_id": "uuid",
  "current_credits": 1240,
  "credit_currency": "TRY",
  "monthly_allowance": 50,
  "used_this_month": 30,
  "videos_per_credit": 1
}
```

**Location**: `backend/src/tenant/tenant.service.js` (new file)

---

## 4. Project Metrics Endpoint

**Endpoint**: `GET /creative-projects/:projectId/metrics`

**Purpose**: CreatePage'de AI skoru, kâr marjı, stok bilgisi.

**Request Headers**:
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Response**:
```json
{
  "project_id": "uuid",
  "creative_subject": {
    "id": "uuid",
    "name": "Erkek Koşu Ayakkabısı Pro X",
    "price": 1299,
    "currency": "TRY",
    "margin_percent": 42,
    "stock_count": 248,
    "ai_score": 87,
    "ai_reasons": [
      "Arama hacmi %40 arttı",
      "Sepet terk oranı düşük"
    ]
  },
  "erp_data": {
    "stock_available": 248,
    "stock_reserved": 12,
    "last_sync_at": "2026-01-15T10:00:00Z"
  }
}
```

**Location**: `backend/src/creative-projects/creative-project.service.js` (add method)

---

## 5. Estimated Cost Endpoint

**Endpoint**: `POST /generation-requests/estimate-cost`

**Purpose**: CreatePage'de tahmini maliyet gösterimi.

**Request Headers**:
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Request Body**:
```json
{
  "platform": "tiktok|reels|youtube_shorts|google_ads",
  "duration_seconds": 15,
  "aspect_ratio": "9:16"
}
```

**Response**:
```json
{
  "estimated_credits": 1,
  "estimated_cost": {
    "amount": 85,
    "currency": "TRY",
    "max_amount": 120
  }
}
```

**Location**: `backend/src/generation-requests/generation-request.service.js` (add method)

---

## 6. Video Job With Project Details

**Endpoint**: `GET /video-jobs/:jobId/full`

**Purpose**: PreviewPage'de video + project + product bilgisi tek seferde.

**Request Headers**:
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenant_id>`

**Response**:
```json
{
  "video_job": {
    "id": "uuid",
    "status": "completed",
    "created_at": "timestamp"
  },
  "generated_videos": [
    {
      "id": "uuid",
      "url": "https://...",
      "thumbnail_url": "https://...",
      "duration_seconds": 15,
      "aspect_ratio": "9:16",
      "status": "generated",
      "is_selected": false
    }
  ],
  "project": {
    "id": "uuid",
    "name": "Proje Adı"
  },
  "creative_subject": {
    "id": "uuid",
    "name": "Ürün Adı",
    "img": "📦"
  },
  "generation_request": {
    "platform": "tiktok",
    "tone": "Enerjik",
    "style": "Ürün Odaklı",
    "call_to_action": "Hemen Al"
  }
}
```

**Location**: `backend/src/video-jobs/video-job.service.js` (add method)

---

## Implementation Priority

| Priority | Endpoint | Used By | Status |
|----------|----------|---------|--------|
| 1 | `GET /video-jobs/:jobId/full` | PreviewPage | Missing |
| 2 | `GET /creative-projects/:projectId/metrics` | CreatePage | Missing |
| 3 | `GET /dashboard/recent-activities` | HomePage | Missing |
| 4 | `GET /dashboard/kpi-summary` | HomePage | Missing |
| 5 | `GET /tenant/credits` | NavBar | Missing |
| 6 | `POST /generation-requests/estimate-cost` | CreatePage | Missing |

---

## Files to Modify

1. `backend/src/app.js` - Add new routes
2. `backend/src/creative-projects/creative-project.service.js`
3. `backend/src/video-jobs/video-job.service.js`
4. `backend/src/generation-requests/generation-request.service.js`
5. `backend/src/metrics/metrics.service.js`

## Files to Create

1. `backend/src/dashboard/` (new folder)
   - `kpi-summary.service.js`
   - `recent-activities.service.js`
2. `backend/src/tenant/` (new folder)
   - `tenant.service.js`

---

## Notes

- All endpoints require `Authorization` header with valid JWT
- All endpoints require `x-tenant-id` header for tenant scoping
- Endpoints return `401` if not authenticated
- Endpoints return `404` if resource not found
- Empty arrays/objects return `{}` not `null`