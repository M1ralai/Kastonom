package dashboard

type KpiSummaryResponse struct {
	MonthlyVideoCount  int     `json:"monthly_video_count"`
	MonthlyVideoChange int     `json:"monthly_video_change"`
	RemainingCredits   int     `json:"remaining_credits"`
	CreditCurrency     string  `json:"credit_currency"`
	AverageCTR         float64 `json:"average_ctr"`
	SectorAverageCTR   float64 `json:"sector_average_ctr"`
	CTRChangePercent   int     `json:"ctr_change_percent"`
}
type RecentActivitiesResponse struct {
	Activities []RecentActivityDTO `json:"activities"`
}
type RecentActivityDTO struct {
	ID             string                     `json:"id"`
	ProjectID      string                     `json:"project_id"`
	ProjectName    string                     `json:"project_name"`
	Status         string                     `json:"status"`
	Icon           string                     `json:"icon"`
	GeneratedVideo *ActivityGeneratedVideoDTO `json:"generated_video"`
	UpdatedAt      string                     `json:"updated_at"`
}
type ActivityGeneratedVideoDTO struct {
	Impressions int64   `json:"impressions"`
	CTR         float64 `json:"ctr"`
}
