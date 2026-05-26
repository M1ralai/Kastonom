package validation

import (
	"reflect"

	"github.com/go-playground/validator/v10"
)

type StructValidator struct {
	validate *validator.Validate
}

func NewStructValidator() *StructValidator {
	validate := validator.New(validator.WithRequiredStructEnabled())
	validate.RegisterTagNameFunc(jsonTagName)

	registerStringSet(validate, "subject_type", "product", "service", "brand", "offer", "event", "place", "other", "unknown")
	registerStringSet(validate, "subject_source", "user_input", "import", "mock", "unknown")
	registerStringSet(validate, "asset_type", "image", "video", "url")
	registerStringSet(validate, "asset_source", "upload", "external_url", "generated", "mock")
	registerStringSet(validate, "video_provider", "pollo", "kling", "runway", "mock")
	registerStringSet(validate, "objective", "awareness", "traffic", "conversions", "engagement", "app_promotion", "lead_generation", "unknown")
	registerStringSet(validate, "platform", "meta_ads", "google_ads", "tiktok", "reels", "youtube_shorts", "generic_vertical", "unknown")
	registerStringSet(validate, "ad_platform", "meta_ads", "google_ads")
	registerStringSet(validate, "aspect_ratio", "9:16", "1:1", "4:5", "16:9", "unknown")
	registerStringSet(validate, "metrics_source", "meta_ads_api", "google_ads_api", "mock", "manual", "unknown")

	return &StructValidator{validate: validate}
}

func (v *StructValidator) Validate(out any) error {
	return v.validate.Struct(out)
}

func registerStringSet(validate *validator.Validate, tag string, allowed ...string) {
	values := make(map[string]struct{}, len(allowed))
	for _, value := range allowed {
		values[value] = struct{}{}
	}

	_ = validate.RegisterValidation(tag, func(fl validator.FieldLevel) bool {
		value := fl.Field().String()
		_, ok := values[value]
		return ok
	})
}

func jsonTagName(field reflect.StructField) string {
	name := field.Tag.Get("json")
	if name == "" {
		return field.Name
	}
	for i, r := range name {
		if r == ',' {
			if i == 0 {
				return field.Name
			}
			return name[:i]
		}
	}
	return name
}
