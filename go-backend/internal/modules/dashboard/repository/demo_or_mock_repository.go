package repository

import "github.com/M1ralai/Kastonom/backend/internal/modules/dashboard/dto"

// demoOrMockKpiSummary returns the offline mock response used when the
// server is running in KASTONOM_MODE=mock or when the Pollo client is
// not configured (no POLLO_API_KEY). The signature is intentionally
// preserved exactly as the original mock helper — every caller in
// repository.go compiles against it. Real calls live in
// fetchRealKpiSummary below and use the same dto.KpiSummaryResponse
// shape so callers cannot tell the difference.
func demoOrMockKpiSummary(monthlyVideoCount int) dto.KpiSummaryResponse {
	return dto.KpiSummaryResponse{
		MonthlyVideoCount:  monthlyVideoCount,
		MonthlyVideoChange: monthlyVideoCount,
		RemainingCredits:   120 - monthlyVideoCount,
		CreditCurrency:     "credits",
		AverageCTR:         2.8,
		SectorAverageCTR:   2.1,
		CTRChangePercent:   8,
	}
}
