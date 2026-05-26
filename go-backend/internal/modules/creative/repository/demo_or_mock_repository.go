package repository

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/creative/dto"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

func demoOrMockProjectMetrics(projectID string, subject domain.CreativeSubject) dto.ProjectMetricsResponse {
	margin, stock := 42, 18
	return dto.ProjectMetricsResponse{
		ProjectID: projectID,
		CreativeSubject: dto.ProjectMetricsSubjectDTO{
			ID:            subject.ID,
			Name:          subject.Name,
			Price:         subject.Price,
			Currency:      subject.Currency,
			MarginPercent: &margin,
			StockCount:    &stock,
			AIScore:       86,
			AIReasons:     []string{"high_margin", "stock_available"},
		},
		ERPData: dto.ERPDataDTO{StockAvailable: &stock},
	}
}
