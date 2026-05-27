# Kod Kalite ve Mimari Sorunlar Raporu

> Oluşturulma: 2026-05-27
> Proje: Kastonom Go Backend
> Amaç: İleride başımızı ağrıtacak sorunlu yerlerin tespiti

---

## Özet

| Severity | Sayı |
|----------|------|
| Critical | 4    |
| High     | 8    |
| Medium   | 8    |
| Low      | 5    |
| **Toplam** | **25** |

---

## KRITIK — Üretim yapmadan önce mutlaka düzeltilmeli

### 1. Hiçbir route'ta auth middleware yok

**Dosyalar:**
- `internal/modules/auth/handler/handler.go`
- `internal/modules/creative/handler/handler.go`
- `internal/modules/generation/handler/handler.go`
- `internal/modules/publication/handler/handler.go`
- `internal/modules/dashboard/handler/handler.go`
- `internal/modules/tenant/handler/handler.go`
- `internal/modules/video/handler/handler.go`
- `internal/modules/iteration/handler/handler.go`

**Sorun:** `RegisterRoutes()` içinde hiçbir route'a auth middleware uygulanmıyor. `VerifyToken()` fonksiyonu var ama hiç çağrılmıyor.

**Etki:** `POST /creative-projects`, `POST /generation-requests`, `POST /ad-publications` gibi kritik endpoint'ler tamamen korumasız.

---

### 2. Şifreleme için sadece SHA256 kullanılıyor

**Dosya:** `internal/modules/auth/service/service.go:33-36`

```go
func hashPassword(password string) string {
    sum := sha256.Sum256([]byte(password))
    return hex.EncodeToString(sum[:])
}
```

**Sorun:** SHA256 password hashing için uygun DEĞİL. GPU ile saniyede milyarlarca hash denenebilir. bcrypt, argon2 veya scrypt kullanılmalı.

---

### 3. Tahmin edilebilir token formatı

**Dosya:** `internal/modules/auth/service/service.go:38-40, 71-72`

```go
func makeToken(user model.User) string {
    return "dev-token:" + user.ID + ":" + user.TenantID
}
```

**Sorun:** Token formatının tahmin edilebilir olması ciddi güvenlik riski. JWT veya secure random token kullanılmalı.

---

### 4. Hardcoded database credentials

**Dosya:** `internal/infrastructure/postgres/postgres.go:19`

```go
dsn = "postgres://postgres:postgres@localhost:5432/kastonom?sslmode=disable"
```

**Sorun:** Kod içinde hardcoded database şifresi var. Bu şifre yanlışlıkla git'e commit edilirse kritik güvenlik açığı oluşur.

---

## YÜKSEK — Üretimden önce düzeltilmeli

### 5. Yutulan hatalar (swallowed errors)

**Dosya:** `internal/modules/auth/handler/handler.go:82-83, 100-101`

```go
func (h *Handler) Refresh(c fiber.Ctx) error {
    res, _ := h.service.RefreshToken(req)  // HATA YUTULUYOR!
    return c.JSON(res)
}

func (h *Handler) Logout(c fiber.Ctx) error {
    res, _ := h.service.Logout(req)  // HATA YUTULUYOR!
    return c.JSON(res)
}
```

**Sorun:** `RefreshToken` ve `Logout`'ta hata yok sayılıyor ve boş/yanlış response döndürülüyor. Client yanlış bilgi alır.

---

### 6. Demo/mock kod production path'lerinde

**Sorunlu dosyalar:**
- `internal/modules/demo/handler/demo_or_mock_handler.go`
- `internal/modules/demo/repository/demo_or_mock_repository.go`
- `internal/modules/demo/service/demo_or_mock_service.go`
- `internal/modules/tenant/repository/demo_or_mock_repository.go`
- `internal/modules/dashboard/repository/demo_or_mock_repository.go`
- `internal/modules/iteration/repository/demo_or_mock_repository.go`
- `internal/modules/creative/repository/demo_or_mock_repository.go`
- `internal/modules/creative/service/demo_or_mock_service.go`
- `internal/modules/generation/service/demo_or_mock_service.go`

