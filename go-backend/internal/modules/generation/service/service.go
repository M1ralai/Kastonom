package service

import (
	"errors"
	"fmt"

	"github.com/M1ralai/Kastonom/backend/internal/modules/generation/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/generation/repository"
	"github.com/M1ralai/Kastonom/backend/internal/provider/pollo"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/providererr"
)

type GenerationRequestService interface {
	Create(ctx domain.TenantContext, req dto.CreateGenerationRequestRequest) (dto.GenerationRequestResponse, bool, error)
	EstimateCost(ctx domain.TenantContext, req dto.EstimateCostRequest) dto.EstimateCostResponse
}

// Service is the GenerationRequest implementation. pollo is the real
// Pollo AI HTTP client; it is nil when KASTONOM_MODE=mock OR the API key
// is not configured, in which case all calls fall through to the offline
// mock branch (preserved from the pre-migration code).
type Service struct {
	cfg   domain.AppConfig
	repo  *repository.Repository
	pollo *pollo.Client
}

// New builds a Service with no real Pollo client. Used by tests and the
// bootstrap path when the mode is "mock".
func New(cfg domain.AppConfig, repo *repository.Repository) *Service {
	return &Service{cfg: cfg, repo: repo}
}

// NewWithPollo builds a Service wired to a real Pollo client. The client
// itself decides whether to make real calls based on Enabled() — passing
// a client that is not Enabled() is equivalent to passing nil.
func NewWithPollo(cfg domain.AppConfig, repo *repository.Repository, p *pollo.Client) *Service {
	return &Service{cfg: cfg, repo: repo, pollo: p}
}

func (s *Service) Create(ctx domain.TenantContext, input dto.CreateGenerationRequestRequest) (dto.GenerationRequestResponse, bool, error) {
	project, subject, ok, err := s.repo.ProjectInput(ctx.TenantID, input.ProjectID)
	if err != nil || !ok {
		return dto.GenerationRequestResponse{}, ok, err
	}
	provider := input.Provider
	if provider == "" {
		provider = s.cfg.DefaultVideoProvider
	}
	if input.Platform == "" {
		input.Platform = s.cfg.DefaultPlatform
	}
	if input.Language == "" {
		input.Language = s.cfg.DefaultLanguage
	}
	if input.DurationSeconds == 0 {
		input.DurationSeconds = s.cfg.DefaultDurationSeconds
	}
	if input.AspectRatio == "" {
		input.AspectRatio = s.cfg.DefaultAspectRatio
	}
	req, payload, job, result, videos := s.createDemoOrMockGeneration(ctx, project, *subject, input, provider)
	err = s.repo.Create(req, payload, job, result, videos)
	if err != nil {
		return dto.GenerationRequestResponse{}, false, err
	}

	// Surface provider errors that survived the helper (fallback disabled
	// + real call failed). The repository has already persisted the
	// "failed" record; we translate the typed error into a 4xx so the
	// caller can see what went wrong.
	if job.Status == "failed" && job.ErrorCode != nil {
		providerMsg := ""
		if job.ErrorMessage != nil {
			providerMsg = *job.ErrorMessage
		}
		// Return a sentinel-wrapped error so the HTTP boundary can map it
		// to a 502/503. Service callers see BadRequest today; that is
		// preserved to keep the existing handler happy.
		return dto.GenerationRequestResponse{GenerationRequest: req, PromptPayload: payload, VideoJob: job, ProviderResult: &result, GeneratedVideos: videos, FallbackReason: job.ErrorMessage}, true, fmt.Errorf("provider generation failed: %s: %w", providerMsg, errors.Join(providererr.ErrPolloUnavailable, err))
	}

	return dto.GenerationRequestResponse{GenerationRequest: req, PromptPayload: payload, VideoJob: job, ProviderResult: &result, GeneratedVideos: videos}, true, nil
}

func (s *Service) EstimateCost(ctx domain.TenantContext, req dto.EstimateCostRequest) dto.EstimateCostResponse {
	return demoOrMockEstimateCost(req)
}
