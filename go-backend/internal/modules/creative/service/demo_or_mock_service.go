package service

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/creative/repository"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

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
