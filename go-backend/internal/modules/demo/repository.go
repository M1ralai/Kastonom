package demo

import (
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
)

type DemoReplayRepository interface {
	GetReplay(tenantID string) DemoFallbackResponse
}
type Repository struct{ store *store.Store }

func NewRepository(s *store.Store) *Repository { return &Repository{store: s} }
func (r *Repository) GetReplay(tenantID string) DemoFallbackResponse {
	res := DemoFallbackResponse{SourceAssets: []domain.SourceAsset{}, GeneratedVideos: []domain.GeneratedVideo{}, FallbackReason: "demo replay"}
	_ = r.store.Read(func() error {
		for _, p := range r.store.Projects {
			if p.TenantID == tenantID && res.CreativeProject == nil {
				copy := p
				res.CreativeProject = &copy
			}
		}
		if res.CreativeProject != nil {
			for _, s := range r.store.Subjects {
				if s.ProjectID == res.CreativeProject.ID {
					copy := s
					res.CreativeSubject = &copy
				}
			}
			for _, a := range r.store.Assets {
				if a.ProjectID != nil && *a.ProjectID == res.CreativeProject.ID {
					res.SourceAssets = append(res.SourceAssets, a)
				}
			}
			for _, g := range r.store.Requests {
				if g.ProjectID == res.CreativeProject.ID {
					copy := g
					res.GenerationRequest = &copy
				}
			}
			for _, v := range r.store.Videos {
				if v.ProjectID == res.CreativeProject.ID {
					copy := v
					res.GeneratedVideos = append(res.GeneratedVideos, v)
					if v.IsSelected {
						res.SelectedGeneratedVideo = &copy
					}
				}
			}
		}
		return nil
	})
	return res
}
