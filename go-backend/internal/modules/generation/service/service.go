package service

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/generation/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/generation/repository"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

type GenerationRequestService interface {
	Create(ctx domain.TenantContext, req dto.CreateGenerationRequestRequest) (dto.GenerationRequestResponse, bool, error)
	EstimateCost(ctx domain.TenantContext, req dto.EstimateCostRequest) dto.EstimateCostResponse
}

type Service struct {
	cfg  domain.AppConfig
	repo *repository.Repository
}

func New(cfg domain.AppConfig, repo *repository.Repository) *Service {
	return &Service{cfg: cfg, repo: repo}
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
	return dto.GenerationRequestResponse{GenerationRequest: req, PromptPayload: payload, VideoJob: job, ProviderResult: &result, GeneratedVideos: videos}, true, nil
}

func (s *Service) EstimateCost(ctx domain.TenantContext, req dto.EstimateCostRequest) dto.EstimateCostResponse {
	return demoOrMockEstimateCost(req)
}
