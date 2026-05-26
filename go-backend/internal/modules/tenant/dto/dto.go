package dto

import "time"

type TenantDetailsResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Mode      string    `json:"mode"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type TenantCreditsResponse struct {
	TenantID         string `json:"tenant_id"`
	CurrentCredits   int    `json:"current_credits"`
	CreditCurrency   string `json:"credit_currency"`
	MonthlyAllowance int    `json:"monthly_allowance"`
	UsedThisMonth    int    `json:"used_this_month"`
	VideosPerCredit  int    `json:"videos_per_credit"`
}
