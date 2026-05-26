package service

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/publication/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/publication/repository"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

type AdPublicationService interface {
	Create(ctx domain.TenantContext, req dto.CreateAdPublicationRequest) (dto.CreateAdPublicationResponse, bool, error)
}
type MetricsService interface {
	Sync(ctx domain.TenantContext, publicationID string, req dto.SyncMetricsRequest) (dto.SyncMetricsResponse, bool, error)
}
type Service struct{ repo *repository.Repository }

func New(repo *repository.Repository) *Service { return &Service{repo: repo} }
func (s *Service) Create(ctx domain.TenantContext, req dto.CreateAdPublicationRequest) (dto.CreateAdPublicationResponse, bool, error) {
	pub, ok, err := s.repo.CreatePublication(ctx, req)
	return dto.CreateAdPublicationResponse{AdPublication: pub}, ok, err
}
func (s *Service) Sync(ctx domain.TenantContext, publicationID string, req dto.SyncMetricsRequest) (dto.SyncMetricsResponse, bool, error) {
	snap, ok, err := s.repo.CreateMetrics(ctx, publicationID, req)
	return dto.SyncMetricsResponse{MetricsSnapshot: snap}, ok, err
}
