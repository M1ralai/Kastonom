package repository

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

func demoOrMockTenantCredits(tenantID string, usedThisMonth int) domain.TenantCredits {
	return domain.TenantCredits{
		TenantID:         tenantID,
		CurrentCredits:   120 - usedThisMonth,
		CreditCurrency:   "credits",
		MonthlyAllowance: 120,
		UsedThisMonth:    usedThisMonth,
		VideosPerCredit:  1,
	}
}
