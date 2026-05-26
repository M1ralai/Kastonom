package validation

import (
	"testing"

	generationdto "github.com/M1ralai/Kastonom/backend/internal/modules/generation/dto"
	publicationdto "github.com/M1ralai/Kastonom/backend/internal/modules/publication/dto"
)

func TestStructValidatorAcceptsValidGenerationRequest(t *testing.T) {
	req := generationdto.CreateGenerationRequestRequest{
		ProjectID:       "project-1",
		SourceAssetIDs:  []string{"asset-1"},
		Provider:        "mock",
		Objective:       "traffic",
		Platform:        "reels",
		DurationSeconds: 15,
		AspectRatio:     "9:16",
		Language:        "tr",
	}

	if err := NewStructValidator().Validate(&req); err != nil {
		t.Fatalf("expected valid generation request, got %v", err)
	}
}

func TestStructValidatorRejectsInvalidGenerationRequest(t *testing.T) {
	req := generationdto.CreateGenerationRequestRequest{
		SourceAssetIDs:  []string{""},
		Provider:        "unknown-provider",
		Objective:       "traffic",
		Platform:        "reels",
		DurationSeconds: 0,
		AspectRatio:     "9:16",
		Language:        "tr",
	}

	if err := NewStructValidator().Validate(&req); err == nil {
		t.Fatal("expected invalid generation request to fail validation")
	}
}

func TestStructValidatorRequiresPublishConfirmation(t *testing.T) {
	req := publicationdto.CreateAdPublicationRequest{
		ProjectID:        "project-1",
		GeneratedVideoID: "video-1",
		Platform:         "meta_ads",
	}

	if err := NewStructValidator().Validate(&req); err == nil {
		t.Fatal("expected missing publish confirmation to fail validation")
	}
}
