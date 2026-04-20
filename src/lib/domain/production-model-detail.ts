import "server-only";

import {
  getTenantCycleById,
  getTenantCycleCatalog,
  type CycleListItem,
  type CycleProcessType,
} from "@/lib/domain/cycles";
import { getTenantDibaById, getTenantDibaCatalog, type DibaListItem } from "@/lib/domain/diba";
import { getTenantProductById } from "@/lib/domain/products";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RawRow = Record<string, unknown>;

type ReferenceSource = "model" | "product" | "diba" | "cycle" | "unknown";

export type ProductionModelDetailReference = {
  modelId?: string;
  productId?: string;
  dibaId?: string;
  cycleId?: string;
};

export type ModelLinkedProduct = {
  id: string;
  code: string | null;
  name: string | null;
  status: string | null;
};

export type ModelLinkedDiba = {
  id: string;
  code: string | null;
  name: string | null;
  status: string | null;
  versionLabel: string | null;
};

export type ModelCompatibleCycle = {
  id: string;
  code: string;
  name: string;
  status: string;
  versionLabel: string;
  phaseCount: number | null;
  processType: CycleProcessType;
  hasQuality: boolean | null;
};

export type ProductionModelHeader = {
  id: string;
  code: string;
  name: string;
  operationalStatus: string;
  completenessStatus: string;
  versionNo: number | null;
  versionLabel: string;
  cycleSelectionRule: string | null;
};

export type ProductionModelDetailResult = {
  model: ProductionModelHeader | null;
  linkedProduct: ModelLinkedProduct | null;
  defaultDiba: ModelLinkedDiba | null;
  compatibleCycles: ModelCompatibleCycle[];
  sourceTable: string | null;
  versionSourceTable: string | null;
  referenceSource: ReferenceSource;
  warnings: string[];
  error: string | null;
};

type QueryResult = {
  rows: RawRow[];
  exists: boolean;
  warning: string | null;
};

const SAFE_LIST_LIMIT = 2000;

const TENANT_COLUMNS = ["tenant_id", "default_tenant_id"];

const MODEL_ID_COLUMNS = ["id", "production_model_id", "model_id"];
const MODEL_CODE_COLUMNS = ["code", "model_code", "template_code"];
const MODEL_NAME_COLUMNS = ["name", "description", "title"];
const MODEL_STATUS_COLUMNS = ["status", "state", "lifecycle_status", "is_active"];
const MODEL_COMPLETENESS_COLUMNS = [
  "completeness_status",
  "completion_status",
  "readiness_status",
  "setup_status",
];
const MODEL_PRODUCT_COLUMNS = ["product_id", "item_id", "product_item_id"];
const MODEL_DEFAULT_DIBA_COLUMNS = [
  "default_bom_template_id",
  "default_diba_template_id",
  "default_bom_id",
  "default_diba_id",
  "default_bill_of_materials_id",
];
const MODEL_SELECTION_RULE_COLUMNS = [
  "cycle_selection_rule",
  "routing_selection_rule",
  "selection_rule",
  "selection_policy",
  "routing_rule",
  "dispatch_rule",
  "selection_policy_json",
  "rules_json",
  "policy_json",
];
const MODEL_CURRENT_VERSION_COLUMNS = ["current_version_no", "current_version"];

const VERSION_ID_COLUMNS = ["id", "production_model_version_id", "model_version_id"];
const VERSION_PARENT_COLUMNS = ["production_model_id", "model_id", "template_id"];
const VERSION_NO_COLUMNS = ["version_no", "revision_no", "version"];
const VERSION_STATUS_COLUMNS = ["status", "state", "lifecycle_status", "is_active"];
const VERSION_IS_CURRENT_COLUMNS = ["is_current", "current_flag"];
const VERSION_COMPLETENESS_COLUMNS = [
  "completeness_status",
  "completion_status",
  "readiness_status",
  "setup_status",
];
const VERSION_PRODUCT_COLUMNS = ["product_id", "item_id", "product_item_id"];
const VERSION_DEFAULT_DIBA_COLUMNS = [
  "default_bom_template_id",
  "default_diba_template_id",
  "default_bom_id",
  "default_diba_id",
  "default_bill_of_materials_id",
];
const VERSION_SELECTION_RULE_COLUMNS = [
  "cycle_selection_rule",
  "routing_selection_rule",
  "selection_rule",
  "selection_policy",
  "routing_rule",
  "dispatch_rule",
  "selection_policy_json",
  "rules_json",
  "policy_json",
];

