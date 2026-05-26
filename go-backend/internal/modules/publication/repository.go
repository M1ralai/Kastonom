package publication

import (
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
)

type Repository struct{ store *store.Store }

func NewRepository(s *store.Store) *Repository { return &Repository{store: s} }
func (r *Repository) CreatePublication(ctx domain.TenantContext, req CreateAdPublicationRequest) (domain.AdPublication, bool) {
	now := time.Now().UTC()
	pub := domain.AdPublication{ID: store.NewID(), TenantID: ctx.TenantID, ProjectID: req.ProjectID, GeneratedVideoID: req.GeneratedVideoID, AdPlatformConnectionID: req.AdPlatformConnectionID, Platform: req.Platform, Status: "published", DestinationURL: req.DestinationURL, PublishedAt: &now, CreatedAt: now, UpdatedAt: now}
	_ = r.store.Write(func() error {
		video, ok := r.store.Videos[req.GeneratedVideoID]
		if !ok || video.TenantID != ctx.TenantID {
			return nil
		}
		r.store.Publications[pub.ID] = pub
		project := r.store.Projects[req.ProjectID]
		project.Status = "published"
		r.store.Projects[project.ID] = project
		video.Status = "published"
		r.store.Videos[video.ID] = video
		return nil
	})
	return pub, true
}
func (r *Repository) CreateMetrics(ctx domain.TenantContext, publicationID string, req SyncMetricsRequest) (domain.AdMetricsSnapshot, bool) {
	var platform string
	_ = r.store.Read(func() error {
		pub, ok := r.store.Publications[publicationID]
		if ok && pub.TenantID == ctx.TenantID {
			platform = pub.Platform
		}
		return nil
	})
	if platform == "" {
		return domain.AdMetricsSnapshot{}, false
	}
	now := time.Now().UTC()
	m := MetricInputDTO{}
	if req.Metrics != nil {
		m = *req.Metrics
	}
	snap := domain.AdMetricsSnapshot{ID: store.NewID(), TenantID: ctx.TenantID, AdPublicationID: publicationID, Platform: platform, DateStart: req.DateStart, DateEnd: req.DateEnd, Impressions: m.Impressions, Clicks: m.Clicks, Spend: m.Spend, Currency: m.Currency, CTR: m.CTR, CPC: m.CPC, Conversions: m.Conversions, ConversionValue: m.ConversionValue, ROAS: m.ROAS, VideoViews: m.VideoViews, VideoViewRate: m.VideoViewRate, CostPerVideoView: m.CostPerVideoView, Source: req.Source, RedactedMetadata: map[string]any{}, FetchedAt: now}
	_ = r.store.Write(func() error { r.store.Metrics[snap.ID] = snap; return nil })
	return snap, true
}
