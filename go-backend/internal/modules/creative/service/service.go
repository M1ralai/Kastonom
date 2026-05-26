package service

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/creative/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/creative/repository"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

type CreativeProjectService interface {
	Create(ctx domain.TenantContext, req dto.CreateCreativeProjectRequest) (dto.CreateCreativeProjectResponse, error)
	List(ctx domain.TenantContext) ([]domain.CreativeProjectBundle, error)
	GetBundle(ctx domain.TenantContext, projectID string) (*domain.CreativeProjectBundle, bool, error)
	UploadSourceAsset(ctx domain.TenantContext) (dto.SourceAssetUploadResponse, error)
	GetMetrics(ctx domain.TenantContext, projectID string) (dto.ProjectMetricsResponse, bool, error)
}

type Service struct {
	repo repository.CreativeProjectRepository
}

func New(repo repository.CreativeProjectRepository) *Service { return &Service{repo: repo} }

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
	asset := demoOrMockUploadedSourceAsset(ctx)
	asset, err := s.repo.SaveUnattachedAsset(asset)
	return dto.SourceAssetUploadResponse{SourceAsset: asset, UploadURL: asset.URL}, err
}

func (s *Service) GetMetrics(ctx domain.TenantContext, projectID string) (dto.ProjectMetricsResponse, bool, error) {
	return s.repo.GetProjectMetrics(ctx.TenantID, projectID)
}
