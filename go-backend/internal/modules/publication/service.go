package publication

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type AdPublicationService interface {
	Create(ctx domain.TenantContext, req CreateAdPublicationRequest) (CreateAdPublicationResponse, bool)
}
type MetricsService interface {
	Sync(ctx domain.TenantContext, publicationID string, req SyncMetricsRequest) (SyncMetricsResponse, bool)
}
type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }
func (s *Service) Create(ctx domain.TenantContext, req CreateAdPublicationRequest) (CreateAdPublicationResponse, bool) {
	pub, ok := s.repo.CreatePublication(ctx, req)
	return CreateAdPublicationResponse{AdPublication: pub}, ok
}
func (s *Service) Sync(ctx domain.TenantContext, publicationID string, req SyncMetricsRequest) (SyncMetricsResponse, bool) {
	snap, ok := s.repo.CreateMetrics(ctx, publicationID, req)
	return SyncMetricsResponse{MetricsSnapshot: snap}, ok
}
