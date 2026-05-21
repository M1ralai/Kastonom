import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("kpi-summary");

export function createKpiSummaryService({ clock }) {
  return {
    /**
     * Get KPI summary for dashboard
     * Returns monthly video count, credits, and CTR metrics
     */
    async getSummary(context) {
      const tenantId = context.tenant_id;
      const now = clock.now();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      log.info("Getting KPI summary", { tenant_id: tenantId });

      // Get tenant info for credits
      const tenant = await pgStore.getTenant(tenantId);
      if (!tenant) {
        throw new Error("Tenant not found");
      }

      // Count videos created this month
      const thisMonthVideos = await pgStore.listGeneratedVideos(tenantId);
      const monthlyVideoCount = thisMonthVideos.filter(v => {
        const created = new Date(v.created_at);
        return created >= new Date(startOfMonth);
      }).length;

      // Count videos from last month for comparison
      const lastMonthVideos = thisMonthVideos.filter(v => {
        const created = new Date(v.created_at);
        return created >= new Date(startOfLastMonth) && created <= new Date(endOfLastMonth);
      }).length;

      // Calculate percentage change
      let monthlyVideoChange = 0;
      if (lastMonthVideos > 0) {
        monthlyVideoChange = Math.round(((monthlyVideoCount - lastMonthVideos) / lastMonthVideos) * 100);
      } else if (monthlyVideoCount > 0) {
        monthlyVideoChange = 100;
      }

      // Get credit info from tenant metadata or default
      const creditCurrency = tenant.credit_currency || "TRY";
      const currentCredits = tenant.current_credits || 1000;
      const monthlyAllowance = tenant.monthly_allowance || 50;

      // Calculate remaining credits (simplified - in production, track actual usage)
      const usedThisMonth = monthlyVideoCount; // 1 credit per video
      const remainingCredits = Math.max(0, currentCredits - usedThisMonth);

      // Get published ad metrics for CTR calculation
      const publications = await pgStore.listAdPublications(tenantId);
      const publishedProjects = publications.filter(p => p.status === "published");

      let totalCtr = 0;
      let totalClicks = 0;
      let totalImpressions = 0;

      // For demo, calculate from stored metrics if available
      // In production, this would aggregate from ad_metrics_snapshots
      for (const pub of publishedProjects) {
        if (pub.ctr) {
          totalCtr += pub.ctr;
        }
      }

      const averageCtr = publishedProjects.length > 0 ? (totalCtr / publishedProjects.length) : 0;
      const sectorAverageCtr = 1.4; // Industry benchmark - should come from config or external service
      const ctrChangePercent = averageCtr > 0 && sectorAverageCtr > 0
        ? Math.round(((averageCtr - sectorAverageCtr) / sectorAverageCtr) * 100)
        : 0;

      log.info("KPI summary calculated", {
        tenant_id: tenantId,
        monthly_video_count: monthlyVideoCount,
        remaining_credits: remainingCredits,
        average_ctr: averageCtr
      });

      return {
        monthly_video_count: monthlyVideoCount,
        monthly_video_change: monthlyVideoChange,
        remaining_credits: remainingCredits,
        credit_currency: creditCurrency,
        average_ctr: Math.round(averageCtr * 10) / 10,
        sector_average_ctr: sectorAverageCtr,
        ctr_change_percent: ctrChangePercent
      };
    }
  };
}