package service

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/video/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/video/repository"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

type VideoJobService interface {
	Get(ctx domain.TenantContext, id string) (dto.VideoJobResponse, bool, error)
	GetFull(ctx domain.TenantContext, id string) (dto.FullVideoJobResponse, bool, error)
	Cancel(ctx domain.TenantContext, id string) (dto.VideoJobResponse, bool, error)
}
type GeneratedVideoService interface {
	Select(ctx domain.TenantContext, id string, req dto.SelectGeneratedVideoRequest) (dto.SelectGeneratedVideoResponse, bool, error)
}

type Service struct {
	repo repository.VideoJobReadRepository
}

func New(repo repository.VideoJobReadRepository) *Service { return &Service{repo: repo} }
func (s *Service) Get(ctx domain.TenantContext, id string) (dto.VideoJobResponse, bool, error) {
	return s.repo.GetJobView(ctx.TenantID, id)
}
func (s *Service) GetFull(ctx domain.TenantContext, id string) (dto.FullVideoJobResponse, bool, error) {
	return s.repo.GetFullView(ctx.TenantID, id)
}
func (s *Service) Cancel(ctx domain.TenantContext, id string) (dto.VideoJobResponse, bool, error) {
	return s.repo.CancelJob(ctx.TenantID, id)
}
func (s *Service) Select(ctx domain.TenantContext, id string, req dto.SelectGeneratedVideoRequest) (dto.SelectGeneratedVideoResponse, bool, error) {
	return s.repo.SelectOne(ctx.TenantID, req.ProjectID, id)
}
