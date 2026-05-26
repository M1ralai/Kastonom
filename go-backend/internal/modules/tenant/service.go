package tenant

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type TenantService interface {
	GetDetails(ctx domain.TenantContext) (TenantDetailsResponse, bool)
	GetCredits(ctx domain.TenantContext) TenantCreditsResponse
}

type Service struct{ repo TenantReadRepository }

func NewService(repo TenantReadRepository) *Service { return &Service{repo: repo} }

func (s *Service) GetDetails(ctx domain.TenantContext) (TenantDetailsResponse, bool) {
	tenant, ok := s.repo.GetDetails(ctx.TenantID)
	return TenantDetailsResponse{ID: tenant.ID, Name: tenant.Name, Mode: tenant.Mode, Status: tenant.Status, CreatedAt: tenant.CreatedAt}, ok
}

func (s *Service) GetCredits(ctx domain.TenantContext) TenantCreditsResponse {
	c := s.repo.GetCredits(ctx.TenantID)
	return TenantCreditsResponse(c)
}
