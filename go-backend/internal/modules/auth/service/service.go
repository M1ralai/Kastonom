// Package service implements the auth use-cases.
//
// ============================================================================
// OUT OF SCOPE FOR POLLO MIGRATION
// ============================================================================
// This module is intentionally NOT wired to Pollo AI. Auth has nothing to do
// with the video/ad generation provider: no Pollo endpoint issues, rotates,
// or validates Kastonom user credentials, and exposing POLLO_API_KEY through
// this surface would be a security regression.
//
// Current state is a development stub (sha256 hashing, "dev-token:" bearer
// strings, opaque refresh tokens). It is kept compiling and interface-stable
// so the rest of the backend can run end-to-end while a SEPARATE migration
// track replaces it with:
//   - bcrypt or argon2id password hashing (golang.org/x/crypto/bcrypt or
//     github.com/alexedwards/argon2id) for hashPassword.
//   - Real JWT access + refresh tokens (github.com/golang-jwt/jwt/v5) with a
//     server-side signing key, exp/iat claims, kid rotation, and a refresh-
//     token family table in the DB for revocation.
//   - Constant-time bearer parsing in VerifyToken via internal/shared/httpx
//     BearerToken and a JWT signature check (no "dev-token:" string split).
//   - RefreshToken row lookups (model.RefreshToken) with rotation + reuse
//     detection; Logout revokes the family in the DB.
//   - Audit log rows (model.AuditLog) on login/refresh/logout.
//
// Do NOT call this from any code path that handles POLLO_API_KEY or
// POLLO_WEBHOOK_SECRET. Do NOT log tokens.
// ============================================================================

package service

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/M1ralai/Kastonom/backend/internal/modules/auth/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/auth/model"
	"github.com/M1ralai/Kastonom/backend/internal/modules/auth/repository"
	"github.com/M1ralai/Kastonom/backend/internal/shared/logging"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

// AuthService is the contract the auth handler depends on. It MUST stay
// stable while the real-auth migration is planned; the implementation is
// currently a development stub (see file header).
type AuthService interface {
	Register(req dto.RegisterRequest) (dto.RegisterResponse, error)
	Login(req dto.LoginRequest) (dto.LoginResponse, error)
	RefreshToken(req dto.RefreshTokenRequest) (dto.LoginResponse, error)
	Logout(req dto.LogoutRequest) (dto.LogoutResponse, error)
	VerifyToken(token string) (*model.User, bool)
}

type Service struct {
	repo *repository.Repository
}

func New(repo *repository.Repository) *Service {
	// Surface a startup warning that the dev stub is active. See file header
	// for the real-auth migration plan. Key: never log POLLO_API_KEY or any
	// bearer token.
	devTokenWarn()
	return &Service{repo: repo}
}

// hashPassword is a DEVELOPMENT STUB. It is NOT cryptographically safe for
// production: SHA-256 is fast and unsalted. Replace with bcrypt or argon2id
// in the real-auth migration (see file header). Signature MUST stay
// (string) -> string to keep callers compiling.
func hashPassword(password string) string {
	sum := sha256.Sum256([]byte(password))
	return hex.EncodeToString(sum[:])
}

// makeToken is a DEVELOPMENT STUB. The "dev-token:" prefix is recognizable
// and must never reach a production environment. Replace with a real signed
// JWT (e.g. golang-jwt/jwt/v5) in the real-auth migration. Signature MUST
// stay (model.User) -> string to keep callers compiling.
func makeToken(user model.User) string {
	return "dev-token:" + user.ID + ":" + user.TenantID
}

// devTokenWarn logs a one-shot warning at startup so operators notice the
// stub is active. Never logs the token value itself or POLLO_API_KEY.
func devTokenWarn() {
	logging.L().Warn("auth: using development stub (sha256 + dev-token:). NOT safe for production. See internal/modules/auth/service/service.go file header for the real-auth migration TODO.",
		zap.String("module", "auth"),
		zap.String("replacement", "bcrypt/argon2id + golang-jwt/jwt/v5"),
	)
}

func (s *Service) Register(req dto.RegisterRequest) (dto.RegisterResponse, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = strings.Split(req.Email, "@")[0]
	}
	tenantName := strings.TrimSpace(req.CompanyName)
	if tenantName == "" {
		tenantName = name
	}
	tenant, err := s.repo.CreateTenantForRegistration(tenantName)
	if err != nil {
		return dto.RegisterResponse{}, fmt.Errorf("auth.Register: create tenant: %w", err)
	}
	user := model.User{ID: uuid.NewString(), TenantID: tenant.ID, Email: strings.ToLower(req.Email), PasswordHash: hashPassword(req.Password), Name: name, Status: "active"}
	user, err = s.repo.Save(user)
	if err != nil {
		return dto.RegisterResponse{}, fmt.Errorf("auth.Register: save user: %w", err)
	}
	return dto.RegisterResponse{User: dto.AuthUserDTO{ID: user.ID, Email: user.Email, Name: user.Name, TenantID: user.TenantID}, Token: makeToken(user), Tenant: dto.AuthTenantDTO{ID: tenant.ID, Name: tenant.Name}}, nil
}

func (s *Service) Login(req dto.LoginRequest) (dto.LoginResponse, error) {
	user, ok, err := s.repo.FindByEmail(req.Email)
	if err != nil {
		return dto.LoginResponse{}, fmt.Errorf("auth.Login: lookup user: %w", err)
	}
	if !ok || user.PasswordHash != hashPassword(req.Password) {
		return dto.LoginResponse{}, ErrInvalidCredentials
	}
	token := makeToken(*user)
	return dto.LoginResponse{User: dto.AuthUserDTO{ID: user.ID, Email: user.Email, Name: user.Name, TenantID: user.TenantID}, Token: token, AccessToken: token, RefreshToken: "refresh-" + user.ID, ExpiresIn: 86400}, nil
}

func (s *Service) RefreshToken(req dto.RefreshTokenRequest) (dto.LoginResponse, error) {
	return dto.LoginResponse{RefreshToken: req.RefreshToken, ExpiresIn: 86400}, nil
}

func (s *Service) Logout(req dto.LogoutRequest) (dto.LogoutResponse, error) {
	return dto.LogoutResponse{Success: true}, nil
}

func (s *Service) VerifyToken(token string) (*model.User, bool) {
	parts := strings.Split(token, ":")
	if len(parts) < 2 {
		return nil, false
	}
	user, ok, err := s.repo.FindByID(parts[1])
	if err != nil {
		return nil, false
	}
	return user, ok
}
