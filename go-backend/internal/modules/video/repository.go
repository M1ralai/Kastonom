package video

import (
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
)

type VideoJobReadRepository interface {
	GetJobView(tenantID, id string) (VideoJobResponse, bool)
	GetFullView(tenantID, id string) (FullVideoJobResponse, bool)
}

type Repository struct{ store *store.Store }

func NewRepository(s *store.Store) *Repository { return &Repository{store: s} }

func (r *Repository) GetJobView(tenantID, id string) (VideoJobResponse, bool) {
	var res VideoJobResponse
	var ok bool
	_ = r.store.Read(func() error {
		job, found := r.store.Jobs[id]
		if !found || job.TenantID != tenantID {
			return nil
		}
		res.VideoJob, ok = job, true
		for _, result := range r.store.Results {
			if result.VideoJobID == id {
				copy := result
				res.ProviderResult = &copy
			}
		}
		for _, video := range r.store.Videos {
			if video.VideoJobID == id && video.TenantID == tenantID {
				res.GeneratedVideos = append(res.GeneratedVideos, video)
			}
		}
		res.FallbackReason = job.FallbackReason
		return nil
	})
	return res, ok
}

func (r *Repository) GetFullView(tenantID, id string) (FullVideoJobResponse, bool) {
	jobView, ok := r.GetJobView(tenantID, id)
	if !ok {
		return FullVideoJobResponse{}, false
	}
	var res FullVideoJobResponse
	res.VideoJob = FullVideoJobDTO{ID: jobView.VideoJob.ID, Status: jobView.VideoJob.Status, Provider: jobView.VideoJob.Provider, IsMock: jobView.VideoJob.IsMock, FallbackReason: jobView.VideoJob.FallbackReason, CreatedAt: jobView.VideoJob.CreatedAt.Format(time.RFC3339)}
	for _, v := range jobView.GeneratedVideos {
		res.GeneratedVideos = append(res.GeneratedVideos, GeneratedVideoPreviewDTO{ID: v.ID, URL: v.URL, ThumbnailURL: v.ThumbnailURL, DurationSeconds: v.DurationSeconds, AspectRatio: v.AspectRatio, Status: v.Status, IsSelected: v.IsSelected})
	}
	_ = r.store.Read(func() error {
		project := r.store.Projects[jobView.VideoJob.ProjectID]
		res.Project = ProjectSummaryDTO{ID: project.ID, Name: project.Name}
		for _, subject := range r.store.Subjects {
			if subject.ProjectID == project.ID {
				res.CreativeSubject = &CreativeSubjectPreviewDTO{ID: subject.ID, Name: subject.Name}
			}
		}
		req := r.store.Requests[jobView.VideoJob.GenerationRequestID]
		res.GenerationRequest = &GenerationRequestPreviewDTO{Platform: req.Platform, Tone: req.Tone, Style: req.Style, CallToAction: req.CallToAction}
		return nil
	})
	return res, true
}

func (r *Repository) SelectOne(tenantID, projectID, videoID string) (SelectGeneratedVideoResponse, bool) {
	var res SelectGeneratedVideoResponse
	var ok bool
	now := time.Now().UTC()
	_ = r.store.Write(func() error {
		video, found := r.store.Videos[videoID]
		project, projectFound := r.store.Projects[projectID]
		if !found || !projectFound || video.TenantID != tenantID || video.ProjectID != projectID {
			return nil
		}
		for id, v := range r.store.Videos {
			if v.ProjectID == projectID && v.TenantID == tenantID {
				v.IsSelected = false
				if v.Status == "selected" {
					v.Status = "generated"
				}
				r.store.Videos[id] = v
			}
		}
		video.IsSelected, video.Status, video.SelectedAt = true, "selected", &now
		r.store.Videos[videoID] = video
		project.SelectedGeneratedVideoID = &videoID
		project.Status = "ready"
		r.store.Projects[projectID] = project
		res, ok = SelectGeneratedVideoResponse{CreativeProject: project, GeneratedVideo: video}, true
		return nil
	})
	return res, ok
}
