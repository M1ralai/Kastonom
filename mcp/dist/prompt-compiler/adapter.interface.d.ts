/**
 * MCP Prompt Compiler - Adapter Interface
 * @module mcp/prompt-compiler
 * @file MCP-004: Prompt compiler adapter interface and implementations
 * @description Provider-specific prompt compilation with LLM optimization and fallback.
 */
import type { VideoProvider, AspectRatio, CreativeBriefContent, PromptPayload } from "../types/index.js";
/**
 * Prompt compiler options
 */
export interface PromptCompilerOptions {
    defaultLanguage?: string;
    llmApiKey?: string | null;
}
/**
 * Compile creative brief to prompt payload
 * @param creativeBrief - Creative brief content
 * @param provider - Video provider
 * @param options - Compilation options
 * @returns Prompt payload
 */
export interface CompileOptions {
    provider: VideoProvider;
    durationSeconds: number;
    aspectRatio: AspectRatio;
    language?: string;
    sourceAssetIds?: string[];
    isMock?: boolean;
    fallbackReason?: string | null;
}
/**
 * Base adapter interface for prompt compilation
 */
export interface BasePromptAdapter {
    compile(brief: CreativeBriefContent, options: CompileOptions): PromptPayload;
}
/**
 * Mock prompt adapter (always deterministic, labeled)
 */
export declare function createMockPromptAdapter(tenantId: string): BasePromptAdapter;
/**
 * Pollo prompt adapter (LLM-enhanced, rule-based fallback)
 */
export declare function createPolloPromptAdapter(tenantId: string, _llmApiKey?: string | null): BasePromptAdapter;
/**
 * Kling prompt adapter (LLM-enhanced, rule-based fallback)
 */
export declare function createKlingPromptAdapter(tenantId: string, _llmApiKey?: string | null): BasePromptAdapter;
/**
 * Runway prompt adapter (LLM-enhanced, rule-based fallback)
 */
export declare function createRunwayPromptAdapter(tenantId: string, _llmApiKey?: string | null): BasePromptAdapter;
/**
 * Get adapter for provider
 */
export declare function getAdapter(provider: VideoProvider, tenantId: string, llmApiKey?: string | null): BasePromptAdapter;
/**
 * Compile prompt for any provider
 */
export declare function compilePrompt(brief: CreativeBriefContent, options: CompileOptions, tenantId: string, llmApiKey?: string | null): PromptPayload;
//# sourceMappingURL=adapter.interface.d.ts.map