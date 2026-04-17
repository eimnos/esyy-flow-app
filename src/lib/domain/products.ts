import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type CoverageFilter = "all" | "yes" | "no";

export type ProductCatalogFilters = {
  q?: string;
  status?: string;
  erp?: CoverageFilter;
  diba?: CoverageFilter;
  cycle?: CoverageFilter;
  model?: CoverageFilter;
};

export type ProductCoverage = {
  erp: boolean;
  diba: boolean;
  cycle: boolean;
  model: boolean;
};

export type ProductListItem = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: string;
  coverage: ProductCoverage;
};

export type ProductCatalogResult = {
  products: ProductListItem[];
  statuses: string[];
  sourceTable: string | null;
  warnings: string[];
  error: string | null;
};

type RawRow = Record<string, unknown>;

type ProductTableCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  codeColumns: string[];
  nameColumns: string[];
  statusColumns: string[];
  erpColumns: string[];
  erpRefColumns: string[];
  dibaColumns: string[];
  cycleColumns: string[];
  modelColumns: string[];
};

type LinkTableCandidate = {
  table: string;
  productColumns: string[];
  tenantColumns: string[];
};

type ProductSnapshot = {
  sourceTable: string | null;
  warnings: string[];
  rows: ProductListItem[];
};

const PRODUCT_TABLE_CANDIDATES: ProductTableCandidate[] = [
  {
    table: "products",
    idColumns: ["id", "product_id"],
    tenantColumns: ["tenant_id", "default_tenant_id"],
    codeColumns: ["code", "product_code", "item_code", "sku"],
    nameColumns: ["name", "product_name", "item_name", "description", "title"],
    statusColumns: ["status", "lifecycle_status", "state", "is_active"],
    erpColumns: [
      "has_erp_config",
      "erp_configured",
      "erp_enabled",
      "is_erp_configured",
      "has_external_link",
      "erp_mapping_configured",
    ],
    erpRefColumns: [
      "external_code",
      "external_id",
      "erp_code",
      "sap_item_code",
      "sap_code",
      "erp_item_code",
    ],
    dibaColumns: ["has_diba", "diba_configured", "has_bom", "bom_configured"],
    cycleColumns: ["has_cycle", "cycle_configured", "has_routing", "routing_configured"],
    modelColumns: [
      "has_production_model",
      "production_model_configured",
      "model_configured",
    ],
  },
  {
    table: "product_items",
    idColumns: ["id", "product_item_id", "product_id"],
    tenantColumns: ["tenant_id", "default_tenant_id"],
    codeColumns: ["code", "product_code", "item_code", "sku"],
    nameColumns: ["name", "product_name", "item_name", "description", "title"],
    statusColumns: ["status", "lifecycle_status", "state", "is_active"],
    erpColumns: ["has_erp_config", "erp_configured", "is_erp_configured", "has_external_link"],
    erpRefColumns: ["external_code", "external_id", "erp_code", "sap_item_code", "sap_code"],
    dibaColumns: ["has_diba", "diba_configured", "has_bom", "bom_configured"],
    cycleColumns: ["has_cycle", "cycle_configured", "has_routing", "routing_configured"],
    modelColumns: [
      "has_production_model",
      "production_model_configured",
      "model_configured",
    ],
  },
  {
    table: "items",
    idColumns: ["id", "item_id", "product_id"],
    tenantColumns: ["tenant_id", "default_tenant_id"],
    codeColumns: ["code", "item_code", "sku", "product_code"],
    nameColumns: ["name", "item_name", "description", "title"],
    statusColumns: ["status", "lifecycle_status", "state", "is_active"],
    erpColumns: ["has_erp_config", "erp_configured", "is_erp_configured", "has_external_link"],
    erpRefColumns: ["external_code", "external_id", "erp_code", "sap_item_code"],
    dibaColumns: ["has_diba", "diba_configured", "has_bom", "bom_configured"],
    cycleColumns: ["has_cycle", "cycle_configured", "has_routing", "routing_configured"],
    modelColumns: [
      "has_production_model",
      "production_model_configured",
      "model_configured",
    ],
  },
];

const DIBA_LINK_TABLES: LinkTableCandidate[] = [
  {
    table: "bom_templates",
    productColumns: ["product_id", "item_id", "product_item_id"],
    tenantColumns: ["tenant_id"],
  },
  {
    table: "bom_template_versions",
    productColumns: ["product_id", "item_id", "product_item_id"],
    tenantColumns: ["tenant_id"],
  },
];

