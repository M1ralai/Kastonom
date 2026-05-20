/**
 * MCP Brief Generator - Creative Brief Generation
 * @module mcp/brief-generator
 * @file MCP-003: Structured creative brief generation with LLM enhancement
 * @description Transform scoring output and product details into deterministic creative brief.
 */
import type { AIBehaviorOutput, CreativeBriefContent, OutputMetadata, Confidence } from "../types/index.js";
/**
 * Creative brief generator options
 */
export interface BriefGeneratorOptions {
    llmApiKey?: string | null;
    defaultLanguage?: string;
}
/**
 * Generate creative brief content from AI behavior output
 * @param scoringOutput - AI scoring output
 * @param options - Generator options
 * @returns Generated creative brief content
 */
export declare function generateCreativeBrief(scoringOutput: AIBehaviorOutput, options?: BriefGeneratorOptions): CreativeBriefContent;
/**
 * Generate creative brief with full output wrapper
 * @param scoringOutput - AI scoring output
 * @param options - Generator options
 * @returns Complete creative brief content
 */
export declare function generateBriefWithContext(scoringOutput: AIBehaviorOutput, options?: BriefGeneratorOptions): {
    creative_brief: CreativeBriefContent;
    metadata: OutputMetadata;
};
/**
 * Validate generated content against forbidden terms
 * @param content - Creative brief content
 * @returns Validation result
 */
export declare function validateContent(content: CreativeBriefContent): {
    valid: boolean;
    violations: string[];
};
/**
 * Determine confidence level based on scoring
 * @param scoringOutput - AI scoring output
 * @returns Confidence level
 */
export declare function determineConfidence(scoringOutput: AIBehaviorOutput): Confidence;
//# sourceMappingURL=brief-generator.d.ts.map