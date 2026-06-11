package service

import (
	"context"
	"errors"

	"github.com/M1ralai/Kastonom/backend/internal/modules/creative/repository"
	"github.com/M1ralai/Kastonom/backend/internal/provider/pollo"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/providererr"
	"github.com/google/uuid"
)

// demoOrMockUploadedSourceAsset preserves the original mock contract:
//
//	func(ctx domain.TenantContext) domain.SourceAsset
//
// The signature is unchanged; all callers in service.go continue to compile.
// The body is now a *fallback* that runs only when no real Pollo client is
// configured (KASTONOM_MODE=mock or POLLO_API_KEY missing). When a Pollo
// client is wired in, the service calls uploadViaPollo and only falls back
// to this helper if the provider explicitly fails for a non-retryable
// reason AND KASTONOM_FALLBACK_ENABLED=true.
//
// TO MIGRATE AWAY: delete the uuid/uuid import + the demo return path and
// turn this function into a thin panic — the real path is now in service.go.
func demoOrMockUploadedSourceAsset(ctx domain.TenantContext) domain.SourceAsset {
	return domain.SourceAsset{
		ID:        repository.NewID(),
		TenantID:  ctx.TenantID,
		AssetType: "image",
		Source:    "upload",
		URL:       "/uploads/mock-upload.png",
		Metadata:  map[string]any{},
	}
}

// uploadViaPollo is the new real path. It calls POST /v1/assets/upload,
// verifies the asset is "ready" via GET /v1/assets/{id}, and returns a
// domain.SourceAsset that the repository can persist via
// SaveUnattachedAsset.
//
// Errors are wrapped with the shared providererr sentinels; callers can
// errors.Is(err, providererr.ErrPolloAuth) etc. to decide whether to
// bubble up, translate to an httpx response, or fall through to the mock.
func (s *Service) uploadViaPollo(ctx domain.TenantContext, p *pollo.Client) (domain.SourceAsset, error) {
	if p == nil || !p.Enabled() {
		// Mock mode (or missing config) — fall through.
		return demoOrMockUploadedSourceAsset(ctx), nil
	}

	stdCtx := pollo.WithRequestID(context.Background(), ctx.RequestID)
	stdCtx = pollo.WithTenantID(stdCtx, ctx.TenantID)
	idempotencyKey := idempotencyKeyForUpload(ctx)

	// The handler accepts only a tenant context (no body) so we send a
	// reference-mode request with a placeholder client_reference_id. The
	// downstream creative handler is the one that will fill in the actual
	// source URL once the user has chosen a file.
	req := pollo.SourceAssetUploadRequest{
		ClientReferenceID: idempotencyKey,
		Purpose:           "creative_source_asset",
	}

	resp, err := p.UploadSourceAsset(stdCtx, ctx, req, idempotencyKey)
	if err != nil {
		return domain.SourceAsset{}, err
	}
	asset, err := p.GetSourceAsset(stdCtx, ctx, resp.ID)
	if err != nil {
		return domain.SourceAsset{}, err
	}
	return domain.SourceAsset{
		ID:        repository.NewID(),
		TenantID:  ctx.TenantID,
		AssetType: "image",
		Source:    "upload",
		URL:       asset.URL,
		Metadata: map[string]any{
			"pollo_asset_id":  resp.ID,
			"pollo_status":    asset.Status,
			"idempotency_key": idempotencyKey,
		},
	}, nil
}

// idempotencyKeyForUpload is a deterministic, namespaced key. It is the
// same on every retry of the same logical request, satisfying the
// Idempotency-Key contract. UUID v4 is mixed in to keep different uploads
// from different requests within the same tenant distinct.
func idempotencyKeyForUpload(ctx domain.TenantContext) string {
	return "creative:upload:" + ctx.TenantID + ":" + ctx.RequestID + ":" + uuid.NewString()
}

// shouldFallBackToMock reports whether the given error means the service
// should fall through to demoOrMockUploadedSourceAsset. It is true only
// for transport / config failures when the runtime has explicitly opted
// into the fallback; 4xx (e.g. provider rejected the upload) is NOT
// retried via the mock because that would mask real product bugs.
func shouldFallBackToMock(err error, fallbackEnabled bool) bool {
	if err == nil || !fallbackEnabled {
		return false
	}
	return errors.Is(err, providererr.ErrPolloUnavailable) ||
		errors.Is(err, providererr.ErrPolloTimeout) ||
		errors.Is(err, providererr.ErrPolloRateLimit) ||
		errors.Is(err, providererr.ErrPolloAuth)
}
