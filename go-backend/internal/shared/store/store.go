package store

import (
	"sync"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/google/uuid"
)

type Store struct {
	mu           sync.RWMutex
	Tenants      map[string]domain.Tenant
	Credits      map[string]domain.TenantCredits
	Users        map[string]domain.User
	UsersByMail  map[string]string
	Projects     map[string]domain.CreativeProject
	Subjects     map[string]domain.CreativeSubject
	Assets       map[string]domain.SourceAsset
	Requests     map[string]domain.GenerationRequest
	Prompts      map[string]domain.PromptPayload
	Jobs         map[string]domain.VideoJob
	Results      map[string]domain.ProviderResult
	Videos       map[string]domain.GeneratedVideo
	Publications map[string]domain.AdPublication
	Metrics      map[string]domain.AdMetricsSnapshot
	Suggestions  map[string]domain.CreativeIterationSuggestion
}

func New() *Store {
	now := time.Now().UTC()
	s := &Store{
		Tenants:      map[string]domain.Tenant{},
		Credits:      map[string]domain.TenantCredits{},
		Users:        map[string]domain.User{},
		UsersByMail:  map[string]string{},
		Projects:     map[string]domain.CreativeProject{},
		Subjects:     map[string]domain.CreativeSubject{},
		Assets:       map[string]domain.SourceAsset{},
		Requests:     map[string]domain.GenerationRequest{},
		Prompts:      map[string]domain.PromptPayload{},
		Jobs:         map[string]domain.VideoJob{},
		Results:      map[string]domain.ProviderResult{},
		Videos:       map[string]domain.GeneratedVideo{},
		Publications: map[string]domain.AdPublication{},
		Metrics:      map[string]domain.AdMetricsSnapshot{},
		Suggestions:  map[string]domain.CreativeIterationSuggestion{},
	}
	s.Tenants["demo-tenant"] = domain.Tenant{ID: "demo-tenant", Name: "Kastonom Demo", Mode: "demo", Status: "active", CreatedAt: now, UpdatedAt: now}
	s.Credits["demo-tenant"] = domain.TenantCredits{TenantID: "demo-tenant", CurrentCredits: 120, CreditCurrency: "credits", MonthlyAllowance: 150, UsedThisMonth: 30, VideosPerCredit: 1}
	return s
}

func NewID() string {
	return uuid.NewString()
}

func (s *Store) Read(fn func() error) error {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return fn()
}

func (s *Store) Write(fn func() error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return fn()
}
