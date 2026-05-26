package auth

import (
	"strings"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
)

type AuthUserStore interface {
	FindByEmail(email string) (*User, bool)
	FindByID(id string) (*User, bool)
	Save(user User) User
}

type AuthTenantProvisioner interface {
	CreateTenantForRegistration(name string) domain.Tenant
}

type Repository struct {
	store *store.Store
}

func NewRepository(s *store.Store) *Repository {
	return &Repository{store: s}
}

func (r *Repository) FindByEmail(email string) (*User, bool) {
	var user User
	var ok bool
	_ = r.store.Read(func() error {
		id, found := r.store.UsersByMail[strings.ToLower(email)]
		if found {
			user, ok = r.store.Users[id], true
		}
		return nil
	})
	return &user, ok
}

func (r *Repository) FindByID(id string) (*User, bool) {
	var user User
	var ok bool
	_ = r.store.Read(func() error {
		user, ok = r.store.Users[id]
		return nil
	})
	return &user, ok
}

func (r *Repository) Save(user User) User {
	_ = r.store.Write(func() error {
		r.store.Users[user.ID] = user
		r.store.UsersByMail[strings.ToLower(user.Email)] = user.ID
		return nil
	})
	return user
}

func (r *Repository) CreateTenantForRegistration(name string) domain.Tenant {
	now := time.Now().UTC()
	tenant := domain.Tenant{ID: store.NewID(), Name: name, Mode: "live", Status: "active", CreatedAt: now, UpdatedAt: now}
	_ = r.store.Write(func() error {
		r.store.Tenants[tenant.ID] = tenant
		r.store.Credits[tenant.ID] = domain.TenantCredits{TenantID: tenant.ID, CurrentCredits: 100, CreditCurrency: "credits", MonthlyAllowance: 100, UsedThisMonth: 0, VideosPerCredit: 1}
		return nil
	})
	return tenant
}
