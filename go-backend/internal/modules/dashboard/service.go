package dashboard

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type KpiSummaryService interface {
	GetSummary(ctx domain.TenantContext) KpiSummaryResponse
}
type RecentActivitiesService interface {
	GetActivities(ctx domain.TenantContext, limit int) RecentActivitiesResponse
}
type Service struct{ repo DashboardReadRepository }

func NewService(repo DashboardReadRepository) *Service { return &Service{repo: repo} }
func (s *Service) GetSummary(ctx domain.TenantContext) KpiSummaryResponse {
	return s.repo.GetKpiSummary(ctx.TenantID)
}
func (s *Service) GetActivities(ctx domain.TenantContext, limit int) RecentActivitiesResponse {
	return s.repo.GetRecentActivities(ctx.TenantID, limit)
}
