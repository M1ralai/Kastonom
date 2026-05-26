package tenant

import (
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
)

type TenantReadRepository interface {
	GetDetails(tenantID string) (domain.Tenant, bool)
	GetCredits(tenantID string) domain.TenantCredits
}

type Repository struct{ store *store.Store }

func NewRepository(s *store.Store) *Repository { return &Repository{store: s} }

func (r *Repository) GetDetails(tenantID string) (domain.Tenant, bool) {
	var tenant domain.Tenant
	var ok bool
	_ = r.store.Read(func() error { tenant, ok = r.store.Tenants[tenantID]; return nil })
	return tenant, ok
}

func (r *Repository) GetCredits(tenantID string) domain.TenantCredits {
	var credits domain.TenantCredits
	_ = r.store.Read(func() error { credits = r.store.Credits[tenantID]; return nil })
	if credits.TenantID == "" {
		credits = domain.TenantCredits{TenantID: tenantID, CurrentCredits: 0, CreditCurrency: "credits", MonthlyAllowance: 0, UsedThisMonth: 0, VideosPerCredit: 1}
	}
	return credits
}