const ROUTING_LINK_MODEL_VERSION_COLUMNS = ["production_model_version_id", "model_version_id"];
const ROUTING_LINK_TEMPLATE_COLUMNS = ["routing_template_id", "routing_id"];
const ROUTING_LINK_TEMPLATE_VERSION_COLUMNS = [
  "routing_template_version_id",
  "routing_version_id",
];
const ROUTING_VERSION_ID_COLUMNS = ["id", "routing_template_version_id", "routing_version_id"];
const ROUTING_VERSION_PARENT_COLUMNS = ["routing_template_id", "routing_id", "template_id"];

const PRODUCT_TABLE_CANDIDATES = ["products", "product_items", "items"];

const looksLikeMissingTable = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes("could not find the table") || normalized.includes("schema cache");
};

const looksLikeMissingColumn = (message: string, column: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("column") &&
    normalized.includes(column.toLowerCase()) &&
    normalized.includes("does not exist")
  );
};

const parseString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? `${value}` : null;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return null;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
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
    if (["true", "1", "yes", "y", "enabled", "active"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "disabled", "inactive"].includes(normalized)) {
      return false;
    }
  }
  return null;
};

const readFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return null;
};

const readStringFromKeys = (row: RawRow, keys: string[]) => parseString(readFromKeys(row, keys));

const readNumberFromKeys = (row: RawRow, keys: string[]) => parseNumber(readFromKeys(row, keys));

const readBooleanFromKeys = (row: RawRow, keys: string[]) =>
  parseBoolean(readFromKeys(row, keys));

const normalizeStatus = (row: RawRow, keys: string[]) => {
  const value = readFromKeys(row, keys);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "unknown";
  }
  if (typeof value === "boolean") {
    return value ? "active" : "inactive";
  }
  if (typeof value === "number") {
    return value > 0 ? "active" : "inactive";
  }
  return "unknown";
};

const toRuleText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
};

const pickRuleTextFromRow = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    if (Object.hasOwn(row, key)) {
      const value = toRuleText(row[key]);
      if (value) {
        return value;
      }
    }
  }
  return null;
};

const isTenantScopedRow = (row: RawRow, tenantId: string) => {
  const tenantFromRow = readStringFromKeys(row, TENANT_COLUMNS);
  if (!tenantFromRow) {
    return true;
  }
  return tenantFromRow === tenantId;
};

const queryTableRows = async (table: string, tenantId: string, limit = SAFE_LIST_LIMIT): Promise<QueryResult> => {
  const admin = getSupabaseAdminClient();

  const withTenant = await admin.from(table).select("*").eq("tenant_id", tenantId).limit(limit);
  if (!withTenant.error) {
    return {
      rows: (withTenant.data ?? []) as RawRow[],
      exists: true,
      warning: null,
    };
  }

  const withTenantMessage = withTenant.error.message ?? "Unknown query error";
  if (!looksLikeMissingColumn(withTenantMessage, "tenant_id")) {
    if (looksLikeMissingTable(withTenantMessage)) {
      return {
        rows: [],
        exists: false,
        warning: null,
      };
    }

    return {
      rows: [],
      exists: true,
      warning: `Errore su ${table}: ${withTenantMessage}`,
    };
  }

  const fallback = await admin.from(table).select("*").limit(limit);
  if (fallback.error) {
    const fallbackMessage = fallback.error.message ?? "Unknown query error";
    if (looksLikeMissingTable(fallbackMessage)) {
      return {
        rows: [],
        exists: false,
        warning: null,
      };
    }

    return {
      rows: [],
      exists: true,
      warning: `Errore su ${table}: ${fallbackMessage}`,
    };
  }

  const rows = ((fallback.data ?? []) as RawRow[]).filter((row) => isTenantScopedRow(row, tenantId));
  return {
    rows,
    exists: true,
    warning: null,
  };
};

