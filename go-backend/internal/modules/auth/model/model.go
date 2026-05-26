package model

import (
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

type User = domain.User

type RefreshToken struct {
	ID        string
	UserID    string
	TokenHash string
	Family    string
	ExpiresAt time.Time
	RevokedAt *time.Time
	IPAddress *string
	UserAgent *string
	CreatedAt time.Time
}

type AuditLog struct {
	ID        string
	TenantID  *string
	UserID    *string
	Action    string
	Entity    string
	EntityID  *string
	RequestID *string
	CreatedAt time.Time
}
