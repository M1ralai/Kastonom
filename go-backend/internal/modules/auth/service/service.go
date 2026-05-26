package service

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"

	"github.com/M1ralai/Kastonom/backend/internal/modules/auth/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/auth/model"
	"github.com/M1ralai/Kastonom/backend/internal/modules/auth/repository"
	"github.com/google/uuid"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

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
	return &Service{repo: repo}
}

func hashPassword(password string) string {
	sum := sha256.Sum256([]byte(password))
	return hex.EncodeToString(sum[:])
}

func makeToken(user model.User) string {
	return "dev-token:" + user.ID + ":" + user.TenantID
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
		return dto.RegisterResponse{}, err
	}
	user := model.User{ID: uuid.NewString(), TenantID: tenant.ID, Email: strings.ToLower(req.Email), PasswordHash: hashPassword(req.Password), Name: name, Status: "active"}
	user, err = s.repo.Save(user)
	if err != nil {
		return dto.RegisterResponse{}, err
	}
	return dto.RegisterResponse{User: dto.AuthUserDTO{ID: user.ID, Email: user.Email, Name: user.Name, TenantID: user.TenantID}, Token: makeToken(user), Tenant: dto.AuthTenantDTO{ID: tenant.ID, Name: tenant.Name}}, nil
}

func (s *Service) Login(req dto.LoginRequest) (dto.LoginResponse, error) {
	user, ok, err := s.repo.FindByEmail(req.Email)
	if err != nil {
		return dto.LoginResponse{}, err
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
