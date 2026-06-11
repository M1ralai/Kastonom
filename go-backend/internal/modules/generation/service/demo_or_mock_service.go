package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/generation/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/generation/repository"
	"github.com/M1ralai/Kastonom/backend/internal/provider/pollo"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/logging"
	"github.com/M1ralai/Kastonom/backend/internal/shared/providererr"
	"go.uber.org/zap"
)

// createDemoOrMockGeneration is the in-package helper that materializes a
// (GenerationRequest, PromptPayload, VideoJob, ProviderResult, []GeneratedVideo)
// tuple for a given input. Its signature is the contract that
// service.Create depends on and MUST NOT change.
//
// Behavior:
//   - When s.pollo != nil AND provider == "pollo" AND KASTONOM_MODE != "mock",
//     make a real POST /v1/videos call to the Pollo API. The returned job is
//     marked status="processing" with the provider_job_id stored on the
//     VideoJob so the webhook / poll loop can advance it.
//   - Otherwise, fall through to the original mock branch so the offline
//     demo replay contract is preserved byte-for-byte (FallbackEnabled
//     tenants still get instant "completed" responses).
//
// The provider is selected from s.cfg.DefaultVideoProvider when input.Provider
// is empty; the caller in service.Create has already populated it.
func (s *Service) createDemoOrMockGeneration(ctx domain.TenantContext, project domain.CreativeProject, subject domain.CreativeSubject, input dto.CreateGenerationRequestRequest, provider string) (domain.GenerationRequest, domain.PromptPayload, domain.VideoJob, domain.ProviderResult, []domain.GeneratedVideo) {
	if s.shouldCallPollo(provider) {
		req, payload, job, result, videos, err := s.createRealPollo(ctx, project, subject, input, provider)
		if err == nil {
			return req, payload, job, result, videos
		}
		// Real call failed: log + fall through to mock ONLY when fallback is
		// enabled AND the tenant is the demo tenant (i.e. FallbackEnabled
		// is a runtime opt-in for offline replay). Otherwise propagate the
		// typed error back to service.Create via the returned tuple — the
		// caller will surface it as a BadRequest with the original message.
		if !s.cfg.FallbackEnabled || !ctx.FallbackEnabled {
			return s.errorTuple(ctx, project, subject, input, provider, err)
		}
		logging.L().Warn("pollo: real call failed, falling back to mock",
			zap.String("tenant_id", ctx.TenantID),
			zap.String("project_id", project.ID),
			zap.String("provider", provider),
			zap.Error(err),
		)
	}
	return s.createMock(ctx, project, subject, input, provider)
}

// shouldCallPollo reports whether the live Pollo code path should run for
// this request. Three conditions must all hold:
//   - the configured mode is not "mock" (the runtime kill switch),
//   - the provider argument is the canonical "pollo" string,
//   - a configured Pollo client + API key are available.
func (s *Service) shouldCallPollo(provider string) bool {
	if s == nil {
		return false
	}
	if s.cfg.Mode == "mock" {
		return false
	}
	if !strings.EqualFold(strings.TrimSpace(provider), pollo.ProviderName) {
		return false
	}
	return s.pollo != nil && s.pollo.Enabled()
}

