package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
)

type AuthService interface {
	Register(req RegisterRequest) (RegisterResponse, error)
	Login(req LoginRequest) (LoginResponse, error)
	RefreshToken(req RefreshTokenRequest) (LoginResponse, error)
	Logout(req LogoutRequest) (LogoutResponse, error)
	VerifyToken(token string) (*User, bool)
}

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func hashPassword(password string) string {
	sum := sha256.Sum256([]byte(password))
	return hex.EncodeToString(sum[:])
}

func makeToken(user User) string {
	return "dev-token:" + user.ID + ":" + user.TenantID
}

func (s *Service) Register(req RegisterRequest) (RegisterResponse, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = strings.Split(req.Email, "@")[0]
	}
	tenantName := strings.TrimSpace(req.CompanyName)
	if tenantName == "" {
		tenantName = name
	}
	tenant := s.repo.CreateTenantForRegistration(tenantName)
	now := time.Now().UTC()
	user := User{ID: store.NewID(), TenantID: tenant.ID, Email: strings.ToLower(req.Email), PasswordHash: hashPassword(req.Password), Name: name, Status: "active", CreatedAt: now, UpdatedAt: now}
	user = s.repo.Save(user)
	return RegisterResponse{User: AuthUserDTO{ID: user.ID, Email: user.Email, Name: user.Name, TenantID: user.TenantID}, Token: makeToken(user), Tenant: AuthTenantDTO{ID: tenant.ID, Name: tenant.Name}}, nil
}

func (s *Service) Login(req LoginRequest) (LoginResponse, error) {
	user, ok := s.repo.FindByEmail(req.Email)
	if !ok || user.PasswordHash != hashPassword(req.Password) {
		return LoginResponse{}, errInvalidCredentials
	}
	token := makeToken(*user)
	return LoginResponse{User: AuthUserDTO{ID: user.ID, Email: user.Email, Name: user.Name, TenantID: user.TenantID}, Token: token, AccessToken: token, RefreshToken: "refresh-" + user.ID, ExpiresIn: 86400}, nil
}

func (s *Service) RefreshToken(req RefreshTokenRequest) (LoginResponse, error) {
	return LoginResponse{RefreshToken: req.RefreshToken, ExpiresIn: 86400}, nil
}

func (s *Service) Logout(req LogoutRequest) (LogoutResponse, error) {
	return LogoutResponse{Success: true}, nil
}

func (s *Service) VerifyToken(token string) (*User, bool) {
	parts := strings.Split(token, ":")
	if len(parts) < 2 {
		return nil, false
	}
	return s.repo.FindByID(parts[1])
}

var errInvalidCredentials = fiberlessError("invalid credentials")

type fiberlessError string

func (e fiberlessError) Error() string { return string(e) }
