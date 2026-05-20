/**
 * MCP Types - Unit Tests
 * @module mcp/tests/types
 * @file MCP-001: Type validation and JSON serialization tests
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  // Enums and guards
  isValidTenantMode,
  isValidTenantStatus,
  isValidSubjectType,
  isValidObjective,
  isValidPlatform,
  isValidVideoProvider,
  isValidGenerationMethod,
  isValidConfidence,
  TENANT_MODES,
  TENANT_STATUSES,
  OBJECTIVES,
  PLATFORMS,
  VIDEO_PROVIDERS,
  CONFIDENCE_VALUES,
  GENERATION_METHODS,

  // Tenant Context
  TenantContext,
  createTenantContext,
  isTenantContext,
  isDemoTenant,
  isActiveTenant,
  isLiveTenant,
  cloneTenantContext,
  getDemoTenantContext,

  // AI Behavior Output
  createDefaultScores,
  createDefaultAudienceSummary,
  createRuleBasedMetadata,
  createLLMMetadata,
  createBasicAIBehaviorOutput,
  areScoresValid,
  isAIBehaviorOutput,
  cloneAIBehaviorOutput,

  // Product Metrics
  createDefaultProductMetrics,
  hasScoringData,
  hasAudienceData,
  AD_METRIC_THRESHOLDS,
  isCtrLow,
  isVideoViewRateLow,
  isCostPerVideoViewHigh,
  isRoasLow
} from "../../src/types/index.js";

// ============================================
// Tenant Mode Tests
// ============================================

test("TenantMode enum has values 'demo' and 'live'", () => {
  assert.deepEqual(TENANT_MODES, ["demo", "live"]);
  assert.ok(isValidTenantMode("demo"));
  assert.ok(isValidTenantMode("live"));
  assert.ok(!isValidTenantMode("invalid"));
  assert.ok(!isValidTenantMode(""));
  assert.ok(!isValidTenantMode(null));
});

test("TenantStatus enum has values 'active' and 'disabled'", () => {
  assert.deepEqual(TENANT_STATUSES, ["active", "disabled"]);
  assert.ok(isValidTenantStatus("active"));
  assert.ok(isValidTenantStatus("disabled"));
  assert.ok(!isValidTenantStatus("invalid"));
});

// ============================================
// TenantContext Tests
// ============================================

test("createTenantContext creates valid context", () => {
  const ctx = createTenantContext({
    tenantId: "test-tenant",
    mode: "demo",
    status: "active"
  });

  assert.equal(ctx.tenant_id, "test-tenant");
  assert.equal(ctx.mode, "demo");
  assert.equal(ctx.status, "active");
  assert.ok(ctx.created_at);
  assert.ok(ctx.updated_at);
});

test("createTenantContext rejects empty tenant_id", () => {
  assert.throws(() => {
    createTenantContext({
      tenantId: "",
      mode: "demo",
      status: "active"
    });
  }, /tenant_id is required/);
});

test("createTenantContext rejects invalid mode", () => {
  assert.throws(() => {
    createTenantContext({
      tenantId: "test",
      mode: "invalid" as "demo",
      status: "active"
    });
  });
});

test("isTenantContext validates correctly", () => {
  const valid = createTenantContext({
    tenantId: "test",
    mode: "live",
    status: "active"
  });
  assert.ok(isTenantContext(valid));
  assert.ok(!isTenantContext(null));
  assert.ok(!isTenantContext({}));
  assert.ok(!isTenantContext({ tenant_id: "", mode: "demo", status: "active" }));
});

test("isDemoTenant returns correct value", () => {
  const demo = createTenantContext({ tenantId: "t1", mode: "demo", status: "active" });
  const live = createTenantContext({ tenantId: "t2", mode: "live", status: "active" });

  assert.ok(isDemoTenant(demo));
  assert.ok(!isDemoTenant(live));
});

test("isLiveTenant returns correct value", () => {
  const demo = createTenantContext({ tenantId: "t1", mode: "demo", status: "active" });
  const live = createTenantContext({ tenantId: "t2", mode: "live", status: "active" });
  const disabled = createTenantContext({ tenantId: "t3", mode: "live", status: "disabled" });

  assert.ok(!isLiveTenant(demo));
  assert.ok(isLiveTenant(live));
  assert.ok(!isLiveTenant(disabled));
});

test("cloneTenantContext creates independent copy", () => {
  const original = createTenantContext({
    tenantId: "test",
    mode: "live",
    status: "active"
  });
  const cloned = cloneTenantContext(original);

  assert.equal(cloned.tenant_id, original.tenant_id);
  assert.equal(cloned.mode, original.mode);
  assert.equal(cloned.status, original.status);
  // Timestamps should be different (updated_at)
  assert.notEqual(cloned.updated_at, original.updated_at);
});

test("getDemoTenantContext returns pre-configured demo context", () => {
  const ctx = getDemoTenantContext();

  assert.equal(ctx.tenant_id, "demo-tenant");
  assert.equal(ctx.mode, "demo");
  assert.equal(ctx.status, "active");
});

// ============================================
// Scores Tests
// ============================================

test("createDefaultScores returns all zeros", () => {
  const scores = createDefaultScores();

  assert.equal(scores.hype_score, 0);
  assert.equal(scores.trend_potential_score, 0);
  assert.equal(scores.sales_velocity, 0);
  assert.equal(scores.stock_movement, 0);
  assert.equal(scores.new_product_boost, 0);
  assert.equal(scores.audience_fit, 0);
});

test("areScoresValid validates bounded scores", () => {
  const validScores = {
    hype_score: 50,
    trend_potential_score: 75,
    sales_velocity: 100,
    stock_movement: 0,
    new_product_boost: 50,
    audience_fit: 25
  };

  assert.ok(areScoresValid(validScores));
  assert.ok(!areScoresValid({ ...validScores, hype_score: 150 }));
  assert.ok(!areScoresValid({ ...validScores, hype_score: -10 }));
  assert.ok(!areScoresValid({ ...validScores, hype_score: NaN }));
});

// ============================================
// Metadata Tests
// ============================================

test("createRuleBasedMetadata sets correct values", () => {
  const meta = createRuleBasedMetadata();

  assert.equal(meta.llm_used, false);
  assert.equal(meta.llm_available, false);
  assert.equal(meta.generation_method, "rule_based");
  assert.equal(meta.model_used, null);
});

test("createLLMMetadata sets correct values", () => {
  const meta = createLLMMetadata("gpt-4", "llm", "high");

  assert.equal(meta.llm_used, true);
  assert.equal(meta.llm_available, true);
  assert.equal(meta.generation_method, "llm");
  assert.equal(meta.model_used, "gpt-4");
  assert.equal(meta.confidence, "high");
});

// ============================================
// AIBehaviorOutput Tests
// ============================================

test("createBasicAIBehaviorOutput creates valid output", () => {
  const meta = createRuleBasedMetadata();
  const output = createBasicAIBehaviorOutput("product-123", meta);

  assert.equal(output.product_id, "product-123");
  assert.ok(output.recommendation);
  assert.ok(output.scores);
  assert.ok(output.audience_summary);
  assert.ok(output.creative_brief);
  assert.ok(Array.isArray(output.fallback_notes));
  assert.ok(output.metadata);
});

test("isAIBehaviorOutput validates structure", () => {
  const meta = createRuleBasedMetadata();
  const valid = createBasicAIBehaviorOutput("p1", meta);
  assert.ok(isAIBehaviorOutput(valid));

  assert.ok(!isAIBehaviorOutput(null));
  assert.ok(!isAIBehaviorOutput({}));
  assert.ok(!isAIBehaviorOutput({ product_id: 123 })); // must be string
});

test("cloneAIBehaviorOutput creates deep copy", () => {
  const meta = createRuleBasedMetadata();
  const original = createBasicAIBehaviorOutput("p1", meta);
  const cloned = cloneAIBehaviorOutput(original);

  assert.equal(cloned.product_id, original.product_id);
  assert.notEqual(cloned, original);
  assert.notEqual(cloned.scores, original.scores);
});

// ============================================
// Product Metrics Tests
// ============================================

test("createDefaultProductMetrics sets all nulls", () => {
  const metrics = createDefaultProductMetrics("p1", "t1");

  assert.equal(metrics.product_id, "p1");
  assert.equal(metrics.tenant_id, "t1");
  assert.equal(metrics.recent_sales_count, null);
  assert.equal(metrics.sales_per_day, null);
  assert.equal(metrics.current_stock, null);
  assert.equal(metrics.is_new, false);
  assert.deepEqual(metrics.trend_signals, []);
});

test("hasScoringData checks for sales/stock data", () => {
  const empty = createDefaultProductMetrics("p1", "t1");
  assert.ok(!hasScoringData(empty));

  const withSales = { ...empty, recent_sales_count: 100 };
  assert.ok(hasScoringData(withSales));

  const withStock = { ...empty, current_stock: 50 };
  assert.ok(hasScoringData(withStock));
});

test("hasAudienceData checks for segment data", () => {
  const empty = createDefaultProductMetrics("p1", "t1");
  assert.ok(!hasAudienceData(empty));

  const withSegment = { ...empty, audience_segment: "tech-savvy" };
  assert.ok(hasAudienceData(withSegment));
});

// ============================================
// Ad Metric Threshold Tests
// ============================================

test("AD_METRIC_THRESHOLDS has correct values", () => {
  assert.equal(AD_METRIC_THRESHOLDS.CTR_LOW, 0.02);
  assert.equal(AD_METRIC_THRESHOLDS.CTR_VERY_LOW, 0.01);
  assert.equal(AD_METRIC_THRESHOLDS.VIDEO_VIEW_RATE_LOW, 0.30);
  assert.equal(AD_METRIC_THRESHOLDS.COST_PER_VIDEO_VIEW_HIGH, 0.50);
  assert.equal(AD_METRIC_THRESHOLDS.ROAS_LOW, 1.5);
  assert.equal(AD_METRIC_THRESHOLDS.ROAS_VERY_LOW, 1.0);
});

test("isCtrLow checks threshold correctly", () => {
  assert.ok(isCtrLow(0.01));
  assert.ok(!isCtrLow(0.05));
  assert.ok(!isCtrLow(null));
});

test("isVideoViewRateLow checks threshold correctly", () => {
  assert.ok(isVideoViewRateLow(0.20));
  assert.ok(!isVideoViewRateLow(0.50));
  assert.ok(!isVideoViewRateLow(null));
});

test("isCostPerVideoViewHigh checks threshold correctly", () => {
  assert.ok(isCostPerVideoViewHigh(0.60));
  assert.ok(!isCostPerVideoViewHigh(0.30));
  assert.ok(!isCostPerVideoViewHigh(null));
});

test("isRoasLow checks threshold correctly", () => {
  assert.ok(isRoasLow(1.2));
  assert.ok(!isRoasLow(2.5));
  assert.ok(!isRoasLow(null));
});

// ============================================
// Enum Validation Tests
// ============================================

test("isValidObjective validates correctly", () => {
  assert.ok(isValidObjective("awareness"));
  assert.ok(isValidObjective("conversions"));
  assert.ok(!isValidObjective("invalid"));
});

test("isValidPlatform validates correctly", () => {
  assert.ok(isValidPlatform("meta_ads"));
  assert.ok(isValidPlatform("tiktok"));
  assert.ok(!isValidPlatform("facebook"));
});

test("isValidVideoProvider validates correctly", () => {
  assert.ok(isValidVideoProvider("mock"));
  assert.ok(isValidVideoProvider("kling"));
  assert.ok(!isValidVideoProvider("stable"));
});

test("isValidGenerationMethod validates correctly", () => {
  assert.ok(isValidGenerationMethod("llm"));
  assert.ok(isValidGenerationMethod("rule_based"));
  assert.ok(isValidGenerationMethod("hybrid"));
  assert.ok(!isValidGenerationMethod("random"));
});

test("isValidConfidence validates correctly", () => {
  assert.ok(isValidConfidence("low"));
  assert.ok(isValidConfidence("medium"));
  assert.ok(isValidConfidence("high"));
  assert.ok(!isValidConfidence("medium-high"));
});

// ============================================
// JSON Serialization Tests
// ============================================

test("TenantContext JSON roundtrip preserves type info", () => {
  const original = createTenantContext({
    tenantId: "test",
    mode: "live",
    status: "active"
  });

  const json = JSON.stringify(original);
  const parsed = JSON.parse(json);

  assert.ok(isTenantContext(parsed));
  assert.equal(parsed.tenant_id, original.tenant_id);
  assert.equal(parsed.mode, original.mode);
});

test("AIBehaviorOutput JSON roundtrip preserves type info", () => {
  const original = createBasicAIBehaviorOutput("p1", createRuleBasedMetadata());

  const json = JSON.stringify(original);
  const parsed = JSON.parse(json);

  assert.ok(isAIBehaviorOutput(parsed));
  assert.equal(parsed.product_id, original.product_id);
});

test("Scores JSON serialization preserves values", () => {
  const scores = {
    hype_score: 75,
    trend_potential_score: 80,
    sales_velocity: 60,
    stock_movement: 45,
    new_product_boost: 20,
    audience_fit: 90
  };

  const json = JSON.stringify(scores);
  const parsed = JSON.parse(json);

  assert.ok(areScoresValid(parsed));
  assert.equal(parsed.hype_score, 75);
});

// ============================================
// Edge Case Tests
// ============================================

test("empty strings are rejected by type guards", () => {
  assert.ok(!isValidTenantMode(""));
  assert.ok(!isValidTenantStatus(""));
  assert.ok(!isValidObjective(""));
  assert.ok(!isValidPlatform(""));
});

test("null is rejected by type guards", () => {
  assert.ok(!isValidTenantMode(null));
  assert.ok(!isValidTenantStatus(null));
  assert.ok(!isValidObjective(null));
});

test("undefined is rejected by type guards", () => {
  assert.ok(!isValidTenantMode(undefined));
  assert.ok(!isValidTenantStatus(undefined));
  assert.ok(!isValidObjective(undefined));
});

test("numbers are rejected by string type guards", () => {
  assert.ok(!isValidTenantMode(123));
  assert.ok(!isValidTenantStatus(456));
});

console.log("MCP-001 Type tests loaded successfully");
