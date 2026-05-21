/**
 * Backend ERP Connector
 * @description Connect to ERP systems (Logo, Mikro, Netsis) for product data
 * PRODUCTION: All mock data removed - system fails closed when ERP not configured
 */

import { configurationMissing } from "../http/errors/api-error.js";

/**
 * ERP system types
 */
export const ERP_SYSTEMS = ["logo", "mikro", "netsis"];

/**
 * Create ERP connector service
 */
export function createERPConnectorService({ store, ids, clock, config }) {
  /**
   * Get ERP credentials from environment
   */
  function getERPCredentials(system) {
    const credentials = {
      logo: {
        apiKey: process.env.LOGO_API_KEY,
        baseUrl: process.env.LOGO_API_BASE_URL,
        companyId: process.env.LOGO_COMPANY_ID
      },
      mikro: {
        apiKey: process.env.MIKRO_API_KEY,
        baseUrl: process.env.MIKRO_API_BASE_URL,
        dbName: process.env.MIKRO_DB_NAME
      },
      netsis: {
        apiKey: process.env.NETSIS_API_KEY,
        baseUrl: process.env.NETSIS_API_BASE_URL,
        username: process.env.NETSIS_USERNAME
      }
    };

    return credentials[system] || null;
  }

  /**
   * Check if ERP system is configured
   */
  function isERPConfigured(system) {
    const creds = getERPCredentials(system);
    return creds && creds.apiKey && creds.baseUrl;
  }

  /**
   * Get ERP readiness status
   */
  function getERPReadiness() {
    return {
      logo: { ready: isERPConfigured("logo"), is_mock: false },
      mikro: { ready: isERPConfigured("mikro"), is_mock: false },
      netsis: { ready: isERPConfigured("netsis"), is_mock: false }
    };
  }

  /**
   * Fetch products from ERP
   */
  async function fetchProducts(system, options = {}) {
    const { page = 1, pageSize = 50, category, search } = options;

    const creds = getERPCredentials(system);
    if (!creds || !creds.apiKey || !creds.baseUrl) {
      throw configurationMissing("ERP_NOT_CONFIGURED", `${system} ERP is not configured. Set ${system.toUpperCase()}_API_KEY and ${system.toUpperCase()}_API_BASE_URL environment variables.`);
    }

    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize)
      });
      if (category) params.append("category", category);
      if (search) params.append("search", search);

      const response = await fetch(`${creds.baseUrl}/products?${params}`, {
        headers: {
          "Authorization": `Bearer ${creds.apiKey}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`ERP API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`ERP fetch error for ${system}:`, error);
      throw error;
    }
  }

  /**
   * Get product by ID from ERP
   */
  async function getProduct(system, productId) {
    const creds = getERPCredentials(system);
    if (!creds || !creds.apiKey || !creds.baseUrl) {
      throw configurationMissing("ERP_NOT_CONFIGURED", `${system} ERP is not configured. Set ${system.toUpperCase()}_API_KEY and ${system.toUpperCase()}_API_BASE_URL environment variables.`);
    }

    const response = await fetch(`${creds.baseUrl}/products/${productId}`, {
      headers: {
        "Authorization": `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`ERP API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Fetch stock data from ERP
   */
  async function fetchStock(system, productIds = []) {
    const creds = getERPCredentials(system);
    if (!creds || !creds.apiKey || !creds.baseUrl) {
      throw configurationMissing("ERP_NOT_CONFIGURED", `${system} ERP is not configured. Set ${system.toUpperCase()}_API_KEY and ${system.toUpperCase()}_API_BASE_URL environment variables.`);
    }

    const response = await fetch(`${creds.baseUrl}/stock`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ product_ids: productIds })
    });

    if (!response.ok) {
      throw new Error(`ERP API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Fetch sales data from ERP
   */
  async function fetchSales(system, options = {}) {
    const { startDate, endDate, productIds } = options;

    const creds = getERPCredentials(system);
    if (!creds || !creds.apiKey || !creds.baseUrl) {
      throw configurationMissing("ERP_NOT_CONFIGURED", `${system} ERP is not configured. Set ${system.toUpperCase()}_API_KEY and ${system.toUpperCase()}_API_BASE_URL environment variables.`);
    }

    const body = {};
    if (startDate) body.start_date = startDate;
    if (endDate) body.end_date = endDate;
    if (productIds) body.product_ids = productIds;

    const response = await fetch(`${creds.baseUrl}/sales`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`ERP API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Sync products from ERP to store
   */
  async function syncProducts(system, tenantId) {
    const products = await fetchProducts(system);
    const now = clock.now();

    for (const product of products.items || []) {
      store.upsert("products", {
        id: product.id,
        tenant_id: tenantId,
        erp_system: system,
        erp_product_id: product.erp_id,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        stock_quantity: product.stock_quantity,
        image_url: product.image_url,
        is_active: product.is_active ?? true,
        synced_at: now,
        created_at: now,
        updated_at: now
      });
    }

    return {
      synced_count: products.items?.length || 0,
      synced_at: now
    };
  }

  return {
    getERPCredentials,
    isERPConfigured,
    getERPReadiness,
    fetchProducts,
    getProduct,
    fetchStock,
    fetchSales,
    syncProducts
  };
}