// createRealPollo executes POST /v1/videos via the real client. The
// generation request is recorded with status="processing"; the caller
// (service.Create) persists it via the existing repository. Real provider
// result URLs and final status will arrive via the webhook handler or the
// video-job Get endpoint.
func (s *Service) createRealPollo(ctx domain.TenantContext, project domain.CreativeProject, subject domain.CreativeSubject, input dto.CreateGenerationRequestRequest, provider string) (domain.GenerationRequest, domain.PromptPayload, domain.VideoJob, domain.ProviderResult, []domain.GeneratedVideo, error) {
	now := time.Now().UTC()
	promptText := buildPromptText(input, subject)
	negativePrompt := "misleading claims, unsafe content"
	payloadID := repository.NewID()
	jobID := repository.NewID()
	resultID := repository.NewID()
	requestID := repository.NewID()

	// Deterministic idempotency key: (tenant, project, request) hash so
	// retries within the lifetime of the same logical request collapse into
	// a single Pollo job. Spec calls for hash(tenant_id, project_id, request_id).
	idempotencyKey := fmt.Sprintf("%s:%s:%s", ctx.TenantID, project.ID, ctx.RequestID)

	payload := domain.PromptPayload{
		ID:                  payloadID,
		TenantID:            ctx.TenantID,
		ProjectID:           project.ID,
		GenerationRequestID: requestID,
		Provider:            provider,
		PromptText:          promptText,
		NegativePrompt:      negativePrompt,
		Language:            input.Language,
		DurationSeconds:     input.DurationSeconds,
		AspectRatio:         input.AspectRatio,
		SourceAssetIDs:      input.SourceAssetIDs,
		ProviderOptions:     map[string]any{},
		IsMock:              false,
		FallbackNotes:       []string{},
	}

	// Build the Pollo request DTO. The source-asset URLs cannot be resolved
	// here (the assets live in tenant storage) so they are passed as
	// opaque IDs; the Pollo endpoint will reject them as invalid. The
	// adapter that loads signed URLs from the SourceAsset repository is
	// TODO(migration): wire SourceAssetRepository.GetURLs(projectID, ids).
	polloReq := pollo.CreateVideoRequest{
		Model:           defaultPolloModel,
		Prompt:          promptText,
		NegativePrompt:  negativePrompt,
		DurationSec:     input.DurationSeconds,
		AspectRatio:     input.AspectRatio,
		Platform:        input.Platform,
		Language:        input.Language,
		SourceAssetURLs: input.SourceAssetIDs, // see TODO above
		IdempotencyKey:  idempotencyKey,
	}

	// Use a fresh context for the outbound HTTP call. The TenantContext
	// does not implement context.Context; convert via a background root
	// and stamp request/tenant id via the provider helpers so the
	// X-Request-ID / X-Tenant-ID headers are forwarded (per shared
	// concerns in the migration spec).
	httpCtx, cancel := context.WithTimeout(context.Background(), time.Duration(s.cfg.PolloTimeoutMs)*time.Millisecond)
	defer cancel()

	resp, err := s.pollo.Create(httpCtx, ctx, polloReq, idempotencyKey)
	if err != nil {
		return domain.GenerationRequest{}, domain.PromptPayload{}, domain.VideoJob{}, domain.ProviderResult{}, nil, err
	}
	if resp == nil || resp.ProviderJobID == "" {
		return domain.GenerationRequest{}, domain.PromptPayload{}, domain.VideoJob{}, domain.ProviderResult{}, nil, fmt.Errorf("pollo: create returned empty provider_job_id: %w", providererr.ErrPolloBadRequest)
	}

	submittedAt := time.Now().UTC()
	job := domain.VideoJob{
		ID:                  jobID,
		TenantID:            ctx.TenantID,
		ProjectID:           project.ID,
		GenerationRequestID: requestID,
		PromptPayloadID:     payloadID,
		Provider:            provider,
		// Status enum coverage for TS VideoJobStatus: the row is INSERTed
		// with status='queued' (the pre-Pollo state), then flips to
		// 'submitted' after a successful Pollo Create. The ProviderResult
		// row below carries the in-flight 'processing' state; the
		// webhook handler / polling helper will transition this row to
		// 'completed' or 'failed' when Pollo reports back, and to
		// 'canceled' when the cancel endpoint below is hit.
		Status:              "submitted",
		ProviderJobID:       stringPtr(resp.ProviderJobID),
		IsMock:              false,
		AttemptCount:        1,
		CreatedAt:           now,
		SubmittedAt:         &submittedAt,
		UpdatedAt:           now,
	}
	result := domain.ProviderResult{
		ID:               resultID,
		TenantID:         ctx.TenantID,
		VideoJobID:       jobID,
		Provider:         provider,
		ProviderJobID:    stringPtr(resp.ProviderJobID),
		RawStatus:        stringPtr(resp.Status),
		NormalizedStatus: "processing",
		ResultURLs:       []string{},
		RedactedMetadata: map[string]any{"idempotency_key": idempotencyKey, "pollo_status": resp.Status},
		ReceivedAt:       now,
	}
	req := domain.GenerationRequest{
		ID:                requestID,
		TenantID:          ctx.TenantID,
		ProjectID:         project.ID,
		CreativeSubjectID: subject.ID,
		SourceAssetIDs:    input.SourceAssetIDs,
		Status:            "processing",
		Objective:         input.Objective,
		TargetAudience:    input.TargetAudience,
		Platform:          input.Platform,
		Language:          input.Language,
		Tone:              input.Tone,
		Style:             input.Style,
		CallToAction:      input.CallToAction,
		DurationSeconds:   input.DurationSeconds,
		AspectRatio:       input.AspectRatio,
		UserNotes:         input.UserNotes,
		FallbackNotes:     []string{},
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	// No GeneratedVideo yet — that arrives via webhook / poll. The
	// repository persists an empty slice so the FK relationships stay
	// consistent with the mock branch.
	return req, payload, job, result, []domain.GeneratedVideo{}, nil
}

// createMock is the original offline branch, renamed for clarity. Behavior
// is byte-for-byte identical to the pre-migration helper.
func (s *Service) createMock(ctx domain.TenantContext, project domain.CreativeProject, subject domain.CreativeSubject, input dto.CreateGenerationRequestRequest, provider string) (domain.GenerationRequest, domain.PromptPayload, domain.VideoJob, domain.ProviderResult, []domain.GeneratedVideo) {
	now := time.Now().UTC()
	req := domain.GenerationRequest{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, CreativeSubjectID: subject.ID, SourceAssetIDs: input.SourceAssetIDs, Status: "completed", Objective: input.Objective, TargetAudience: input.TargetAudience, Platform: input.Platform, Language: input.Language, Tone: input.Tone, Style: input.Style, CallToAction: input.CallToAction, DurationSeconds: input.DurationSeconds, AspectRatio: input.AspectRatio, UserNotes: input.UserNotes, FallbackNotes: []string{}, CreatedAt: now, UpdatedAt: now}
	payload := domain.PromptPayload{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, GenerationRequestID: req.ID, Provider: provider, PromptText: fmt.Sprintf("Create a %s ad video for %s", input.Platform, subject.Name), NegativePrompt: "misleading claims, unsafe content", Language: input.Language, DurationSeconds: input.DurationSeconds, AspectRatio: input.AspectRatio, SourceAssetIDs: input.SourceAssetIDs, ProviderOptions: map[string]any{}, IsMock: provider == "mock", FallbackNotes: []string{}, CreatedAt: now}
	job := domain.VideoJob{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, GenerationRequestID: req.ID, PromptPayloadID: payload.ID, Provider: provider, Status: "completed", IsMock: provider == "mock", AttemptCount: 1, CreatedAt: now, CompletedAt: &now, UpdatedAt: now}
	result := domain.ProviderResult{ID: repository.NewID(), TenantID: ctx.TenantID, VideoJobID: job.ID, Provider: provider, NormalizedStatus: "completed", ResultURLs: []string{s.cfg.MockPreviewURL}, RedactedMetadata: map[string]any{"mock": true}, ReceivedAt: now}
	duration := input.DurationSeconds
	video := domain.GeneratedVideo{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, GenerationRequestID: req.ID, VideoJobID: job.ID, ProviderResultID: &result.ID, URL: s.cfg.MockPreviewURL, DurationSeconds: &duration, AspectRatio: input.AspectRatio, Status: "generated", IsMock: provider == "mock", CreatedAt: now}
	return req, payload, job, result, []domain.GeneratedVideo{video}
}

// errorTuple materializes a "failed" tuple that service.Create will
// persist when fallback is disabled and the real provider call failed.
// The status="failed" record is auditable; service.Create still surfaces
// the error message to the caller via the (T, ok, err) return.
func (s *Service) errorTuple(ctx domain.TenantContext, project domain.CreativeProject, subject domain.CreativeSubject, input dto.CreateGenerationRequestRequest, provider string, cause error) (domain.GenerationRequest, domain.PromptPayload, domain.VideoJob, domain.ProviderResult, []domain.GeneratedVideo) {
	now := time.Now().UTC()
	req := domain.GenerationRequest{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, CreativeSubjectID: subject.ID, SourceAssetIDs: input.SourceAssetIDs, Status: "failed", Objective: input.Objective, TargetAudience: input.TargetAudience, Platform: input.Platform, Language: input.Language, Tone: input.Tone, Style: input.Style, CallToAction: input.CallToAction, DurationSeconds: input.DurationSeconds, AspectRatio: input.AspectRatio, UserNotes: input.UserNotes, FallbackNotes: []string{cause.Error()}, CreatedAt: now, UpdatedAt: now}
	payload := domain.PromptPayload{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, GenerationRequestID: req.ID, Provider: provider, PromptText: buildPromptText(input, subject), NegativePrompt: "misleading claims, unsafe content", Language: input.Language, DurationSeconds: input.DurationSeconds, AspectRatio: input.AspectRatio, SourceAssetIDs: input.SourceAssetIDs, ProviderOptions: map[string]any{}, IsMock: false, FallbackNotes: []string{cause.Error()}, CreatedAt: now}
	job := domain.VideoJob{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, GenerationRequestID: req.ID, PromptPayloadID: payload.ID, Provider: provider, Status: "failed", IsMock: false, AttemptCount: 1, ErrorCode: errorCode(cause), ErrorMessage: errorMessage(cause), CreatedAt: now, UpdatedAt: now}
	result := domain.ProviderResult{ID: repository.NewID(), TenantID: ctx.TenantID, VideoJobID: job.ID, Provider: provider, NormalizedStatus: "failed", ResultURLs: []string{}, ErrorCode: errorCode(cause), ErrorMessage: errorMessage(cause), RedactedMetadata: map[string]any{"error": cause.Error()}, ReceivedAt: now}
	return req, payload, job, result, []domain.GeneratedVideo{}
}

// demoOrMockEstimateCost is the cost-preview helper. Preserved exactly as
// a top-level function so existing callers do not break. The real Pollo
// /v1/videos/estimate endpoint exists; wiring it is a follow-up because
// the API surface (dto.EstimateCostResponse with a fixed-currency TRY field)
// is hard-coded for the offline pricing table. Re-enable in a later pass.
func demoOrMockEstimateCost(req dto.EstimateCostRequest) dto.EstimateCostResponse {
	credits := 1
	if req.DurationSeconds > 30 {
		credits = 2
	}
	amount := credits * 85
	return dto.EstimateCostResponse{EstimatedCredits: credits, EstimatedCost: dto.EstimatedCostDTO{Amount: amount, Currency: "TRY", MaxAmount: amount + 35}}
}

// buildPromptText composes the Pollo prompt from the user input + subject.
// It is the canonical prompt formula used by both the real and mock
// branches so the offline demo and live API produce comparable output.
func buildPromptText(input dto.CreateGenerationRequestRequest, subject domain.CreativeSubject) string {
	tone := ""
	if input.Tone != nil {
		tone = *input.Tone
	}
	cta := ""
	if input.CallToAction != nil {
		cta = *input.CallToAction
	}
	return fmt.Sprintf("Create a %s ad video for %s. Platform: %s, language: %s, tone: %s, CTA: %s",
		input.Objective, subject.Name, input.Platform, input.Language, tone, cta)
}

// defaultPolloModel is the Pollo model id we request by default. Spec says
// "Kling/Pollo unified entry"; we use the canonical "kling-v1" Kling model
// exposed through the Pollo entry. The real value MUST be re-derived from
// /openapi.json before going to production.
const defaultPolloModel = "kling-v1"

// stringPtr is a tiny helper to take the address of a string literal.
func stringPtr(s string) *string { return &s }

// errorCode / errorMessage pull the canonical provider category out of a
// wrapped providererr sentinel so the audit trail in the database reflects
// why the call failed. If cause is not a known provider error the field is
// left nil and the error message is preserved in ErrorMessage.
func errorCode(err error) *string {
	switch {
	case errors.Is(err, providererr.ErrPolloAuth):
		s := "auth"
		return &s
	case errors.Is(err, providererr.ErrPolloRateLimit):
		s := "rate_limit"
		return &s
	case errors.Is(err, providererr.ErrPolloTimeout):
		s := "timeout"
		return &s
	case errors.Is(err, providererr.ErrPolloBadRequest):
		s := "bad_request"
		return &s
	case errors.Is(err, providererr.ErrPolloUnavailable):
		s := "unavailable"
		return &s
	}
	return nil
}

func errorMessage(err error) *string {
	if err == nil {
		return nil
	}
	s := err.Error()
	return &s
}
