package iteration

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type CreateIterationSuggestionRequest struct {
	ProjectID           string  `json:"project_id"`
	GeneratedVideoID    string  `json:"generated_video_id"`
	AdMetricsSnapshotID *string `json:"ad_metrics_snapshot_id"`
	Reason              string  `json:"reason"`
}
type IterationSuggestionPayloadDTO struct {
	Reason           string   `json:"reason"`
	SuggestedChanges []string `json:"suggested_changes"`
	Confidence       string   `json:"confidence"`
}
type CreateIterationSuggestionResponse struct {
	CreativeIterationSuggestion domain.CreativeIterationSuggestion `json:"creative_iteration_suggestion"`
}
