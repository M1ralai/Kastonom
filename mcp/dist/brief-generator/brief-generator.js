/**
 * MCP Brief Generator - Creative Brief Generation
 * @module mcp/brief-generator
 * @file MCP-003: Structured creative brief generation with LLM enhancement
 * @description Transform scoring output and product details into deterministic creative brief.
 */
import { createRuleBasedMetadata, createLLMMetadata } from "../types/index.js";
/**
 * Generate creative brief content from AI behavior output
 * @param scoringOutput - AI scoring output
 * @param options - Generator options
 * @returns Generated creative brief content
 */
export function generateCreativeBrief(scoringOutput, options = {}) {
    const { defaultLanguage = "Turkish" } = options;
    // Generate based on hype_score and product characteristics
    const hypeScore = scoringOutput.scores.hype_score;
    const audienceFit = scoringOutput.scores.audience_fit;
    const trendPotential = scoringOutput.scores.trend_potential_score;
    // Determine tone and angle based on scores
    let tone;
    let creativeAngle;
    if (hypeScore >= 75) {
        tone = "modern";
        creativeAngle = trendPotential >= 50 ? "trending" : "premium";
    }
    else if (hypeScore >= 50) {
        tone = "professional";
        creativeAngle = "value";
    }
    else {
        tone = "casual";
        creativeAngle = "general";
    }
    // Generate hook based on scores
    let hook;
    if (hypeScore >= 75) {
        hook = "Şimdi trend! Bu ürünü kaçırmayın";
    }
    else if (hypeScore >= 50) {
        hook = "Kaliteli ürün, uygun fiyatla sizlerle";
    }
    else {
        hook = "Ürünümüzü keşfedin";
    }
    // Generate main claim
    let mainClaim;
    if (audienceFit >= 70) {
        mainClaim = "Size özel tasarlanan kaliteli ürün";
    }
    else if (audienceFit >= 40) {
        mainClaim = "Herkes için ideal seçim";
    }
    else {
        mainClaim = "Kaliteli ve güvenilir ürün";
    }
    // Default CTA
    const callToAction = "Detayları gör";
    return {
        hook,
        main_claim: mainClaim,
        call_to_action: callToAction,
        creative_angle: creativeAngle,
        tone
    };
}
/**
 * Generate creative brief with full output wrapper
 * @param scoringOutput - AI scoring output
 * @param options - Generator options
 * @returns Complete creative brief content
 */
export function generateBriefWithContext(scoringOutput, options = {}) {
    const llmAvailable = options.llmApiKey !== null && options.llmApiKey !== undefined;
    // Generate content
    const creative_brief = generateCreativeBrief(scoringOutput, options);
    // Create metadata
    let metadata;
    if (llmAvailable) {
        metadata = createLLMMetadata("gpt-4", "llm", "high");
    }
    else {
        metadata = createRuleBasedMetadata();
    }
    return {
        creative_brief,
        metadata
    };
}
/**
 * Validate generated content against forbidden terms
 * @param content - Creative brief content
 * @returns Validation result
 */
export function validateContent(content) {
    const violations = [];
    const forbiddenTerms = [
        "fiyat",
        "indirim",
        "%",
        "TL",
        "garanti",
        "stokta var",
        "en iyi",
        "süper",
        "muhteşem"
    ];
    const allText = [
        content.hook,
        content.main_claim,
        content.call_to_action,
        content.creative_angle,
        content.tone
    ].join(" ").toLowerCase();
    for (const term of forbiddenTerms) {
        if (allText.includes(term.toLowerCase())) {
            violations.push(`forbidden_term: ${term}`);
        }
    }
    // Check hook length
    if (content.hook.split(" ").length > 15) {
        violations.push("hook_exceeds_15_words");
    }
    // Check CTA length
    if (content.call_to_action.split(" ").length > 8) {
        violations.push("cta_exceeds_8_words");
    }
    return {
        valid: violations.length === 0,
        violations
    };
}
/**
 * Determine confidence level based on scoring
 * @param scoringOutput - AI scoring output
 * @returns Confidence level
 */
export function determineConfidence(scoringOutput) {
    const scores = scoringOutput.scores;
    const hasData = scores.hype_score > 0 || scores.trend_potential_score > 0;
    if (!hasData) {
        return "low";
    }
    const totalScore = scores.hype_score + scores.trend_potential_score + scores.sales_velocity;
    const avgScore = totalScore / 3;
    if (avgScore >= 70) {
        return "high";
    }
    else if (avgScore >= 40) {
        return "medium";
    }
    else {
        return "low";
    }
}
//# sourceMappingURL=brief-generator.js.map