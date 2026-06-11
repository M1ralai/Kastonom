package pollo

import (
	"strings"
	"sync"
)

// SecretConfig holds the runtime-only secrets that the existing Config
// struct in client.go does not model. NewClientWithSecrets returns a Client
// whose VerifyWebhookSignature will work. Existing callers using
// NewClient(Config{...}) keep their current behavior (no signature check).
type SecretConfig struct {
	WebhookSecret string
}

// WithSecrets is a fluent setter for webhookSecret. It mutates a private
// package-level map keyed by *Client because the existing Client struct in
// client.go does not have a webhookSecret field. This avoids changing the
// existing NewClient signature (which other modules already depend on).
func (c *Client) WithSecrets(s SecretConfig) *Client {
	if c == nil {
		return c
	}
	clientSecrets.Store(c, strings.TrimSpace(s.WebhookSecret))
	return c
}

func (c *Client) webhookSecret() string {
	if c == nil {
		return ""
	}
	if v, ok := clientSecrets.Load(c); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

var clientSecrets sync.Map