const findRowById = (rows: RawRow[], idColumns: string[], id: string) => {
  return rows.find((row) => {
    const rowId = readStringFromKeys(row, idColumns);
    return rowId === id;
  }) ?? null;
};

const pickBestVersionRow = (rows: RawRow[]) => {
  if (rows.length === 0) {
    return null;
  }

  const current = rows.find((row) => readBooleanFromKeys(row, VERSION_IS_CURRENT_COLUMNS) === true);
  if (current) {
    return current;
  }

  const sorted = [...rows].sort((left, right) => {
    const leftVersion = readNumberFromKeys(left, VERSION_NO_COLUMNS) ?? -1;
    const rightVersion = readNumberFromKeys(right, VERSION_NO_COLUMNS) ?? -1;
    return rightVersion - leftVersion;
  });

  return sorted[0] ?? null;
};

const resolveModelIdFromProduct = async (tenantId: string, productId: string) => {
  const warnings: string[] = [];

  const models = await queryTableRows("production_models", tenantId);
  if (models.warning) {
    warnings.push(models.warning);
  }

  if (models.exists) {
    const linked = models.rows.find((row) => {
      const linkedProductId = readStringFromKeys(row, MODEL_PRODUCT_COLUMNS);
      return linkedProductId === productId;
    });

    if (linked) {
      const modelId = readStringFromKeys(linked, MODEL_ID_COLUMNS);
      if (modelId) {
        return {
          modelId,
          warnings,
        };
      }
    }
  }

  const versions = await queryTableRows("production_model_versions", tenantId);
  if (versions.warning) {
    warnings.push(versions.warning);
  }

  if (versions.exists) {
    const linkedVersions = versions.rows.filter((row) => {
      const linkedProductId = readStringFromKeys(row, VERSION_PRODUCT_COLUMNS);
      return linkedProductId === productId;
    });

    const picked = pickBestVersionRow(linkedVersions);
    if (picked) {
      const modelId = readStringFromKeys(picked, VERSION_PARENT_COLUMNS);
      if (modelId) {
        return {
          modelId,
          warnings,
        };
      }
    }
  }

  for (const table of PRODUCT_TABLE_CANDIDATES) {
    const query = await queryTableRows(table, tenantId);
    if (query.warning) {
      warnings.push(query.warning);
    }
    if (!query.exists) {
      continue;
    }

    const row = findRowById(query.rows, ["id", "product_id", "item_id", "product_item_id"], productId);
    if (!row) {
      continue;
    }

    const modelId = readStringFromKeys(row, ["production_model_id", "model_id"]);
    if (modelId) {
      return {
        modelId,
        warnings,
      };
    }
  }

  return {
    modelId: null as string | null,
    warnings,
  };
};

const resolveModelId = async (tenantId: string, reference: ProductionModelDetailReference) => {
  const warnings: string[] = [];

  if (reference.modelId) {
    return {
      modelId: reference.modelId,
      source: "model" as ReferenceSource,
      warnings,
    };
  }

  if (reference.dibaId) {
    const diba = await getTenantDibaById(tenantId, reference.dibaId);
    warnings.push(...diba.warnings);
    if (diba.error) {
      warnings.push(`DIBA lookup: ${diba.error}`);
    }
    if (diba.diba?.productionModelId) {
      return {
        modelId: diba.diba.productionModelId,
        source: "diba" as ReferenceSource,
        warnings,
      };
    }
  }

  if (reference.cycleId) {
    const cycle = await getTenantCycleById(tenantId, reference.cycleId);
    warnings.push(...cycle.warnings);
    if (cycle.error) {
      warnings.push(`Ciclo lookup: ${cycle.error}`);
    }
    if (cycle.cycle?.productionModelId) {
      return {
        modelId: cycle.cycle.productionModelId,
        source: "cycle" as ReferenceSource,
        warnings,
      };
    }
  }

  if (reference.productId) {
    const productResolution = await resolveModelIdFromProduct(tenantId, reference.productId);
    warnings.push(...productResolution.warnings);
    if (productResolution.modelId) {
      return {
        modelId: productResolution.modelId,
        source: "product" as ReferenceSource,
        warnings,
      };
    }
  }

  return {
    modelId: null as string | null,
    source: "unknown" as ReferenceSource,
    warnings,
  };
};

