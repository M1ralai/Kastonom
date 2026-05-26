package demo

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type DemoReplayService interface {
	Fallback(ctx domain.TenantContext) DemoFallbackResponse
}
type Service struct{ repo DemoReplayRepository }

func NewService(repo DemoReplayRepository) *Service { return &Service{repo: repo} }
func (s *Service) Fallback(ctx domain.TenantContext) DemoFallbackResponse {
	return s.repo.GetReplay(ctx.TenantID)
}