const CYCLE_LINK_TABLES: LinkTableCandidate[] = [
  {
    table: "routing_templates",
    productColumns: ["product_id", "item_id", "product_item_id"],
    tenantColumns: ["tenant_id"],
  },
  {
    table: "routing_template_versions",
    productColumns: ["product_id", "item_id", "product_item_id"],
    tenantColumns: ["tenant_id"],
  },
];

const MODEL_LINK_TABLES: LinkTableCandidate[] = [
  {
    table: "production_models",
    productColumns: ["product_id", "item_id", "product_item_id"],
    tenantColumns: ["tenant_id"],
  },
  {
    table: "production_model_versions",
    productColumns: ["product_id", "item_id", "product_item_id"],
    tenantColumns: ["tenant_id"],
  },
];

const SAFE_LIST_LIMIT = 500;

const parseString = (value: unknown) => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : "";
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  return "";
};

const parseBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on", "enabled", "active"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "off", "disabled", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return null;
};

const readStringFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = parseString(row[key]);
    if (value) {
      return value;
    }
  }
  return "";
};

const readBooleanFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = parseBoolean(row[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
};

const readAnyValue = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    if (Object.hasOwn(row, key)) {
      return row[key];
    }
  }
  return null;
};

const looksLikeMissingTable = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes("could not find the table") || normalized.includes("schema cache");
};

const looksLikeMissingColumn = (message: string, columnName: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("column") &&
    normalized.includes(columnName.toLowerCase()) &&
    normalized.includes("does not exist")
  );
};

const normalizeStatus = (row: RawRow, candidate: ProductTableCandidate) => {
  const rawStatus = readAnyValue(row, candidate.statusColumns);

  if (typeof rawStatus === "string") {
    const normalized = rawStatus.trim();
    return normalized.length > 0 ? normalized : "unknown";
  }

  if (typeof rawStatus === "boolean") {
    return rawStatus ? "active" : "inactive";
  }

  if (typeof rawStatus === "number") {
    return rawStatus > 0 ? "active" : "inactive";
  }

  return "unknown";
};

const normalizeProductRow = (
  row: RawRow,
  candidate: ProductTableCandidate,
  tenantId: string,
): ProductListItem | null => {
  const id = readStringFromKeys(row, candidate.idColumns);
  if (!id) {
    return null;
  }

  const rowTenantId = readStringFromKeys(row, candidate.tenantColumns) || tenantId;
  const code = readStringFromKeys(row, candidate.codeColumns) || id;
  const name = readStringFromKeys(row, candidate.nameColumns) || code;
  const status = normalizeStatus(row, candidate);

  const erpByBoolean = readBooleanFromKeys(row, candidate.erpColumns);
  const erpByRefs = candidate.erpRefColumns.some((column) => {
    const value = parseString(row[column]);
    return value.length > 0;
  });

  const diba = readBooleanFromKeys(row, candidate.dibaColumns) ?? false;
  const cycle = readBooleanFromKeys(row, candidate.cycleColumns) ?? false;
  const model = readBooleanFromKeys(row, candidate.modelColumns) ?? false;

  return {
    id,
    tenantId: rowTenantId,
    code,
    name,
    status,
    coverage: {
      erp: erpByBoolean ?? erpByRefs,
      diba,
      cycle,
      model,
    },
  };
};

const queryCandidateRows = async (
  candidate: ProductTableCandidate,
  tenantId: string,
  limit: number,
) => {
  const admin = getSupabaseAdminClient();

  for (const tenantColumn of candidate.tenantColumns) {
    const { data, error } = await admin
      .from(candidate.table)
      .select("*")
      .eq(tenantColumn, tenantId)
      .limit(limit);

    if (!error) {
      return {
        exists: true,
        rows: (data ?? []) as RawRow[],
        warning: null as string | null,
      };
    }

    const message = error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, tenantColumn)) {
      continue;
    }

    return {
      exists: true,
      rows: [] as RawRow[],
      warning: `Errore su ${candidate.table}: ${message}`,
    };
  }

  const fallbackResult = await admin.from(candidate.table).select("*").limit(limit);
  if (fallbackResult.error) {
    const message = fallbackResult.error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message)) {
      return {
        exists: false,
        rows: [] as RawRow[],
        warning: null as string | null,
      };
    }

    return {
      exists: true,
      rows: [] as RawRow[],
      warning: `Errore su ${candidate.table}: ${message}`,
    };
  }

  const rows = ((fallbackResult.data ?? []) as RawRow[]).filter((row) => {
    const scopedTenant = readStringFromKeys(row, candidate.tenantColumns);
    return scopedTenant === tenantId;
  });

  return {
    exists: true,
    rows,
    warning: null as string | null,
  };
};

