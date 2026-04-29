import "server-only";

import {
  CUSTOM_FIELD_OBJECT_TYPES,
  CUSTOM_FIELD_TARGET_LEVELS,
  type CustomFieldObjectType,
  type CustomFieldTargetLevel,
} from "@/lib/domain/custom-fields";
import {
  getTenantIntFieldBindingsCatalog,
  type IntFieldBindingDirectionMode,
  type IntFieldBindingSummary,
} from "@/lib/domain/custom-field-int-bindings";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RawRow = Record<string, unknown>;

type SourceTableCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  parentColumns?: string[];
};

const SAFE_LIST_LIMIT = 1;

const ERP_READ_DIRECTION_ALLOWLIST = new Set<IntFieldBindingDirectionMode>([
  "read",
  "bidirectional_candidate",
]);

const ERP_READ_SOURCE_SYSTEM_ALLOWLIST = new Set(["sap_b1"]);

const HEADER_TABLE_BY_OBJECT_TYPE: Record<CustomFieldObjectType, SourceTableCandidate> = {
  products: {
    table: "products",
    idColumns: ["id", "product_id", "item_id"],
    tenantColumns: ["tenant_id"],
  },
  projects: {
    table: "projects",
    idColumns: ["id", "project_id"],
    tenantColumns: ["tenant_id"],
  },
  production_orders: {
    table: "production_orders",
    idColumns: ["id", "production_order_id", "work_order_id"],
    tenantColumns: ["tenant_id"],
  },
  production_order_phases: {
    table: "production_order_phases",
    idColumns: ["id", "production_order_phase_id", "phase_id"],
    tenantColumns: ["tenant_id"],
  },
  bom_templates: {
    table: "bom_templates",
    idColumns: ["id", "bom_template_id"],
    tenantColumns: ["tenant_id"],
  },
  routing_templates: {
    table: "routing_templates",
    idColumns: ["id", "routing_template_id"],
    tenantColumns: ["tenant_id"],
  },
  production_models: {
    table: "production_models",
    idColumns: ["id", "production_model_id"],
    tenantColumns: ["tenant_id"],
  },
};

