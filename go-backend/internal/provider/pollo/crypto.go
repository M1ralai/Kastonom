package pollo

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

// computeHMACSHA256 returns the lowercase hex-encoded HMAC-SHA256 of body
// using secret. Mirrors the way Pollo signs webhook bodies.
func computeHMACSHA256(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

// constantTimeEqual compares two hex strings in constant time. Length
// mismatch returns false without leaking the expected length.
func constantTimeEqual(expectedHex, providedHex string) bool {
	if len(expectedHex) != len(providedHex) {
		return false
	}
	// Decode both sides to bytes; compare bytes in constant time.
	exp, err1 := hex.DecodeString(expectedHex)
	prov, err2 := hex.DecodeString(providedHex)
	if err1 != nil || err2 != nil {
		return false
	}
	return hmac.Equal(exp, prov)
}
