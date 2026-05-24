package model

import (
	"time"

	"github.com/google/uuid"
)

type Tenant struct {
	ID   uuid.UUID
	Name string

	Credit int

	Email    string
	Password string

	CreatedAt time.Time
	UpdatedAt time.Time
}
