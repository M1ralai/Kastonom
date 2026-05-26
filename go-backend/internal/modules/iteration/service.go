package iteration

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type IterationSuggestionService interface {
	Create(ctx domain.TenantContext, req CreateIterationSuggestionRequest) CreateIterationSuggestionResponse
}
type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }
func (s *Service) Create(ctx domain.TenantContext, req CreateIterationSuggestionRequest) CreateIterationSuggestionResponse {
	return CreateIterationSuggestionResponse{CreativeIterationSuggestion: s.repo.Create(ctx, req)}
}
