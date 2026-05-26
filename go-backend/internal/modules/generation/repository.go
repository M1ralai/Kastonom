package generation

import (
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
)

type GenerationRequestRepository interface {
	Create(req domain.GenerationRequest) domain.GenerationRequest
}

type Repository struct{ store *store.Store }

func NewRepository(s *store.Store) *Repository { return &Repository{store: s} }

func (r *Repository) Create(req domain.GenerationRequest, payload domain.PromptPayload, job domain.VideoJob, result domain.ProviderResult, videos []domain.GeneratedVideo) {
	_ = r.store.Write(func() error {
		r.store.Requests[req.ID] = req
		r.store.Prompts[payload.ID] = payload
		r.store.Jobs[job.ID] = job
		r.store.Results[result.ID] = result
		for _, video := range videos {
			r.store.Videos[video.ID] = video
		}
		project := r.store.Projects[req.ProjectID]
		project.Status = "ready"
		project.LatestGenerationRequestID = &req.ID
		r.store.Projects[project.ID] = project
		return nil
	})
}

func (r *Repository) ProjectInput(tenantID, projectID string) (domain.CreativeProject, *domain.CreativeSubject, bool) {
	var project domain.CreativeProject
	var subject *domain.CreativeSubject
	var ok bool
	_ = r.store.Read(func() error {
		project, ok = r.store.Projects[projectID]
		if !ok || project.TenantID != tenantID {
			ok = false
			return nil
		}
		for _, s := range r.store.Subjects {
			if s.ProjectID == projectID && s.TenantID == tenantID {
				copy := s
				subject = &copy
			}
		}
		return nil
	})
	return project, subject, ok && subject != nil
}
