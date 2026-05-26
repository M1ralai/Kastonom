package dto

type RegisterRequest struct {
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required,min=8"`
	Name        string `json:"name" validate:"required"`
	CompanyName string `json:"company_name" validate:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type LogoutRequest struct {
	UserID string `json:"user_id" validate:"required"`
}

type AuthUserDTO struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	TenantID string `json:"tenant_id"`
}

type AuthTenantDTO struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type RegisterResponse struct {
	User   AuthUserDTO   `json:"user"`
	Token  string        `json:"token"`
	Tenant AuthTenantDTO `json:"tenant"`
}

type LoginResponse struct {
	User         AuthUserDTO `json:"user"`
	Token        string      `json:"token"`
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	ExpiresIn    int         `json:"expires_in"`
}

type LogoutResponse struct {
	Success bool `json:"success"`
}
