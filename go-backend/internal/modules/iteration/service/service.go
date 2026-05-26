package service

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/iteration/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/iteration/repository"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

type IterationSuggestionService interface {
	Create(ctx domain.TenantContext, req dto.CreateIterationSuggestionRequest) (dto.CreateIterationSuggestionResponse, error)
}
type Service struct{ repo *repository.Repository }

func New(repo *repository.Repository) *Service { return &Service{repo: repo} }
func (s *Service) Create(ctx domain.TenantContext, req dto.CreateIterationSuggestionRequest) (dto.CreateIterationSuggestionResponse, error) {
	suggestion, err := s.repo.Create(ctx, req)
	return dto.CreateIterationSuggestionResponse{CreativeIterationSuggestion: suggestion}, err
}
