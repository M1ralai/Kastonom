/**
 * MCP Facade - Module Exports
 * @module mcp/facade
 */

export {
  MCPIntegrationFacade,
  createMCPFacade,
  createDemoMCPFacade
} from "./mcp-integration-facade.js";

export type {
  MCPFacadeOptions,
  GenerateInitialCampaignInput,
  GenerateCreativeBriefInput,
  CompilePromptInput,
  IterateCampaignInput
} from "./mcp-integration-facade.js";