const buildProductSnapshot = async (tenantId: string, limit: number): Promise<ProductSnapshot> => {
  const warnings: string[] = [];
  const foundCandidates: Array<{
    candidate: ProductTableCandidate;
    rows: RawRow[];
  }> = [];

  for (const candidate of PRODUCT_TABLE_CANDIDATES) {
    const result = await queryCandidateRows(candidate, tenantId, limit);
    if (result.warning) {
      warnings.push(result.warning);
    }

    if (!result.exists) {
      continue;
    }

    foundCandidates.push({
      candidate,
      rows: result.rows,
    });
  }

  if (foundCandidates.length === 0) {
    return {
      rows: [],
      sourceTable: null,
      warnings,
    };
  }

  foundCandidates.sort((a, b) => b.rows.length - a.rows.length);
  const winner = foundCandidates[0];

  const normalizedRows = winner.rows
    .map((row) => normalizeProductRow(row, winner.candidate, tenantId))
    .filter((row): row is ProductListItem => Boolean(row));

  return {
    rows: normalizedRows,
    sourceTable: winner.candidate.table,
    warnings,
  };
};

const tryLinkTable = async (
  link: LinkTableCandidate,
  tenantId: string,
  productIds: string[],
): Promise<Set<string>> => {
  const admin = getSupabaseAdminClient();
  const foundIds = new Set<string>();

  for (const productColumn of link.productColumns) {
    let query = admin
      .from(link.table)
      .select(productColumn)
      .in(productColumn, productIds)
      .limit(productIds.length * 3);

    for (const tenantColumn of link.tenantColumns) {
      query = query.eq(tenantColumn, tenantId);
    }

    let result = await query;

    if (result.error) {
      const message = result.error.message ?? "Unknown query error";
      const missingTenantColumn = link.tenantColumns.some((tenantColumn) =>
        looksLikeMissingColumn(message, tenantColumn),
      );
      if (missingTenantColumn) {
        result = await admin
          .from(link.table)
          .select(productColumn)
          .in(productColumn, productIds)
          .limit(productIds.length * 3);
      }
    }

    if (result.error) {
      const message = result.error.message ?? "Unknown query error";
      if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, productColumn)) {
        continue;
      }

      continue;
    }

    for (const row of (result.data ?? []) as RawRow[]) {
      const linkedId = parseString(row[productColumn]);
      if (linkedId) {
        foundIds.add(linkedId);
      }
    }
  }

  return foundIds;
};

const enrichCoverageByLinkTables = async (
  tenantId: string,
  products: ProductListItem[],
): Promise<ProductListItem[]> => {
  if (products.length === 0) {
    return products;
  }

  const productIds = products.map((product) => product.id);
  const dibaIds = await Promise.all(
    DIBA_LINK_TABLES.map((link) => tryLinkTable(link, tenantId, productIds)),
  );
  const cycleIds = await Promise.all(
    CYCLE_LINK_TABLES.map((link) => tryLinkTable(link, tenantId, productIds)),
  );
  const modelIds = await Promise.all(
    MODEL_LINK_TABLES.map((link) => tryLinkTable(link, tenantId, productIds)),
  );

  const dibaSet = new Set<string>(dibaIds.flatMap((set) => [...set]));
  const cycleSet = new Set<string>(cycleIds.flatMap((set) => [...set]));
  const modelSet = new Set<string>(modelIds.flatMap((set) => [...set]));

  return products.map((product) => ({
    ...product,
    coverage: {
      ...product.coverage,
      diba: product.coverage.diba || dibaSet.has(product.id),
      cycle: product.coverage.cycle || cycleSet.has(product.id),
      model: product.coverage.model || modelSet.has(product.id),
    },
  }));
};

const normalizeCoverageFilter = (value: string | undefined): CoverageFilter => {
  if (value === "yes" || value === "no") {
    return value;
  }
  return "all";
};

const matchesCoverageFilter = (value: boolean, filter: CoverageFilter) => {
  if (filter === "all") {
    return true;
  }
  return filter === "yes" ? value : !value;
};