const resolveModelRow = async (tenantId: string, modelId: string) => {
  const warnings: string[] = [];

  const modelRows = await queryTableRows("production_models", tenantId);
  if (modelRows.warning) {
    warnings.push(modelRows.warning);
  }

  let modelRow: RawRow | null = null;
  let sourceTable: string | null = null;

  if (modelRows.exists) {
    modelRow = findRowById(modelRows.rows, MODEL_ID_COLUMNS, modelId);
    if (modelRow) {
      sourceTable = "production_models";
    }
  }

  const versionRowsQuery = await queryTableRows("production_model_versions", tenantId);
  if (versionRowsQuery.warning) {
    warnings.push(versionRowsQuery.warning);
  }

  let versionRow: RawRow | null = null;
  if (versionRowsQuery.exists) {
    const scopedVersionRows = versionRowsQuery.rows.filter((row) => {
      const parentId = readStringFromKeys(row, VERSION_PARENT_COLUMNS);
      return parentId === modelId;
    });
    versionRow = pickBestVersionRow(scopedVersionRows);
  }

  if (!modelRow && versionRow) {
    sourceTable = "production_model_versions";
  }

  return {
    modelRow,
    versionRow,
    sourceTable,
    versionSourceTable: versionRowsQuery.exists ? "production_model_versions" : null,
    warnings,
  };
};

const resolveLinkedProduct = async (
  tenantId: string,
  modelId: string,
  modelRow: RawRow | null,
  versionRow: RawRow | null,
  reference: ProductionModelDetailReference,
) => {
  const warnings: string[] = [];

  let productId =
    readStringFromKeys(versionRow ?? {}, VERSION_PRODUCT_COLUMNS) ??
    readStringFromKeys(modelRow ?? {}, MODEL_PRODUCT_COLUMNS) ??
    reference.productId ??
    null;

  if (!productId) {
    for (const table of PRODUCT_TABLE_CANDIDATES) {
      const query = await queryTableRows(table, tenantId);
      if (query.warning) {
        warnings.push(query.warning);
      }
      if (!query.exists) {
        continue;
      }

      const linkedRow = query.rows.find((row) => {
        const linkedModelId = readStringFromKeys(row, ["production_model_id", "model_id"]);
        return linkedModelId === modelId;
      });

      if (linkedRow) {
        productId = readStringFromKeys(linkedRow, ["id", "product_id", "item_id", "product_item_id"]);
        if (productId) {
          break;
        }
      }
    }
  }

  if (!productId) {
    return {
      product: null as ModelLinkedProduct | null,
      warnings,
    };
  }

  const productDetail = await getTenantProductById(tenantId, productId);
  warnings.push(...productDetail.warnings);
  if (productDetail.error) {
    warnings.push(`Articolo lookup: ${productDetail.error}`);
  }

  if (!productDetail.product) {
    return {
      product: {
        id: productId,
        code: null,
        name: null,
        status: null,
      } as ModelLinkedProduct,
      warnings,
    };
  }

  return {
    product: {
      id: productDetail.product.id,
      code: productDetail.product.code,
      name: productDetail.product.name,
      status: productDetail.product.status,
    } as ModelLinkedProduct,
    warnings,
  };
};

const pickDefaultDibaFromModel = (
  modelRow: RawRow | null,
  versionRow: RawRow | null,
  reference: ProductionModelDetailReference,
) => {
  return (
    readStringFromKeys(versionRow ?? {}, VERSION_DEFAULT_DIBA_COLUMNS) ??
    readStringFromKeys(modelRow ?? {}, MODEL_DEFAULT_DIBA_COLUMNS) ??
    reference.dibaId ??
    null
  );
};

