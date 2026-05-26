package video

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type VideoJobService interface {
	Get(ctx domain.TenantContext, id string) (VideoJobResponse, bool)
	GetFull(ctx domain.TenantContext, id string) (FullVideoJobResponse, bool)
}
type GeneratedVideoService interface {
	Select(ctx domain.TenantContext, id string, req SelectGeneratedVideoRequest) (SelectGeneratedVideoResponse, bool)
}

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }
func (s *Service) Get(ctx domain.TenantContext, id string) (VideoJobResponse, bool) {
	return s.repo.GetJobView(ctx.TenantID, id)
}
func (s *Service) GetFull(ctx domain.TenantContext, id string) (FullVideoJobResponse, bool) {
	return s.repo.GetFullView(ctx.TenantID, id)
}
func (s *Service) Select(ctx domain.TenantContext, id string, req SelectGeneratedVideoRequest) (SelectGeneratedVideoResponse, bool) {
	return s.repo.SelectOne(ctx.TenantID, req.ProjectID, id)
}
