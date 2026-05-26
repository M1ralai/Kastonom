package repository

import (
	"database/sql"
	"strings"

	"github.com/M1ralai/Kastonom/backend/internal/modules/auth/model"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func New(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindByEmail(email string) (*model.User, bool, error) {
	var user model.User
	err := r.db.Get(&user, `
		SELECT id, tenant_id, email, password_hash, COALESCE(name, '') AS name, status, created_at, updated_at
		FROM users
		WHERE lower(email) = lower($1)
	`, strings.TrimSpace(email))
	if err == sql.ErrNoRows {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return &user, true, nil
}

func (r *Repository) FindByID(id string) (*model.User, bool, error) {
	var user model.User
	err := r.db.Get(&user, `
		SELECT id, tenant_id, email, password_hash, COALESCE(name, '') AS name, status, created_at, updated_at
		FROM users
		WHERE id = $1
	`, id)
	if err == sql.ErrNoRows {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return &user, true, nil
}

func (r *Repository) CreateTenantForRegistration(name string) (domain.Tenant, error) {
	tenant := domain.Tenant{ID: uuid.NewString(), Name: name, Mode: "live", Status: "active"}
	err := r.db.QueryRowx(`
		INSERT INTO tenants (id, name, mode, status)
		VALUES ($1, $2, $3, $4)
		RETURNING created_at, updated_at
	`, tenant.ID, tenant.Name, tenant.Mode, tenant.Status).Scan(&tenant.CreatedAt, &tenant.UpdatedAt)
	return tenant, err
}

func (r *Repository) Save(user model.User) (model.User, error) {
	err := r.db.QueryRowx(`
		INSERT INTO users (id, tenant_id, email, password_hash, name, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at, updated_at
	`, user.ID, user.TenantID, user.Email, user.PasswordHash, user.Name, user.Status).Scan(&user.CreatedAt, &user.UpdatedAt)
	return user, err
}
