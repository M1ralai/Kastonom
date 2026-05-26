package creative

import (
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
)

type CreativeProjectService interface {
	Create(ctx domain.TenantContext, req CreateCreativeProjectRequest) (CreateCreativeProjectResponse, error)
	List(ctx domain.TenantContext) []domain.CreativeProjectBundle
	GetBundle(ctx domain.TenantContext, projectID string) (*domain.CreativeProjectBundle, bool)
	UploadSourceAsset(ctx domain.TenantContext) SourceAssetUploadResponse
	GetMetrics(ctx domain.TenantContext, projectID string) (ProjectMetricsResponse, bool)
}

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func (s *Service) Create(ctx domain.TenantContext, req CreateCreativeProjectRequest) (CreateCreativeProjectResponse, error) {
	now := time.Now().UTC()
	project := domain.CreativeProject{ID: store.NewID(), TenantID: ctx.TenantID, Name: req.Name, Status: "draft", CreatedAt: now, UpdatedAt: now}
	subject := domain.CreativeSubject{ID: store.NewID(), TenantID: ctx.TenantID, ProjectID: project.ID, SubjectType: req.CreativeSubject.SubjectType, Name: req.CreativeSubject.Name, Description: req.CreativeSubject.Description, LandingURL: req.CreativeSubject.LandingURL, Price: req.CreativeSubject.Price, Currency: req.CreativeSubject.Currency, AllowedClaims: req.CreativeSubject.AllowedClaims, ForbiddenClaims: req.CreativeSubject.ForbiddenClaims, UnknownFields: req.CreativeSubject.UnknownFields, Source: req.CreativeSubject.Source, CreatedAt: now, UpdatedAt: now}
	if subject.SubjectType == "" {
		subject.SubjectType = "product"
	}
	if subject.Source == "" {
		subject.Source = "user_input"
	}
	assets := []domain.SourceAsset{}
	for _, input := range req.SourceAssets {
		projectID := project.ID
		assets = append(assets, domain.SourceAsset{ID: store.NewID(), TenantID: ctx.TenantID, ProjectID: &projectID, AssetType: input.AssetType, Source: input.Source, URL: input.URL, Metadata: input.Metadata, CreatedAt: now})
	}
	bundle := s.repo.CreateBundle(domain.CreativeProjectBundle{CreativeProject: project, CreativeSubject: &subject, SourceAssets: assets})
	return CreateCreativeProjectResponse{CreativeProject: bundle.CreativeProject, CreativeSubject: *bundle.CreativeSubject, SourceAssets: bundle.SourceAssets}, nil
}

func (s *Service) List(ctx domain.TenantContext) []domain.CreativeProjectBundle {
	return s.repo.ListBundles(ctx.TenantID)
}

func (s *Service) GetBundle(ctx domain.TenantContext, projectID string) (*domain.CreativeProjectBundle, bool) {
	return s.repo.GetBundle(ctx.TenantID, projectID)
}

func (s *Service) UploadSourceAsset(ctx domain.TenantContext) SourceAssetUploadResponse {
	now := time.Now().UTC()
	asset := s.repo.SaveUnattachedAsset(domain.SourceAsset{ID: store.NewID(), TenantID: ctx.TenantID, AssetType: "image", Source: "upload", URL: "/uploads/mock-upload.png", Metadata: map[string]any{}, CreatedAt: now})
	return SourceAssetUploadResponse{SourceAsset: asset, UploadURL: asset.URL}
}

func (s *Service) GetMetrics(ctx domain.TenantContext, projectID string) (ProjectMetricsResponse, bool) {
	bundle, ok := s.repo.GetBundle(ctx.TenantID, projectID)
	if !ok || bundle.CreativeSubject == nil {
		return ProjectMetricsResponse{}, false
	}
	margin, stock := 42, 18
	return ProjectMetricsResponse{ProjectID: projectID, CreativeSubject: ProjectMetricsSubjectDTO{ID: bundle.CreativeSubject.ID, Name: bundle.CreativeSubject.Name, Price: bundle.CreativeSubject.Price, Currency: bundle.CreativeSubject.Currency, MarginPercent: &margin, StockCount: &stock, AIScore: 86, AIReasons: []string{"high_margin", "stock_available"}}, ERPData: ERPDataDTO{StockAvailable: &stock}}, true
}