const pickBestDefaultDiba = (items: DibaListItem[]) => {
  if (items.length === 0) {
    return null;
  }

  const withStatus = [...items].sort((left, right) => {
    const leftActive = left.status.toLowerCase().includes("active") ? 1 : 0;
    const rightActive = right.status.toLowerCase().includes("active") ? 1 : 0;
    if (leftActive !== rightActive) {
      return rightActive - leftActive;
    }

    const leftVersion = left.versionNo ?? -1;
    const rightVersion = right.versionNo ?? -1;
    if (leftVersion !== rightVersion) {
      return rightVersion - leftVersion;
    }

    return left.code.localeCompare(right.code, "it");
  });

  return withStatus[0] ?? null;
};

const resolveDefaultDiba = async (
  tenantId: string,
  modelId: string,
  modelRow: RawRow | null,
  versionRow: RawRow | null,
  reference: ProductionModelDetailReference,
) => {
  const warnings: string[] = [];

  let defaultDiba: DibaListItem | null = null;
  const explicitDibaId = pickDefaultDibaFromModel(modelRow, versionRow, reference);
  if (explicitDibaId) {
    const byId = await getTenantDibaById(tenantId, explicitDibaId);
    warnings.push(...byId.warnings);
    if (byId.error) {
      warnings.push(`Default DIBA lookup: ${byId.error}`);
    }
    defaultDiba = byId.diba;
  }

  if (!defaultDiba) {
    const catalog = await getTenantDibaCatalog(tenantId, { modelLink: "yes" });
    warnings.push(...catalog.warnings);
    if (catalog.error) {
      warnings.push(`DIBA catalog lookup: ${catalog.error}`);
    }

    const linked = catalog.dibas.filter((item) => item.productionModelId === modelId);
    defaultDiba = pickBestDefaultDiba(linked);
  }

  if (!defaultDiba) {
    return {
      diba: null as ModelLinkedDiba | null,
      warnings,
    };
  }

  return {
    diba: {
      id: defaultDiba.id,
      code: defaultDiba.code,
      name: defaultDiba.name,
      status: defaultDiba.status,
      versionLabel: defaultDiba.versionLabel,
    } as ModelLinkedDiba,
    warnings,
  };
};

const normalizeCompatibleCycles = (cycles: CycleListItem[]): ModelCompatibleCycle[] => {
  return [...cycles]
    .sort((left, right) => left.code.localeCompare(right.code, "it"))
    .map((cycle) => ({
      id: cycle.id,
      code: cycle.code,
      name: cycle.name,
      status: cycle.status,
      versionLabel: cycle.versionLabel,
      phaseCount: cycle.phaseCount,
      processType: cycle.processType,
      hasQuality: cycle.hasQuality,
    }));
};

