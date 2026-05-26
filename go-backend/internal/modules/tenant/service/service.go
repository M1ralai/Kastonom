package service

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/tenant/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/tenant/repository"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

type TenantService interface {
	GetDetails(ctx domain.TenantContext) (dto.TenantDetailsResponse, bool, error)
	GetCredits(ctx domain.TenantContext) (dto.TenantCreditsResponse, error)
}

type Service struct {
	repo repository.TenantReadRepository
}

func New(repo repository.TenantReadRepository) *Service { return &Service{repo: repo} }

func (s *Service) GetDetails(ctx domain.TenantContext) (dto.TenantDetailsResponse, bool, error) {
	tenant, ok, err := s.repo.GetDetails(ctx.TenantID)
	return dto.TenantDetailsResponse{ID: tenant.ID, Name: tenant.Name, Mode: tenant.Mode, Status: tenant.Status, CreatedAt: tenant.CreatedAt}, ok, err
}

func (s *Service) GetCredits(ctx domain.TenantContext) (dto.TenantCreditsResponse, error) {
	c, err := s.repo.GetCredits(ctx.TenantID)
	return dto.TenantCreditsResponse(c), err
}
