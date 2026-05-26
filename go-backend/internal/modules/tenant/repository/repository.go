package repository

import (
	"database/sql"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/jmoiron/sqlx"
)

type TenantReadRepository interface {
	GetDetails(tenantID string) (domain.Tenant, bool, error)
	GetCredits(tenantID string) (domain.TenantCredits, error)
}

type Repository struct{ db *sqlx.DB }

func New(db *sqlx.DB) *Repository { return &Repository{db: db} }

func (r *Repository) GetDetails(tenantID string) (domain.Tenant, bool, error) {
	var tenant domain.Tenant
	err := r.db.Get(&tenant, `SELECT id, name, mode, status, created_at, updated_at FROM tenants WHERE id = $1`, tenantID)
	if err == sql.ErrNoRows {
		return domain.Tenant{}, false, nil
	}
	return tenant, err == nil, err
}

func (r *Repository) GetCredits(tenantID string) (domain.TenantCredits, error) {
	var used int
	err := r.db.Get(&used, `SELECT COUNT(*) FROM generated_videos WHERE tenant_id = $1 AND created_at >= date_trunc('month', now())`, tenantID)
	if err != nil {
		return domain.TenantCredits{}, err
	}
	return demoOrMockTenantCredits(tenantID, used), nil
}
