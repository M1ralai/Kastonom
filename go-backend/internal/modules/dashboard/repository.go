package dashboard

import (
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
)

type DashboardReadRepository interface {
	GetKpiSummary(tenantID string) KpiSummaryResponse
	GetRecentActivities(tenantID string, limit int) RecentActivitiesResponse
}
type Repository struct{ store *store.Store }

func NewRepository(s *store.Store) *Repository { return &Repository{store: s} }
func (r *Repository) GetKpiSummary(tenantID string) KpiSummaryResponse {
	count := 0
	remaining := 0
	currency := "credits"
	_ = r.store.Read(func() error {
		for _, v := range r.store.Videos {
			if v.TenantID == tenantID {
				count++
			}
		}
		c := r.store.Credits[tenantID]
		remaining = c.CurrentCredits
		if c.CreditCurrency != "" {
			currency = c.CreditCurrency
		}
		return nil
	})
	return KpiSummaryResponse{MonthlyVideoCount: count, MonthlyVideoChange: count, RemainingCredits: remaining, CreditCurrency: currency, AverageCTR: 2.8, SectorAverageCTR: 2.1, CTRChangePercent: 8}
}
func (r *Repository) GetRecentActivities(tenantID string, limit int) RecentActivitiesResponse {
	if limit <= 0 {
		limit = 10
	}
	res := RecentActivitiesResponse{Activities: []RecentActivityDTO{}}
	_ = r.store.Read(func() error {
		for _, p := range r.store.Projects {
			if p.TenantID == tenantID && len(res.Activities) < limit {
				res.Activities = append(res.Activities, RecentActivityDTO{ID: p.ID, ProjectID: p.ID, ProjectName: p.Name, Status: p.Status, Icon: "video", UpdatedAt: p.UpdatedAt.Format(time.RFC3339)})
			}
		}
		return nil
	})
	return res
}
