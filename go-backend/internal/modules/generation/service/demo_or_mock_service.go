package service

import (
	"fmt"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/generation/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/generation/repository"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

func (s *Service) createDemoOrMockGeneration(ctx domain.TenantContext, project domain.CreativeProject, subject domain.CreativeSubject, input dto.CreateGenerationRequestRequest, provider string) (domain.GenerationRequest, domain.PromptPayload, domain.VideoJob, domain.ProviderResult, []domain.GeneratedVideo) {
	now := time.Now().UTC()
	req := domain.GenerationRequest{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, CreativeSubjectID: subject.ID, SourceAssetIDs: input.SourceAssetIDs, Status: "completed", Objective: input.Objective, TargetAudience: input.TargetAudience, Platform: input.Platform, Language: input.Language, Tone: input.Tone, Style: input.Style, CallToAction: input.CallToAction, DurationSeconds: input.DurationSeconds, AspectRatio: input.AspectRatio, UserNotes: input.UserNotes, FallbackNotes: []string{}, CreatedAt: now, UpdatedAt: now}
	payload := domain.PromptPayload{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, GenerationRequestID: req.ID, Provider: provider, PromptText: fmt.Sprintf("Create a %s ad video for %s", input.Platform, subject.Name), NegativePrompt: "misleading claims, unsafe content", Language: input.Language, DurationSeconds: input.DurationSeconds, AspectRatio: input.AspectRatio, SourceAssetIDs: input.SourceAssetIDs, ProviderOptions: map[string]any{}, IsMock: provider == "mock", FallbackNotes: []string{}, CreatedAt: now}
	job := domain.VideoJob{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, GenerationRequestID: req.ID, PromptPayloadID: payload.ID, Provider: provider, Status: "completed", IsMock: provider == "mock", AttemptCount: 1, CreatedAt: now, CompletedAt: &now, UpdatedAt: now}
	result := domain.ProviderResult{ID: repository.NewID(), TenantID: ctx.TenantID, VideoJobID: job.ID, Provider: provider, NormalizedStatus: "completed", ResultURLs: []string{s.cfg.MockPreviewURL}, RedactedMetadata: map[string]any{"mock": true}, ReceivedAt: now}
	duration := input.DurationSeconds
	video := domain.GeneratedVideo{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, GenerationRequestID: req.ID, VideoJobID: job.ID, ProviderResultID: &result.ID, URL: s.cfg.MockPreviewURL, DurationSeconds: &duration, AspectRatio: input.AspectRatio, Status: "generated", IsMock: provider == "mock", CreatedAt: now}
	return req, payload, job, result, []domain.GeneratedVideo{video}
}

func demoOrMockEstimateCost(req dto.EstimateCostRequest) dto.EstimateCostResponse {
	credits := 1
	if req.DurationSeconds > 30 {
		credits = 2
	}
	amount := credits * 85
	return dto.EstimateCostResponse{EstimatedCredits: credits, EstimatedCost: dto.EstimatedCostDTO{Amount: amount, Currency: "TRY", MaxAmount: amount + 35}}
}
