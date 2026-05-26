package dto

type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	Name        string `json:"name"`
	CompanyName string `json:"company_name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type LogoutRequest struct {
	UserID string `json:"user_id"`
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
