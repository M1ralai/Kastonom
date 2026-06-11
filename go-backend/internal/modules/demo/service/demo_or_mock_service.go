// Package service implements the demo-fallback replay service.
//
// INTENT (Phase 3 migration, domain: demo-fallback):
//
//	This module is INTENTIONALLY PRESERVED as the offline/Pollo-down
//	replay path. There is no Pollo endpoint to call from Fallback — when
//	Pollo is unavailable the handler serves a local DB replay through
//	this service. The module is scheduled for later deletion, but its
//	interface contract (DemoReplayService.Fallback) must remain stable so
//	that the handler and bootstrap wiring keep compiling.
//
// DO NOT:
//   - Swap the Fallback body for a real Pollo HTTP call.
//   - Change the Fallback signature
//     (ctx domain.TenantContext) (dto.DemoFallbackResponse, error).
//   - Rename Service or the New constructor.
//
// See demo/repository.DemoReplayRepository for the matching contract.
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

// Fallback is the offline-fallback replay entry point. It is a thin
// pass-through to DemoReplayRepository.GetReplay, keyed by the tenant
// pulled from the request-scoped TenantContext. The signature is frozen
// by the demo-fallback contract.
func (s *Service) Fallback(ctx domain.TenantContext) (dto.DemoFallbackResponse, error) {
	return s.repo.GetReplay(ctx.TenantID)
}
