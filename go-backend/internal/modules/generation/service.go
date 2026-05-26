package generation

import (
	"fmt"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
)

type GenerationRequestService interface {
	Create(ctx domain.TenantContext, req CreateGenerationRequestRequest) (GenerationRequestResponse, bool)
	EstimateCost(ctx domain.TenantContext, req EstimateCostRequest) EstimateCostResponse
}

type Service struct {
	cfg  domain.AppConfig
	repo *Repository
}

func NewService(cfg domain.AppConfig, repo *Repository) *Service {
	return &Service{cfg: cfg, repo: repo}
}

func (s *Service) Create(ctx domain.TenantContext, input CreateGenerationRequestRequest) (GenerationRequestResponse, bool) {
	project, subject, ok := s.repo.ProjectInput(ctx.TenantID, input.ProjectID)
	if !ok {
		return GenerationRequestResponse{}, false
	}
	now := time.Now().UTC()
	provider := input.Provider
	if provider == "" {
		provider = s.cfg.DefaultVideoProvider
	}
	if provider == "" {
		provider = "mock"
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
	req := domain.GenerationRequest{ID: store.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, CreativeSubjectID: subject.ID, SourceAssetIDs: input.SourceAssetIDs, Status: "completed", Objective: input.Objective, TargetAudience: input.TargetAudience, Platform: input.Platform, Language: input.Language, Tone: input.Tone, Style: input.Style, CallToAction: input.CallToAction, DurationSeconds: input.DurationSeconds, AspectRatio: input.AspectRatio, UserNotes: input.UserNotes, FallbackNotes: []string{}, CreatedAt: now, UpdatedAt: now}
	payload := domain.PromptPayload{ID: store.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, GenerationRequestID: req.ID, Provider: provider, PromptText: fmt.Sprintf("Create a %s ad video for %s", input.Platform, subject.Name), NegativePrompt: "misleading claims, unsafe content", Language: input.Language, DurationSeconds: input.DurationSeconds, AspectRatio: input.AspectRatio, SourceAssetIDs: input.SourceAssetIDs, ProviderOptions: map[string]any{}, IsMock: provider == "mock", FallbackNotes: []string{}, CreatedAt: now}
	job := domain.VideoJob{ID: store.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, GenerationRequestID: req.ID, PromptPayloadID: payload.ID, Provider: provider, Status: "completed", IsMock: provider == "mock", AttemptCount: 1, CreatedAt: now, CompletedAt: &now, UpdatedAt: now}
	result := domain.ProviderResult{ID: store.NewID(), TenantID: ctx.TenantID, VideoJobID: job.ID, Provider: provider, NormalizedStatus: "completed", ResultURLs: []string{s.cfg.MockPreviewURL}, RedactedMetadata: map[string]any{"mock": true}, ReceivedAt: now}
	duration := input.DurationSeconds
	video := domain.GeneratedVideo{ID: store.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, GenerationRequestID: req.ID, VideoJobID: job.ID, ProviderResultID: &result.ID, URL: s.cfg.MockPreviewURL, DurationSeconds: &duration, AspectRatio: input.AspectRatio, Status: "generated", IsMock: provider == "mock", CreatedAt: now}
	s.repo.Create(req, payload, job, result, []domain.GeneratedVideo{video})
	return GenerationRequestResponse{GenerationRequest: req, PromptPayload: payload, VideoJob: job, ProviderResult: &result, GeneratedVideos: []domain.GeneratedVideo{video}}, true
}

func (s *Service) EstimateCost(ctx domain.TenantContext, req EstimateCostRequest) EstimateCostResponse {
	credits := 1
	if req.DurationSeconds > 30 {
		credits = 2
	}
	amount := credits * 85
	return EstimateCostResponse{EstimatedCredits: credits, EstimatedCost: EstimatedCostDTO{Amount: amount, Currency: "TRY", MaxAmount: amount + 35}}
}
