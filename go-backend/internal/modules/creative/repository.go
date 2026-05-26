package creative

import (
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
)

type CreativeProjectRepository interface {
	CreateBundle(bundle domain.CreativeProjectBundle) domain.CreativeProjectBundle
	ListBundles(tenantID string) []domain.CreativeProjectBundle
	GetBundle(tenantID string, projectID string) (*domain.CreativeProjectBundle, bool)
	SaveUnattachedAsset(asset domain.SourceAsset) domain.SourceAsset
}

type Repository struct {
	store *store.Store
}

func NewRepository(s *store.Store) *Repository { return &Repository{store: s} }

func (r *Repository) CreateBundle(bundle domain.CreativeProjectBundle) domain.CreativeProjectBundle {
	_ = r.store.Write(func() error {
		r.store.Projects[bundle.CreativeProject.ID] = bundle.CreativeProject
		if bundle.CreativeSubject != nil {
			r.store.Subjects[bundle.CreativeSubject.ID] = *bundle.CreativeSubject
		}
		for _, asset := range bundle.SourceAssets {
			r.store.Assets[asset.ID] = asset
		}
		return nil
	})
	return bundle
}

func (r *Repository) ListBundles(tenantID string) []domain.CreativeProjectBundle {
	bundles := []domain.CreativeProjectBundle{}
	_ = r.store.Read(func() error {
		for _, project := range r.store.Projects {
			if project.TenantID != tenantID {
				continue
			}
			bundle := domain.CreativeProjectBundle{CreativeProject: project, SourceAssets: []domain.SourceAsset{}}
			for _, subject := range r.store.Subjects {
				if subject.ProjectID == project.ID && subject.TenantID == tenantID {
					copy := subject
					bundle.CreativeSubject = &copy
				}
			}
			for _, asset := range r.store.Assets {
				if asset.ProjectID != nil && *asset.ProjectID == project.ID && asset.TenantID == tenantID {
					bundle.SourceAssets = append(bundle.SourceAssets, asset)
				}
			}
			bundles = append(bundles, bundle)
		}
		return nil
	})
	return bundles
}

func (r *Repository) GetBundle(tenantID string, projectID string) (*domain.CreativeProjectBundle, bool) {
	var bundle *domain.CreativeProjectBundle
	_ = r.store.Read(func() error {
		project, ok := r.store.Projects[projectID]
		if !ok || project.TenantID != tenantID {
			return nil
		}
		b := domain.CreativeProjectBundle{CreativeProject: project, SourceAssets: []domain.SourceAsset{}, GenerationRequests: []domain.GenerationRequest{}, GeneratedVideos: []domain.GeneratedVideo{}}
		for _, subject := range r.store.Subjects {
			if subject.ProjectID == project.ID && subject.TenantID == tenantID {
				copy := subject
				b.CreativeSubject = &copy
			}
		}
		for _, asset := range r.store.Assets {
			if asset.ProjectID != nil && *asset.ProjectID == project.ID && asset.TenantID == tenantID {
				b.SourceAssets = append(b.SourceAssets, asset)
			}
		}
		for _, req := range r.store.Requests {
			if req.ProjectID == project.ID && req.TenantID == tenantID {
				b.GenerationRequests = append(b.GenerationRequests, req)
			}
		}
		for _, video := range r.store.Videos {
			if video.ProjectID == project.ID && video.TenantID == tenantID {
				b.GeneratedVideos = append(b.GeneratedVideos, video)
			}
		}
		bundle = &b
		return nil
	})
	return bundle, bundle != nil
}

func (r *Repository) SaveUnattachedAsset(asset domain.SourceAsset) domain.SourceAsset {
	_ = r.store.Write(func() error {
		r.store.Assets[asset.ID] = asset
		return nil
	})
	return asset
}