const applyFilters = (products: ProductListItem[], filters: ProductCatalogFilters) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const selectedStatus = (filters.status ?? "all").trim().toLowerCase();
  const erpFilter = normalizeCoverageFilter(filters.erp);
  const dibaFilter = normalizeCoverageFilter(filters.diba);
  const cycleFilter = normalizeCoverageFilter(filters.cycle);
  const modelFilter = normalizeCoverageFilter(filters.model);

  return products.filter((product) => {
    if (query) {
      const haystack = `${product.code} ${product.name} ${product.status}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (selectedStatus !== "all" && product.status.toLowerCase() !== selectedStatus) {
      return false;
    }

    if (!matchesCoverageFilter(product.coverage.erp, erpFilter)) {
      return false;
    }
    if (!matchesCoverageFilter(product.coverage.diba, dibaFilter)) {
      return false;
    }
    if (!matchesCoverageFilter(product.coverage.cycle, cycleFilter)) {
      return false;
    }
    if (!matchesCoverageFilter(product.coverage.model, modelFilter)) {
      return false;
    }

    return true;
  });
};

const sortProducts = (products: ProductListItem[]) => {
  return [...products].sort((left, right) => {
    const byCode = left.code.localeCompare(right.code, "it");
    if (byCode !== 0) {
      return byCode;
    }
    return left.name.localeCompare(right.name, "it");
  });
};

const collectStatuses = (products: ProductListItem[]) => {
  return [...new Set(products.map((product) => product.status))].sort((a, b) =>
    a.localeCompare(b, "it"),
  );
};

export const getTenantProductCatalog = async (
  tenantId: string,
  filters: ProductCatalogFilters,
): Promise<ProductCatalogResult> => {
  if (!tenantId) {
    return {
      products: [],
      statuses: [],
      sourceTable: null,
      warnings: [],
      error: "Tenant non valido.",
    };
  }

  try {
    const snapshot = await buildProductSnapshot(tenantId, SAFE_LIST_LIMIT);
    if (!snapshot.sourceTable) {
      return {
        products: [],
        statuses: [],
        sourceTable: null,
        warnings: snapshot.warnings,
        error:
          "Nessuna tabella anagrafiche prodotto trovata nel DB esposto. Verifica naming/schema con baseline DB-00.",
      };
    }

    const enriched = await enrichCoverageByLinkTables(tenantId, snapshot.rows);
    const sorted = sortProducts(enriched);
    const filtered = applyFilters(sorted, filters);

    return {
      products: filtered,
      statuses: collectStatuses(sorted),
      sourceTable: snapshot.sourceTable,
      warnings: snapshot.warnings,
      error: null,
    };
  } catch (caughtError) {
    return {
      products: [],
      statuses: [],
      sourceTable: null,
      warnings: [],
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

export const getTenantProductById = async (tenantId: string, productId: string) => {
  if (!tenantId || !productId) {
    return {
      product: null as ProductListItem | null,
      sourceTable: null as string | null,
      warnings: [] as string[],
      error: "Parametri non validi.",
    };
  }

  try {
    const admin = getSupabaseAdminClient();
    const warnings: string[] = [];
    let sourceTable: string | null = null;

    for (const candidate of PRODUCT_TABLE_CANDIDATES) {
      let row: RawRow | null = null;
      let candidateExists = false;

      for (const idColumn of candidate.idColumns) {
        for (const tenantColumn of candidate.tenantColumns) {
          const { data, error } = await admin
            .from(candidate.table)
            .select("*")
            .eq(idColumn, productId)
            .eq(tenantColumn, tenantId)
            .limit(1);

          if (!error) {
            candidateExists = true;
            if (Array.isArray(data) && data.length > 0) {
              row = (data[0] ?? null) as RawRow | null;
            }
            if (row) {
              break;
            }
            continue;
          }

          const message = error.message ?? "Unknown query error";
          if (
            looksLikeMissingTable(message) ||
            looksLikeMissingColumn(message, idColumn) ||
            looksLikeMissingColumn(message, tenantColumn)
          ) {
            continue;
          }

          warnings.push(`Errore su ${candidate.table}: ${message}`);
          candidateExists = true;
        }

        if (row) {
          break;
        }
      }

      if (!candidateExists) {
        continue;
      }

      sourceTable = candidate.table;

      if (!row) {
        continue;
      }

      const normalized = normalizeProductRow(row, candidate, tenantId);
      if (!normalized) {
        return {
          product: null as ProductListItem | null,
          sourceTable,
          warnings,
          error: `Record non leggibile in ${candidate.table}.`,
        };
      }

      const [enriched] = await enrichCoverageByLinkTables(tenantId, [normalized]);
      return {
        product: enriched ?? normalized,
        sourceTable,
        warnings,
        error: null,
      };
    }

    return {
      product: null as ProductListItem | null,
      sourceTable,
      warnings,
      error: sourceTable
        ? null
        : "Nessuna tabella anagrafiche prodotto trovata nel DB esposto. Verifica naming/schema con baseline DB-00.",
    };
  } catch (caughtError) {
    return {
      product: null as ProductListItem | null,
      sourceTable: null as string | null,
      warnings: [] as string[],
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};
