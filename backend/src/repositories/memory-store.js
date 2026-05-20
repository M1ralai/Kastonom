import { COLLECTIONS } from "../domain/constants.js";
import { cloneJson } from "../domain/validation.js";

function createState() {
  return Object.fromEntries(COLLECTIONS.map((collection) => [collection, new Map()]));
}

function insertInto(state, collection, record) {
  state[collection].set(record.id, cloneJson(record));
}

function seedFixture(state, fixture, config, clock) {
  const now = clock.now();
  const tenants = fixture?.tenants ?? [
    {
      id: config.demoTenantId,
      name: "Kastonom Demo Tenant",
      mode: "demo",
      status: "active",
      created_at: now,
      updated_at: now
    }
  ];

  for (const tenant of tenants) {
    insertInto(state, "tenants", tenant);
  }

  const entries = [
    ["creativeProjects", fixture?.creative_project],
    ["creativeSubjects", fixture?.creative_subject],
    ["generationRequests", fixture?.generation_request],
    ["promptPayloads", fixture?.prompt_payload],
    ["videoJobs", fixture?.video_job],
    ["providerResults", fixture?.provider_result],
    ["adPublications", fixture?.ad_publication],
    ["adMetricsSnapshots", fixture?.metrics_snapshot],
    ["creativeIterationSuggestions", fixture?.creative_iteration_suggestion]
  ];

  for (const [collection, record] of entries) {
    if (record) {
      insertInto(state, collection, record);
    }
  }

  for (const asset of fixture?.source_assets ?? []) {
    insertInto(state, "sourceAssets", asset);
  }
  for (const video of fixture?.generated_videos ?? []) {
    insertInto(state, "generatedVideos", video);
  }
  for (const connection of fixture?.ad_platform_connections ?? []) {
    insertInto(state, "adPlatformConnections", connection);
  }
}

export function createMemoryStore({ fixture, config, clock }) {
  const state = createState();
  seedFixture(state, fixture, config, clock);

  function getCollection(collection) {
    if (!state[collection]) {
      throw new Error(`Unknown collection: ${collection}`);
    }
    return state[collection];
  }

  return {
    getTenant(id) {
      return cloneJson(state.tenants.get(id));
    },

    insert(collection, record) {
      insertInto(state, collection, record);
      return cloneJson(record);
    },

    getById(collection, id) {
      return cloneJson(getCollection(collection).get(id));
    },

    getByTenant(collection, tenantId, id) {
      const record = getCollection(collection).get(id);
      if (!record || record.tenant_id !== tenantId) {
        return null;
      }
      return cloneJson(record);
    },

    listByTenant(collection, tenantId, predicate = () => true) {
      return Array.from(getCollection(collection).values())
        .filter((record) => record.tenant_id === tenantId && predicate(record))
        .map(cloneJson);
    },

    findByTenant(collection, tenantId, predicate) {
      const record = Array.from(getCollection(collection).values()).find(
        (item) => item.tenant_id === tenantId && predicate(item)
      );
      return cloneJson(record);
    },

    updateByTenant(collection, tenantId, id, updater) {
      const map = getCollection(collection);
      const current = map.get(id);
      if (!current || current.tenant_id !== tenantId) {
        return null;
      }
      const next = updater(cloneJson(current));
      map.set(id, cloneJson(next));
      return cloneJson(next);
    },

    // Query collection without tenant isolation (for auth)
    query(collection, predicate) {
      return Array.from(getCollection(collection).values()).filter(predicate);
    },

    unsafeState() {
      return state;
    }
  };
}
