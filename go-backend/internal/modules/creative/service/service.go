package service

import (
	"errors"

	"github.com/M1ralai/Kastonom/backend/internal/modules/creative/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/creative/repository"
	"github.com/M1ralai/Kastonom/backend/internal/provider/pollo"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/providererr"
)

type CreativeProjectService interface {
	Create(ctx domain.TenantContext, req dto.CreateCreativeProjectRequest) (dto.CreateCreativeProjectResponse, error)
	List(ctx domain.TenantContext) ([]domain.CreativeProjectBundle, error)
	GetBundle(ctx domain.TenantContext, projectID string) (*domain.CreativeProjectBundle, bool, error)
	UploadSourceAsset(ctx domain.TenantContext) (dto.SourceAssetUploadResponse, error)
	GetMetrics(ctx domain.TenantContext, projectID string) (dto.ProjectMetricsResponse, bool, error)
}

type Service struct {
	repo  repository.CreativeProjectRepository
	cfg   domain.AppConfig
	pollo *pollo.Client
}

func New(repo repository.CreativeProjectRepository) *Service { return &Service{repo: repo} }

// NewWithPollo constructs a Service that, when cfg.Mode != "mock" and a
// Pollo client is configured, routes UploadSourceAsset through the real
// provider. Passing a nil *pollo.Client keeps the original mock behaviour.
func NewWithPollo(repo repository.CreativeProjectRepository, cfg domain.AppConfig, p *pollo.Client) *Service {
	return &Service{repo: repo, cfg: cfg, pollo: p}
}

func (s *Service) Create(ctx domain.TenantContext, req dto.CreateCreativeProjectRequest) (dto.CreateCreativeProjectResponse, error) {
	project := domain.CreativeProject{ID: repository.NewID(), TenantID: ctx.TenantID, Name: req.Name, Status: "draft"}
	subject := domain.CreativeSubject{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, SubjectType: req.CreativeSubject.SubjectType, Name: req.CreativeSubject.Name, Description: req.CreativeSubject.Description, LandingURL: req.CreativeSubject.LandingURL, Price: req.CreativeSubject.Price, Currency: req.CreativeSubject.Currency, AllowedClaims: req.CreativeSubject.AllowedClaims, ForbiddenClaims: req.CreativeSubject.ForbiddenClaims, UnknownFields: req.CreativeSubject.UnknownFields, Source: req.CreativeSubject.Source}
	if subject.SubjectType == "" {
		subject.SubjectType = "product"
	}
	if subject.Source == "" {
		subject.Source = "user_input"
	}
	assets := []domain.SourceAsset{}
	for _, input := range req.SourceAssets {
		projectID := project.ID
		assetType, source := input.AssetType, input.Source
		if assetType == "" {
			assetType = "image"
		}
		if source == "" {
			source = "external_url"
		}
		assets = append(assets, domain.SourceAsset{ID: repository.NewID(), TenantID: ctx.TenantID, ProjectID: &projectID, AssetType: assetType, Source: source, URL: input.URL, Metadata: input.Metadata})
	}
	bundle, err := s.repo.CreateBundle(project, subject, assets)
	if err != nil {
		return dto.CreateCreativeProjectResponse{}, err
	}
	return dto.CreateCreativeProjectResponse{CreativeProject: bundle.CreativeProject, CreativeSubject: *bundle.CreativeSubject, SourceAssets: bundle.SourceAssets}, nil
}

func (s *Service) List(ctx domain.TenantContext) ([]domain.CreativeProjectBundle, error) {
	return s.repo.ListBundles(ctx.TenantID)
}

func (s *Service) GetBundle(ctx domain.TenantContext, projectID string) (*domain.CreativeProjectBundle, bool, error) {
	return s.repo.GetBundle(ctx.TenantID, projectID)
}

func (s *Service) UploadSourceAsset(ctx domain.TenantContext) (dto.SourceAssetUploadResponse, error) {
	var (
		asset domain.SourceAsset
		err   error
	)

	// When KASTONOM_MODE=mock or the Pollo client is not configured, take
	// the original mock path. This preserves the existing offline-fallback
	// contract that DemoReplayService depends on.
	mockMode := s.cfg.Mode == "mock" || s.pollo == nil || !s.pollo.Enabled()

	if mockMode {
		asset = demoOrMockUploadedSourceAsset(ctx)
	} else {
		asset, err = s.uploadViaPollo(ctx, s.pollo)
		if err != nil && s.cfg.FallbackEnabled && shouldFallBackToMock(err, true) {
			// Provider unreachable / rate-limited / timed-out and the
			// operator has the fallback flag on. Log and degrade.
			asset = demoOrMockUploadedSourceAsset(ctx)
			err = nil
		}
	}

	if err != nil {
		// Real provider failure that we should not mask with the mock.
		// Translate to a domain-style error; the handler renders it.
		if errors.Is(err, providererr.ErrPolloAuth) {
			return dto.SourceAssetUploadResponse{}, errors.New("source asset upload failed: provider auth")
		}
		if errors.Is(err, providererr.ErrPolloBadRequest) {
			return dto.SourceAssetUploadResponse{}, errors.New("source asset upload failed: bad request to provider")
		}
		return dto.SourceAssetUploadResponse{}, err
	}

	asset, dbErr := s.repo.SaveUnattachedAsset(asset)
	return dto.SourceAssetUploadResponse{SourceAsset: asset, UploadURL: asset.URL}, dbErr
}

func (s *Service) GetMetrics(ctx domain.TenantContext, projectID string) (dto.ProjectMetricsResponse, bool, error) {
	return s.repo.GetProjectMetrics(ctx.TenantID, projectID)
}
