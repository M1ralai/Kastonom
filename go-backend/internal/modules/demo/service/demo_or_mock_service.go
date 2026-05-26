package service

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/demo/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/demo/repository"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

type DemoReplayService interface {
	Fallback(ctx domain.TenantContext) (dto.DemoFallbackResponse, error)
}
type Service struct {
	repo repository.DemoReplayRepository
}

func New(repo repository.DemoReplayRepository) *Service { return &Service{repo: repo} }
func (s *Service) Fallback(ctx domain.TenantContext) (dto.DemoFallbackResponse, error) {
	return s.repo.GetReplay(ctx.TenantID)
}
