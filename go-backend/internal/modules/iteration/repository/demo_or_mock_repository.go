package repository

import "strings"

func demoOrMockSuggestedChanges() []string {
	return []string{"shorten opening hook", "make call to action clearer"}
}

func demoOrMockSuggestedValue(changes []string) string {
	return strings.Join(changes, "; ")
}