const resolveCompatibleCycles = async (
  tenantId: string,
  modelId: string,
  versionRow: RawRow | null,
  reference: ProductionModelDetailReference,
) => {
  const warnings: string[] = [];
  const catalog = await getTenantCycleCatalog(tenantId, { modelLink: "yes" });
  warnings.push(...catalog.warnings);
  if (catalog.error) {
    warnings.push(`Ciclo catalog lookup: ${catalog.error}`);
  }

  let cycles = catalog.cycles.filter((cycle) => cycle.productionModelId === modelId);

  if (cycles.length === 0) {
    const modelVersionIds = new Set<string>();
    const directVersionId = readStringFromKeys(versionRow ?? {}, VERSION_ID_COLUMNS);
    if (directVersionId) {
      modelVersionIds.add(directVersionId);
    }

    if (modelVersionIds.size === 0) {
      const versions = await queryTableRows("production_model_versions", tenantId);
      if (versions.warning) {
        warnings.push(versions.warning);
      }
      if (versions.exists) {
        const relatedVersions = versions.rows.filter((row) => {
          const parentId = readStringFromKeys(row, VERSION_PARENT_COLUMNS);
          return parentId === modelId;
        });
        for (const row of relatedVersions) {
          const rowId = readStringFromKeys(row, VERSION_ID_COLUMNS);
          if (rowId) {
            modelVersionIds.add(rowId);
          }
        }
      }
    }

    if (modelVersionIds.size > 0) {
      const links = await queryTableRows("production_model_version_routing_links", tenantId);
      if (links.warning) {
        warnings.push(links.warning);
      }

      if (links.exists) {
        const routingTemplateIds = new Set<string>();
        const routingTemplateVersionIds = new Set<string>();

        for (const row of links.rows) {
          const linkedVersionId = readStringFromKeys(row, ROUTING_LINK_MODEL_VERSION_COLUMNS);
          if (!linkedVersionId || !modelVersionIds.has(linkedVersionId)) {
            continue;
          }

          const templateId = readStringFromKeys(row, ROUTING_LINK_TEMPLATE_COLUMNS);
          const templateVersionId = readStringFromKeys(row, ROUTING_LINK_TEMPLATE_VERSION_COLUMNS);

          if (templateId) {
            routingTemplateIds.add(templateId);
          }
          if (templateVersionId) {
            routingTemplateVersionIds.add(templateVersionId);
          }
        }

        if (routingTemplateIds.size === 0 && routingTemplateVersionIds.size > 0) {
          const routingVersions = await queryTableRows("routing_template_versions", tenantId);
          if (routingVersions.warning) {
            warnings.push(routingVersions.warning);
          }

          if (routingVersions.exists) {
            for (const row of routingVersions.rows) {
              const versionId = readStringFromKeys(row, ROUTING_VERSION_ID_COLUMNS);
              if (!versionId || !routingTemplateVersionIds.has(versionId)) {
                continue;
              }

              const parentTemplateId = readStringFromKeys(row, ROUTING_VERSION_PARENT_COLUMNS);
              if (parentTemplateId) {
                routingTemplateIds.add(parentTemplateId);
              }
            }
          }
        }

        if (routingTemplateIds.size > 0) {
          const linkedFromCatalog = catalog.cycles.filter((cycle) =>
            routingTemplateIds.has(cycle.id),
          );
          cycles = linkedFromCatalog;

          if (cycles.length === 0) {
            const byIdCycles: CycleListItem[] = [];
            for (const templateId of routingTemplateIds) {
              const cycleById = await getTenantCycleById(tenantId, templateId);
              warnings.push(...cycleById.warnings);
              if (cycleById.error) {
                warnings.push(`Ciclo by id lookup: ${cycleById.error}`);
              }
              if (cycleById.cycle) {
                byIdCycles.push(cycleById.cycle);
              }
            }
            cycles = byIdCycles;
          }
        }
      }
    }
  }

  if (cycles.length === 0 && reference.cycleId) {
    const singleCycle = await getTenantCycleById(tenantId, reference.cycleId);
    warnings.push(...singleCycle.warnings);
    if (singleCycle.error) {
      warnings.push(`Ciclo by id lookup: ${singleCycle.error}`);
    }
    if (singleCycle.cycle) {
      cycles = [singleCycle.cycle];
    }
  }

  return {
    cycles: normalizeCompatibleCycles(cycles),
    warnings,
  };
};

const deriveCompletenessStatus = (
  modelRow: RawRow | null,
  versionRow: RawRow | null,
  linkedProduct: ModelLinkedProduct | null,
  defaultDiba: ModelLinkedDiba | null,
  compatibleCycles: ModelCompatibleCycle[],
) => {
  const explicit =
    readStringFromKeys(versionRow ?? {}, VERSION_COMPLETENESS_COLUMNS) ??
    readStringFromKeys(modelRow ?? {}, MODEL_COMPLETENESS_COLUMNS);
  if (explicit) {
    return explicit;
  }

  let score = 0;
  if (linkedProduct) {
    score += 1;
  }
  if (defaultDiba) {
    score += 1;
  }
  if (compatibleCycles.length > 0) {
    score += 1;
  }

  if (score === 3) {
    return "completo";
  }
  if (score === 0) {
    return "da completare";
  }
  return "parziale";
};

