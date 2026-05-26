package repository

import "github.com/M1ralai/Kastonom/backend/internal/modules/dashboard/dto"

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