**Sorun:** Mock kod production path'lerinde yaşıyor ve gerçek implementasyonu gizliyor. Hardcoded kredi miktarları, KPI değerleri gerçek sanılıyor.

---

### 7. N+1 query problemi

**Dosya:** `internal/modules/creative/repository/repository.go:61-78`

```go
func (r *Repository) ListBundles(tenantID string) ([]domain.CreativeProjectBundle, error) {
    var projects []domain.CreativeProject
    err := r.db.Select(&projects, ...)  // 1 query
    for _, project := range projects {
        bundle, _, err := r.GetBundle(tenantID, project.ID)  // N queries!
    }
}
```

**Sorun:** 100 proje varsa 101 query çalışır. Tek sorguda yapılmalı veya LIMIT/OFFSET pagination eklenmeli.

---

### 8. Transaction boundary sorunu

**Dosya:** `internal/modules/publication/repository/repository.go:16-24`

```go
func (r *Repository) CreatePublication(...) {
    _, _ = r.db.Exec(`UPDATE creative_projects SET status='published' ...`)  // YUTULAN HATA!
    _, _ = r.db.Exec(`UPDATE generated_videos SET status='published' ...`)  // YUTULAN HATA!
}
```

**Sorun:** UPDATE hataları yutuluyor ve transaction kullanılmıyor. Yarım kalmış işlemler olabilir.

---

### 9. Tenant isolation sadece header-based

**Dosya:** `internal/shared/httpx/httpx.go:16-32`

```go
func TenantContext(c fiber.Ctx, cfg domain.AppConfig) domain.TenantContext {
    tenantID := c.Get("x-tenant-id")  // HTTP header'dan alınıyor
}
```

**Sorun:** TenantID sadece HTTP header'dan alınıyor. Bu kolayca伪造 edilebilir. Token veya session'dan tenant doğrulaması yapılmalı.

---

### 10. CORS wildcard

**Dosya:** `internal/bootstrap/app.go:61`

```go
c.Set("access-control-allow-origin", "*")
```

**Sorun:** Production'da `*` (her domain) izin vermek güvenlik riski. Sadece frontend domain izin verilmeli.

---

### 11. Pagination eksik

**Dosyalar:**
- `internal/modules/creative/handler/handler.go:60-66`
- `internal/modules/dashboard/handler/handler.go:53-59`

**Sorun:** List endpoint'lerinde limit/offset yok. Büyüyen veriyle çöker.

---

### 12. SQL Column Alias tutarsızlığı

**Dosya:** `internal/modules/demo/repository/demo_or_mock_repository.go:18`

```go
err := r.db.Get(&project, `SELECT id, tenant_id AS tenantid, ...`, tenantID)
```

**Sorun:** Alias `"tenantid"` olarak verilmiş ama struct'ta `TenantID` var. Tutarsız alias'lar veri kaybına neden olabilir.

---

## ORTA — Yakında düzeltilmeli

### 13. Input validation eksik

**Dosya:** `internal/modules/dashboard/handler/handler.go:54`

```go
limit, _ := strconv.Atoi(c.Query("limit", "10"))  // Max limit kontrolü yok
```

**Sorun:** `limit=999999999` gönderilebilir. Max sınır konulmalı.

---

### 14. Error response tutarsızlığı

**Dosya:** `internal/shared/httpx/httpx.go`

Bazı hatalar `BadRequest`, bazı yerlerde direkt error string döndürüyor. Tutarlı error response formatı olmalı.

---

### 15. Graceful shutdown yok

**Dosya:** `cmd/api/main.go:37`

```go
if err := app.Listen(":" + port); err != nil {
    log.Fatal(err)
}
```

**Sorun:** `app.Shutdown()` çağrılmıyor. SIGTERM/SIGINT handler'ları olmalı.

---

### 16. godotenv loading path sorunu

**Dosya:** `cmd/api/main.go:24`

```go
_ = godotenv.Load("go-backend/.env.local", "go-backend/.env", ".env.local", ".env")
```

