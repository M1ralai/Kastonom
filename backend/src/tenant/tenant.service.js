import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("tenant");

export function createTenantService({ clock }) {
  return {
    /**
     * Get tenant credits information
     */
    async getCredits(context) {
      const tenantId = context.tenant_id;

      log.info("Getting tenant credits", { tenant_id: tenantId });

      // Get tenant info
      const tenant = await pgStore.getTenant(tenantId);
      if (!tenant) {
        throw new Error("Tenant not found");
      }

      // Get usage statistics
      const generatedVideos = await pgStore.listGeneratedVideos(tenantId);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const usedThisMonth = generatedVideos.filter(v => {
        const created = new Date(v.created_at);
        return created >= new Date(startOfMonth);
      }).length;

      // Get published ads for additional metrics
      const publications = await pgStore.listAdPublications(tenantId);
      const publishedCount = publications.filter(p => p.status === "published").length;

      // Credit configuration (in production, these might come from tenant settings)
      const monthlyAllowance = tenant.monthly_allowance || 50;
      const currentCredits = tenant.current_credits || 1000;
      const creditCurrency = tenant.credit_currency || "TRY";
      const videosPerCredit = 1;

      log.info("Tenant credits retrieved", {
        tenant_id: tenantId,
        current_credits: currentCredits,
        used_this_month: usedThisMonth
      });

      return {
        tenant_id: tenantId,
        current_credits: currentCredits,
        credit_currency: creditCurrency,
        monthly_allowance: monthlyAllowance,
        used_this_month: usedThisMonth,
        videos_per_credit: videosPerCredit
      };
    },

    /**
     * Get tenant details
     */
    async getTenantDetails(context) {
      const tenantId = context.tenant_id;

      log.info("Getting tenant details", { tenant_id: tenantId });

      const tenant = await pgStore.getTenant(tenantId);
      if (!tenant) {
        throw new Error("Tenant not found");
      }

      return {
        id: tenant.id,
        name: tenant.name,
        mode: tenant.mode,
        status: tenant.status,
        created_at: tenant.created_at
      };
    }
  };
}