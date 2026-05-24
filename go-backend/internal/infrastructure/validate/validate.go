package validate

import "github.com/go-playground/validator/v10"

type StructValidator struct {
	V *validator.Validate
}

func (v *StructValidator) Validate(out any) error {
	return v.V.Struct(out)
}