**Sorun:** Proje root'undan çalıştırılınca yanlış `.env` yüklenebilir.

---

### 17. Domain modellerinde DB index tag'ları eksik

**Sorun:** Model struct'larında `json` tag'ları var ama `db` tag'ları yok. Index tanımları belirsiz.

**Gerekli index'ler:**
- `creative_projects.tenant_id`
- `creative_projects.project_id`
- `source_assets.tenant_id, project_id`
- `generation_requests.tenant_id, project_id`
- `generated_videos.tenant_id, project_id`

---

### 18. Demo module - Belirsiz amaç

**Dosya:** `internal/modules/demo/...`

5 dosyalı bir demo modülü var. Bu kodun ne zaman kullanılacağı veya production'dan kaldırılıp kaldırılmayacağı belirsiz.

---

## DÜŞÜK — İyileştirme

### 19. Type alias'lar gerçek abstraction sağlamıyor

**Örnek:** `internal/modules/auth/model/model.go`

```go
type User = domain.User
```

**Sorun:** Tip alias'ları sadece namespace kirletiyor, gerçek bir katmanlama sağlamıyor.

---

### 20. Magic number'lar

**Dosya:** `internal/modules/dashboard/repository/demo_or_mock_repository.go:9-11`

```go
RemainingCredits: 120 - monthlyVideoCount,
MonthlyAllowance: 120,
```

**Sorun:** Bu değerler configuration'dan gelmeli.

---

### 21. Boş model dosyası

**Dosya:** `internal/modules/demo/model/model.go`

```go
type DemoReplay struct{}
```

En azından comment/dokümantasyon eklenmeli.

---

### 22. Swagger type alias dosyaları gereksiz

**Dosya:** `internal/modules/dashboard/handler/swagger_types.go`

```go
type KpiSummaryResponse = dto.KpiSummaryResponse
```

Sadece alias, ayrı dosyaya gerek yok.

---

### 23. Service layer duplication

**Dosya:**
- `internal/modules/creative/service/service.go`
- `internal/modules/creative/service/demo_or_mock_service.go`

İki ayrı dosyada aynı servis tanımlanmış.

---

### 24. Unused Logger middleware değişkeni

**Dosya:** `internal/shared/logging/middleware.go:64-75`

`statusCode()` fonksiyonu mantığı Fiber'in default davranışıyla çakışıyor olabilir.

---

### 25. Inconsistent error handling styles

- Bazı yerlerde `return err` (propagation)
- Bazı yerlerde `return BadRequest(c, err.Error())`
- Bazı yerlerde error yok sayılıyor (`_, _ =`)

---

## Öncelikli Aksiyon Listesi

### Hemen (Critical)
- [ ] Auth middleware ekle — tüm route'lara token doğrulama
- [ ] Password hashing'i bcrypt/argon2'ye geçir
- [ ] Token formatını JWT veya secure random'a çevir
- [ ] Hardcoded database credentials'ı kaldır

### Yakında (High)
- [ ] Yutulan hataları düzelt (`_, _ =` kullanımını kaldır)
- [ ] Demo/mock kodları production'dan ayır veya temizle
- [ ] N+1 query problemini çöz (JOIN veya eager loading)
- [ ] Publication transaction boundary'sini düzelt
- [ ] Tenant isolation'ı cryptographic hale getir
- [ ] CORS wildcard'ı frontend domain ile değiştir
- [ ] Pagination ekle (limit/offset veya cursor-based)

### Sonra (Medium)
- [ ] Input validation'a max limit ekle
- [ ] Tutarlı error response formatı oluştur
- [ ] Graceful shutdown ekle
- [ ] godotenv path sorununu düzelt
- [ ] DB index tag'larını model'lere ekle
- [ ] Demo modülünü kaldır veya izole et

### İyileştirme (Low)
- [ ] Type alias'ları yeniden düşün
- [ ] Magic number'ları config'e taşı
- [ ] Boş dosyaları temizle
- [ ] Swagger alias dosyalarını kaldır
- [ ] Error handling style'ı standardize et
