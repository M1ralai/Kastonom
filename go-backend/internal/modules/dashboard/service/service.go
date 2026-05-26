package service

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/dashboard/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/dashboard/repository"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

type KpiSummaryService interface {
	GetSummary(ctx domain.TenantContext) (dto.KpiSummaryResponse, error)
}
type RecentActivitiesService interface {
	GetActivities(ctx domain.TenantContext, limit int) (dto.RecentActivitiesResponse, error)
}

type Service struct {
	repo repository.DashboardReadRepository
}

func New(repo repository.DashboardReadRepository) *Service { return &Service{repo: repo} }
func (s *Service) GetSummary(ctx domain.TenantContext) (dto.KpiSummaryResponse, error) {
	return s.repo.GetKpiSummary(ctx.TenantID)
}
func (s *Service) GetActivities(ctx domain.TenantContext, limit int) (dto.RecentActivitiesResponse, error) {
	return s.repo.GetRecentActivities(ctx.TenantID, limit)
}