const LINE_CONTEXT_TABLES: Record<string, SourceTableCandidate> = {
  production_order_lines: {
    table: "production_order_lines",
    idColumns: ["id", "production_order_line_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["production_order_id", "order_id"],
  },
  production_order_phases: {
    table: "production_order_phases",
    idColumns: ["id", "production_order_phase_id", "phase_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["production_order_id", "order_id"],
  },
  production_order_phase_materials: {
    table: "production_order_phase_materials",
    idColumns: ["id", "production_order_phase_material_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["production_order_phase_id", "phase_id", "parent_phase_id"],
  },
  bom_template_version_lines: {
    table: "bom_template_version_lines",
    idColumns: ["id", "bom_template_version_line_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["bom_template_id", "template_id", "parent_template_id"],
  },
  routing_template_version_steps: {
    table: "routing_template_version_steps",
    idColumns: ["id", "routing_template_version_step_id", "step_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["routing_template_id", "template_id", "parent_template_id"],
  },
  production_model_version_routing_links: {
    table: "production_model_version_routing_links",
    idColumns: ["id", "production_model_version_routing_link_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["production_model_id", "model_id", "parent_model_id"],
  },
  project_parties: {
    table: "project_parties",
    idColumns: ["id", "project_party_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "parent_project_id"],
  },
};

const parseString = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return `${value}`;
  }
  return "";
};

const normalizeCode = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

const normalizeSourceSystemCode = (raw: string) => normalizeCode(raw);

const formatValueForDisplay = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return `${value}`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
};

const extractValueByIdentifier = (row: RawRow, identifier: string) => {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return {
      found: false,
      value: null as unknown,
      resolvedColumn: null as string | null,
    };
  }

  if (Object.prototype.hasOwnProperty.call(row, trimmed)) {
    return {
      found: true,
      value: row[trimmed],
      resolvedColumn: trimmed,
    };
  }

  const normalizedIdentifier = trimmed.toLowerCase();
  for (const key of Object.keys(row)) {
    if (key.toLowerCase() === normalizedIdentifier) {
      return {
        found: true,
        value: row[key],
        resolvedColumn: key,
      };
    }
  }

  return {
    found: false,
    value: null as unknown,
    resolvedColumn: null as string | null,
  };
};

const parseErrorMessage = (error: unknown) => {
  const fallback = "Unknown query error";
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const message = parseString((error as { message?: string }).message);
  const details = parseString((error as { details?: string }).details);
  const hint = parseString((error as { hint?: string }).hint);

  return [message, details, hint].filter(Boolean).join(" | ") || fallback;
};

const resolveLineContextCandidate = (lineContextType: string) => {
  const key = normalizeCode(lineContextType);
  return LINE_CONTEXT_TABLES[key] ?? null;
};

type LoadedSourceRow = {
  row: RawRow | null;
  warnings: string[];
};

const loadSourceRow = async (
  tenantId: string,
  candidate: SourceTableCandidate,
  recordId: string,
  parentRecordId?: string,
): Promise<LoadedSourceRow> => {
  const admin = getSupabaseAdminClient();
  const warnings: string[] = [];

  const parentColumns =
    parentRecordId && candidate.parentColumns && candidate.parentColumns.length > 0
      ? candidate.parentColumns
      : [null];

  for (const tenantColumn of candidate.tenantColumns) {
    for (const idColumn of candidate.idColumns) {
      for (const parentColumn of parentColumns) {
        let query = admin
          .from(candidate.table)
          .select("*")
          .eq(tenantColumn, tenantId)
          .eq(idColumn, recordId)
          .limit(SAFE_LIST_LIMIT);

        if (parentColumn && parentRecordId) {
          query = query.eq(parentColumn, parentRecordId);
        }

        const result = await query;
        if (result.error) {
          warnings.push(
            `Errore query ${candidate.table}.${idColumn} (tenant ${tenantColumn}${
              parentColumn ? `, parent ${parentColumn}` : ""
            }): ${parseErrorMessage(result.error)}`,
          );
          continue;
        }

        const row = ((result.data ?? [])[0] ?? null) as RawRow | null;
        if (row) {
          return { row, warnings };
        }
      }
    }
  }

  if (parentRecordId) {
    for (const tenantColumn of candidate.tenantColumns) {
      for (const idColumn of candidate.idColumns) {
        const fallback = await admin
          .from(candidate.table)
          .select("*")
          .eq(tenantColumn, tenantId)
          .eq(idColumn, recordId)
          .limit(SAFE_LIST_LIMIT);

        if (fallback.error) {
          warnings.push(
            `Errore fallback ${candidate.table}.${idColumn} (tenant ${tenantColumn}): ${parseErrorMessage(
              fallback.error,
            )}`,
          );
          continue;
        }

        const row = ((fallback.data ?? [])[0] ?? null) as RawRow | null;
        if (row) {
          return { row, warnings };
        }
      }
    }
  }

  return {
    row: null,
    warnings,
  };
};

export type CustomFieldErpReadInput = {
  objectTypeCode: CustomFieldObjectType;
  targetLevel: CustomFieldTargetLevel;
  targetRecordId: string;
  targetLineRecordId?: string;
  customFieldDefinitionId?: string;
  sourceSystemCode?: string;
};

export type CustomFieldErpReadItem = {
  bindingId: string;
  customFieldDefinitionId: string;
  customFieldCode: string | null;
  customFieldLabel: string | null;
  objectTypeCode: string;
  targetLevel: CustomFieldTargetLevel;
  lineContextType: string | null;
  sourceSystemCode: string;
  directionMode: IntFieldBindingDirectionMode;
  status: string;
  externalFieldIdentifier: string;
  sourceTable: string;
  sourceRecordId: string;
  sourceColumn: string | null;
  sourceValue: string | null;
  sourceValueRaw: unknown;
  sourceValueFound: boolean;
};

export type CustomFieldErpReadResult = {
  values: CustomFieldErpReadItem[];
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

const isAllowedSourceSystem = (sourceSystemCode: string) =>
  ERP_READ_SOURCE_SYSTEM_ALLOWLIST.has(normalizeSourceSystemCode(sourceSystemCode));

const isReadableDirectionMode = (directionMode: IntFieldBindingDirectionMode) =>
  ERP_READ_DIRECTION_ALLOWLIST.has(directionMode);

const filterReadableBindings = (
  bindings: IntFieldBindingSummary[],
  input: CustomFieldErpReadInput,
) => {
  const requestedSourceSystem = normalizeSourceSystemCode(
    parseString(input.sourceSystemCode),
  );
  const requestedDefinitionId = parseString(input.customFieldDefinitionId);

  return bindings.filter((binding) => {
    if (binding.objectTypeCode !== input.objectTypeCode) {
      return false;
    }
    if (binding.targetLevel !== input.targetLevel) {
      return false;
    }
    if (binding.status !== "active") {
      return false;
    }
    if (!binding.isEnabled) {
      return false;
    }
    if (!isReadableDirectionMode(binding.directionMode)) {
      return false;
    }
    if (!isAllowedSourceSystem(binding.sourceSystemCode)) {
      return false;
    }
    if (
      requestedSourceSystem &&
      normalizeSourceSystemCode(binding.sourceSystemCode) !== requestedSourceSystem
    ) {
      return false;
    }
    if (requestedDefinitionId && binding.customFieldDefinitionId !== requestedDefinitionId) {
      return false;
    }
    return true;
  });
};

const buildRowCacheKey = (
  tenantId: string,
  candidate: SourceTableCandidate,
  recordId: string,
  parentRecordId?: string,
) =>
  [
    tenantId,
    candidate.table,
    candidate.idColumns.join("|"),
    candidate.tenantColumns.join("|"),
    recordId,
    parentRecordId ?? "",
    (candidate.parentColumns ?? []).join("|"),
  ].join("::");

const resolveCandidateForBinding = (
  binding: IntFieldBindingSummary,
): SourceTableCandidate | null => {
  if (binding.targetLevel === "header") {
    return HEADER_TABLE_BY_OBJECT_TYPE[binding.objectTypeCode as CustomFieldObjectType] ?? null;
  }

  const lineContextType = parseString(binding.lineContextType);
  if (!lineContextType) {
    return null;
  }

  return resolveLineContextCandidate(lineContextType);
};

export const getTenantCustomFieldErpReadPreview = async (
  tenantId: string,
  input: CustomFieldErpReadInput,
): Promise<CustomFieldErpReadResult> => {
  if (!tenantId) {
    return {
      values: [],
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Tenant non valido.",
    };
  }

  const objectType = parseString(input.objectTypeCode);
  const targetLevel = parseString(input.targetLevel);
  const targetRecordId = parseString(input.targetRecordId);
  const targetLineRecordId = parseString(input.targetLineRecordId);

  if (
    !CUSTOM_FIELD_OBJECT_TYPES.includes(objectType as CustomFieldObjectType) ||
    !CUSTOM_FIELD_TARGET_LEVELS.includes(targetLevel as CustomFieldTargetLevel) ||
    !targetRecordId
  ) {
    return {
      values: [],
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error:
        "Parametri non validi: object_type_code / target_level / target_record_id obbligatori.",
    };
  }

  if (targetLevel === "line" && !targetLineRecordId) {
    return {
      values: [],
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "target_line_record_id obbligatorio quando target_level = line.",
    };
  }

  const bindingsCatalog = await getTenantIntFieldBindingsCatalog(tenantId);
  if (bindingsCatalog.error) {
    return {
      values: [],
      sourceTables: bindingsCatalog.sourceTables,
      warnings: bindingsCatalog.warnings,
      emptyStateHint: null,
      error: bindingsCatalog.error,
    };
  }

  const bindings = filterReadableBindings(bindingsCatalog.bindings, {
    ...input,
    objectTypeCode: objectType as CustomFieldObjectType,
    targetLevel: targetLevel as CustomFieldTargetLevel,
  });

  if (bindings.length === 0) {
    return {
      values: [],
      sourceTables: bindingsCatalog.sourceTables,
      warnings: bindingsCatalog.warnings,
      emptyStateHint:
        "Nessun binding tecnico attivo/read disponibile per i filtri selezionati.",
      error: null,
    };
  }

  const rowCache = new Map<string, Promise<LoadedSourceRow>>();
  const sourceTables = new Set<string>();
  const warnings = [...bindingsCatalog.warnings];

  const values: CustomFieldErpReadItem[] = [];

  for (const binding of bindings) {
    const candidate = resolveCandidateForBinding(binding);
    if (!candidate) {
      warnings.push(
        `Binding ${binding.code}: line_context_type non supportato (${binding.lineContextType ?? "n/d"}).`,
      );
      values.push({
        bindingId: binding.id,
        customFieldDefinitionId: binding.customFieldDefinitionId,
        customFieldCode: binding.customFieldCode,
        customFieldLabel: binding.customFieldLabel,
        objectTypeCode: binding.objectTypeCode,
        targetLevel: binding.targetLevel,
        lineContextType: binding.lineContextType,
        sourceSystemCode: binding.sourceSystemCode,
        directionMode: binding.directionMode,
        status: binding.status,
        externalFieldIdentifier: binding.erpFieldName,
        sourceTable: "n/d",
        sourceRecordId: "n/d",
        sourceColumn: null,
        sourceValue: null,
        sourceValueRaw: null,
        sourceValueFound: false,
      });
      continue;
    }

    sourceTables.add(candidate.table);
    const recordId = binding.targetLevel === "line" ? targetLineRecordId : targetRecordId;
    const parentRecordId = binding.targetLevel === "line" ? targetRecordId : undefined;

    const cacheKey = buildRowCacheKey(tenantId, candidate, recordId, parentRecordId);
    if (!rowCache.has(cacheKey)) {
      rowCache.set(cacheKey, loadSourceRow(tenantId, candidate, recordId, parentRecordId));
    }

    const loaded = await rowCache.get(cacheKey)!;
    warnings.push(...loaded.warnings);

    if (!loaded.row) {
      values.push({
        bindingId: binding.id,
        customFieldDefinitionId: binding.customFieldDefinitionId,
        customFieldCode: binding.customFieldCode,
        customFieldLabel: binding.customFieldLabel,
        objectTypeCode: binding.objectTypeCode,
        targetLevel: binding.targetLevel,
        lineContextType: binding.lineContextType,
        sourceSystemCode: binding.sourceSystemCode,
        directionMode: binding.directionMode,
        status: binding.status,
        externalFieldIdentifier: binding.erpFieldName,
        sourceTable: candidate.table,
        sourceRecordId: recordId,
        sourceColumn: null,
        sourceValue: null,
        sourceValueRaw: null,
        sourceValueFound: false,
      });
      continue;
    }

    const extracted = extractValueByIdentifier(loaded.row, binding.erpFieldName);

    values.push({
      bindingId: binding.id,
      customFieldDefinitionId: binding.customFieldDefinitionId,
      customFieldCode: binding.customFieldCode,
      customFieldLabel: binding.customFieldLabel,
      objectTypeCode: binding.objectTypeCode,
      targetLevel: binding.targetLevel,
      lineContextType: binding.lineContextType,
      sourceSystemCode: binding.sourceSystemCode,
      directionMode: binding.directionMode,
      status: binding.status,
      externalFieldIdentifier: binding.erpFieldName,
      sourceTable: candidate.table,
      sourceRecordId: recordId,
      sourceColumn: extracted.resolvedColumn,
      sourceValue: extracted.found ? formatValueForDisplay(extracted.value) : null,
      sourceValueRaw: extracted.found ? extracted.value : null,
      sourceValueFound: extracted.found,
    });
  }

  return {
    values,
    sourceTables: [...sourceTables].sort((a, b) => a.localeCompare(b, "it")),
    warnings: [...new Set(warnings.filter(Boolean))],
    emptyStateHint:
      values.length === 0
        ? "Nessun valore ERP letto per i binding selezionati."
        : null,
    error: null,
  };
};