const buildModelHeader = (
  modelId: string,
  modelRow: RawRow | null,
  versionRow: RawRow | null,
  linkedProduct: ModelLinkedProduct | null,
  defaultDiba: ModelLinkedDiba | null,
  compatibleCycles: ModelCompatibleCycle[],
): ProductionModelHeader => {
  const fallbackCode = modelId;
  const code =
    readStringFromKeys(modelRow ?? {}, MODEL_CODE_COLUMNS) ??
    readStringFromKeys(versionRow ?? {}, MODEL_CODE_COLUMNS) ??
    fallbackCode;

  const name =
    readStringFromKeys(modelRow ?? {}, MODEL_NAME_COLUMNS) ??
    readStringFromKeys(versionRow ?? {}, MODEL_NAME_COLUMNS) ??
    code;

  const versionNo =
    readNumberFromKeys(versionRow ?? {}, VERSION_NO_COLUMNS) ??
    readNumberFromKeys(modelRow ?? {}, MODEL_CURRENT_VERSION_COLUMNS);

  const operationalStatus =
    normalizeStatus(versionRow ?? {}, VERSION_STATUS_COLUMNS) !== "unknown"
      ? normalizeStatus(versionRow ?? {}, VERSION_STATUS_COLUMNS)
      : normalizeStatus(modelRow ?? {}, MODEL_STATUS_COLUMNS);

  const cycleSelectionRule =
    pickRuleTextFromRow(versionRow ?? {}, VERSION_SELECTION_RULE_COLUMNS) ??
    pickRuleTextFromRow(modelRow ?? {}, MODEL_SELECTION_RULE_COLUMNS);

  const completenessStatus = deriveCompletenessStatus(
    modelRow,
    versionRow,
    linkedProduct,
    defaultDiba,
    compatibleCycles,
  );

  return {
    id: modelId,
    code,
    name,
    operationalStatus,
    completenessStatus,
    versionNo,
    versionLabel: versionNo !== null ? `v${versionNo}` : "N/D",
    cycleSelectionRule,
  };
};

export const getTenantProductionModelDetail = async (
  tenantId: string,
  reference: ProductionModelDetailReference,
): Promise<ProductionModelDetailResult> => {
  if (!tenantId) {
    return {
      model: null,
      linkedProduct: null,
      defaultDiba: null,
      compatibleCycles: [],
      sourceTable: null,
      versionSourceTable: null,
      referenceSource: "unknown",
      warnings: [],
      error: "Tenant non valido.",
    };
  }

  try {
    const warnings: string[] = [];
    const resolvedReference = await resolveModelId(tenantId, reference);
    warnings.push(...resolvedReference.warnings);

    if (!resolvedReference.modelId) {
      return {
        model: null,
        linkedProduct: null,
        defaultDiba: null,
        compatibleCycles: [],
        sourceTable: null,
        versionSourceTable: null,
        referenceSource: resolvedReference.source,
        warnings,
        error: null,
      };
    }

    const modelData = await resolveModelRow(tenantId, resolvedReference.modelId);
    warnings.push(...modelData.warnings);

    const linkedProductData = await resolveLinkedProduct(
      tenantId,
      resolvedReference.modelId,
      modelData.modelRow,
      modelData.versionRow,
      reference,
    );
    warnings.push(...linkedProductData.warnings);

    const defaultDibaData = await resolveDefaultDiba(
      tenantId,
      resolvedReference.modelId,
      modelData.modelRow,
      modelData.versionRow,
      reference,
    );
    warnings.push(...defaultDibaData.warnings);

    const compatibleCyclesData = await resolveCompatibleCycles(
      tenantId,
      resolvedReference.modelId,
      modelData.versionRow,
      reference,
    );
    warnings.push(...compatibleCyclesData.warnings);

    const modelHeader = buildModelHeader(
      resolvedReference.modelId,
      modelData.modelRow,
      modelData.versionRow,
      linkedProductData.product,
      defaultDibaData.diba,
      compatibleCyclesData.cycles,
    );

    return {
      model: modelHeader,
      linkedProduct: linkedProductData.product,
      defaultDiba: defaultDibaData.diba,
      compatibleCycles: compatibleCyclesData.cycles,
      sourceTable: modelData.sourceTable,
      versionSourceTable: modelData.versionSourceTable,
      referenceSource: resolvedReference.source,
      warnings,
      error: null,
    };
  } catch (caughtError) {
    return {
      model: null,
      linkedProduct: null,
      defaultDiba: null,
      compatibleCycles: [],
      sourceTable: null,
      versionSourceTable: null,
      referenceSource: "unknown",
      warnings: [],
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};
