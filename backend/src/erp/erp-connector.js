/**
 * Backend ERP Connector
 * @description Connect to ERP systems (Logo, Mikro, Netsis) for product data
 */

import { configurationMissing } from "../http/errors/api-error.js";

/**
 * ERP system types
 */
export const ERP_SYSTEMS = ["logo", "mikro", "netsis", "mock"];

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
      },
      mock: {
        apiKey: "mock-key",
        baseUrl: "http://localhost:3001/mock-erp",
        dbName: "mock-db"
      }
    };

    return credentials[system] || null;
  }

  /**
   * Check if ERP system is configured
   */
  function isERPConfigured(system) {
    if (system === "mock") {
      return true;
    }
    const creds = getERPCredentials(system);
    return creds && creds.apiKey && creds.baseUrl;
  }

  /**
   * Get ERP readiness status
   */
  function getERPReadiness() {
    return {
      mock: { ready: true, is_mock: true },
      logo: { ready: isERPConfigured("logo"), is_mock: !isERPConfigured("logo") },
      mikro: { ready: isERPConfigured("mikro"), is_mock: !isERPConfigured("mikro") },
      netsis: { ready: isERPConfigured("netsis"), is_mock: !isERPConfigured("netsis") }
    };
  }

  /**
   * Fetch products from ERP
   */
  async function fetchProducts(system, options = {}) {
    const { page = 1, pageSize = 50, category, search } = options;

    if (system === "mock") {
      return getMockProducts(page, pageSize);
    }

    const creds = getERPCredentials(system);
    if (!creds) {
      throw configurationMissing("ERP_NOT_CONFIGURED", `${system} ERP is not configured.`);
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
    if (system === "mock") {
      return getMockProductById(productId);
    }

    const creds = getERPCredentials(system);
    if (!creds) {
      throw configurationMissing("ERP_NOT_CONFIGURED", `${system} ERP is not configured.`);
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
    if (system === "mock") {
      return getMockStockData(productIds);
    }

    const creds = getERPCredentials(system);
    if (!creds) {
      throw configurationMissing("ERP_NOT_CONFIGURED", `${system} ERP is not configured.`);
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

    if (system === "mock") {
      return getMockSalesData(startDate, endDate);
    }

    const creds = getERPCredentials(system);
    if (!creds) {
      throw configurationMissing("ERP_NOT_CONFIGURED", `${system} ERP is not configured.`);
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

// ============================================
// Mock Data Functions
// ============================================

function getMockProducts(page = 1, pageSize = 50) {
  const mockProducts = [
    {
      id: "mock-prod-001",
      erp_id: "LOGO-001",
      name: "Çamaşır Makinesi",
      description: "8kg kapasiteli, A+++ enerji sınıfı çamaşır makinesi",
      category: "Beyaz Eşya",
      price: 8499.00,
      stock_quantity: 45,
      image_url: "https://example.com/cm1.jpg",
      is_active: true
    },
    {
      id: "mock-prod-002",
      erp_id: "LOGO-002",
      name: "Buzdolabı",
      description: "No-Frost, 450 litrelik buzdolabı",
      category: "Beyaz Eşya",
      price: 12499.00,
      stock_quantity: 28,
      image_url: "https://example.com/bd1.jpg",
      is_active: true
    },
    {
      id: "mock-prod-003",
      erp_id: "LOGO-003",
      name: "LED TV 55\"",
      description: "55 inç 4K Ultra HD Smart TV",
      category: "Elektronik",
      price: 15999.00,
      stock_quantity: 12,
      image_url: "https://example.com/tv1.jpg",
      is_active: true
    }
  ];

  const start = (page - 1) * pageSize;
  const items = mockProducts.slice(start, start + pageSize);

  return {
    items,
    total: mockProducts.length,
    page,
    page_size: pageSize,
    has_more: start + pageSize < mockProducts.length
  };
}

function getMockProductById(productId) {
  const products = getMockProducts().items;
  return products.find(p => p.id === productId || p.erp_id === productId);
}

function getMockStockData(productIds = []) {
  const stockData = {
    "mock-prod-001": { available: 45, reserved: 5, total: 50 },
    "mock-prod-002": { available: 28, reserved: 2, total: 30 },
    "mock-prod-003": { available: 12, reserved: 0, total: 12 }
  };

  if (productIds.length === 0) {
    return stockData;
  }

  return Object.fromEntries(
    Object.entries(stockData).filter(([key]) => productIds.includes(key))
  );
}

function getMockSalesData(startDate, endDate) {
  return {
    total_revenue: 125000.00,
    total_orders: 156,
    average_order_value: 801.28,
    top_products: [
      { product_id: "mock-prod-001", revenue: 42495.00, units: 5 },
      { product_id: "mock-prod-002", revenue: 24998.00, units: 2 },
      { product_id: "mock-prod-003", revenue: 31998.00, units: 2 }
    ],
    period: { start: startDate, end: endDate }
  };
}
