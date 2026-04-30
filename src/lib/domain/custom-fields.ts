import "server-only";

import { randomUUID } from "node:crypto";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RawRow = Record<string, unknown>;

const SAFE_LIST_LIMIT = 2000;

const TABLES = {
  definitions: "cfg_custom_field_definitions",
  versions: "cfg_custom_field_definition_versions",
  bindings: "cfg_custom_field_version_bindings",
  values: "custom_field_values",
  valueEvents: "custom_field_value_events",
} as const;

export const CUSTOM_FIELD_V1_TYPES = [
  "text_short",
  "text_medium",
  "integer",
  "decimal",
  "boolean",
  "date",
  "single_select_enum",
] as const;

export type CustomFieldV1Type = (typeof CUSTOM_FIELD_V1_TYPES)[number];

const FIELD_TYPE_TO_DB: Record<CustomFieldV1Type, string> = {
  text_short: "text",
  text_medium: "long_text",
  integer: "number",
  decimal: "decimal",
  boolean: "boolean",
  date: "date",
  single_select_enum: "select_single",
};

const DB_TO_FIELD_TYPE: Record<string, CustomFieldV1Type> = {
  text: "text_short",
  long_text: "text_medium",
  number: "integer",
  decimal: "decimal",
  boolean: "boolean",
  date: "date",
  select_single: "single_select_enum",
};

export const CUSTOM_FIELD_TARGET_LEVELS = ["header", "line"] as const;
export type CustomFieldTargetLevel = (typeof CUSTOM_FIELD_TARGET_LEVELS)[number];

export const CUSTOM_FIELD_OBJECT_TYPES = [
  "products",
  "projects",
  "production_orders",
  "production_order_phases",
  "bom_templates",
  "routing_templates",
  "production_models",
] as const;

export type CustomFieldObjectType = (typeof CUSTOM_FIELD_OBJECT_TYPES)[number];

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
    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }
  return null;
};

const readBoolean = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = parseBoolean(row[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
};

const readNumber = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = parseNumber(row[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
};

const looksLikeMissingTable = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes("could not find the table") || normalized.includes("schema cache");
};

const normalizeDateValue = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
};

const normalizeCode = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

const nowIso = () => new Date().toISOString();

const normalizeFieldType = (value: string): CustomFieldV1Type | null =>
  CUSTOM_FIELD_V1_TYPES.includes(value as CustomFieldV1Type)
    ? (value as CustomFieldV1Type)
    : null;

const normalizeTargetLevel = (value: string): CustomFieldTargetLevel | null =>
  CUSTOM_FIELD_TARGET_LEVELS.includes(value as CustomFieldTargetLevel)
    ? (value as CustomFieldTargetLevel)
    : null;

const normalizeObjectType = (value: string): CustomFieldObjectType | null =>
  CUSTOM_FIELD_OBJECT_TYPES.includes(value as CustomFieldObjectType)
    ? (value as CustomFieldObjectType)
    : null;

const asJsonRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export type CustomFieldBindingSummary = {
  id: string;
  objectTypeCode: string;
  screenCode: string;
  sectionCode: string;
  targetLevel: CustomFieldTargetLevel;
  lineContextType: string | null;
  sortOrder: number;
  visibilityMode: string;
  editabilityMode: string;
  requirednessMode: string;
  bindingStatus: string;
};

export type CustomFieldDefinitionSummary = {
  definitionId: string;
  code: string;
  status: string;
  fieldDomainCode: string;
  createdAt: string | null;
  updatedAt: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  versionId: string;
  versionNo: number;
  fieldKey: string;
  label: string;
  description: string | null;
  fieldType: CustomFieldV1Type;
  targetLevel: CustomFieldTargetLevel;
  isRequired: boolean;
  isReadOnly: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isReportable: boolean;
  isDefaultVisible: boolean;
  defaultValue: string | null;
  enumOptions: string[];
  bindings: CustomFieldBindingSummary[];
};

export type CustomFieldCatalogResult = {
  definitions: CustomFieldDefinitionSummary[];
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

type ValueColumnBundle = {
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  valueJson: Record<string, unknown> | null;
  valueSearchText: string | null;
  typedValue: string | number | boolean | null;
};

const normalizeTypedValue = (
  fieldType: CustomFieldV1Type,
  rawValue: string,
  enumOptions: string[],
): ValueColumnBundle => {
  const trimmed = rawValue.trim();
  const emptyBundle: ValueColumnBundle = {
    valueText: null,
    valueNumber: null,
    valueBoolean: null,
    valueDate: null,
    valueJson: null,
    valueSearchText: null,
    typedValue: null,
  };

  if (!trimmed) {
    return emptyBundle;
  }

  if (fieldType === "text_short" || fieldType === "text_medium") {
    return {
      ...emptyBundle,
      valueText: trimmed,
      valueSearchText: trimmed.toLowerCase(),
      typedValue: trimmed,
    };
  }

  if (fieldType === "single_select_enum") {
    if (enumOptions.length > 0 && !enumOptions.includes(trimmed)) {
      throw new Error(`Valore "${trimmed}" non presente nelle opzioni enum del campo.`);
    }
    return {
      ...emptyBundle,
      valueText: trimmed,
      valueSearchText: trimmed.toLowerCase(),
      typedValue: trimmed,
    };
  }

  if (fieldType === "integer") {
    const numeric = parseNumber(trimmed);
    if (numeric === null || !Number.isInteger(numeric)) {
      throw new Error(`Valore "${trimmed}" non valido per tipo integer.`);
    }
    return {
      ...emptyBundle,
      valueNumber: numeric,
      valueSearchText: `${numeric}`,
      typedValue: numeric,
    };
  }

  if (fieldType === "decimal") {
    const numeric = parseNumber(trimmed);
    if (numeric === null) {
      throw new Error(`Valore "${trimmed}" non valido per tipo decimal.`);
    }
    return {
      ...emptyBundle,
      valueNumber: numeric,
      valueSearchText: `${numeric}`,
      typedValue: numeric,
    };
  }

  if (fieldType === "boolean") {
    const booleanValue = parseBoolean(trimmed);
    if (booleanValue === null) {
      throw new Error(`Valore "${trimmed}" non valido per tipo boolean.`);
    }
    return {
      ...emptyBundle,
      valueBoolean: booleanValue,
      valueSearchText: booleanValue ? "true" : "false",
      typedValue: booleanValue,
    };
  }

  const dateValue = normalizeDateValue(trimmed);
  if (!dateValue) {
    throw new Error(`Valore "${trimmed}" non valido per tipo date.`);
  }
  return {
    ...emptyBundle,
    valueDate: dateValue,
    valueSearchText: dateValue,
    typedValue: dateValue,
  };
};

const extractEnumOptions = (row: RawRow) => {
  const raw = row.default_value_json;
  if (Array.isArray(raw)) {
    return raw.map((value) => parseString(value)).filter(Boolean);
  }

  const json = asJsonRecord(raw);
  if (Array.isArray(json.options)) {
    return json.options.map((value) => parseString(value)).filter(Boolean);
  }
  if (typeof json.options_csv === "string") {
    return json.options_csv
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
};

const extractDefaultValue = (row: RawRow) => {
  const raw = row.default_value_json;
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw === "string") {
    const normalized = raw.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return `${raw}`;
  }

  if (typeof raw === "boolean") {
    return raw ? "true" : "false";
  }

  const json = asJsonRecord(raw);
  const candidates = [json.default, json.default_value, json.value];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const normalized = candidate.trim();
      if (normalized.length > 0) {
        return normalized;
      }
      continue;
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return `${candidate}`;
    }
    if (typeof candidate === "boolean") {
      return candidate ? "true" : "false";
    }
  }

  return null;
};

const toTypedValue = (valueRow: RawRow, fieldType: CustomFieldV1Type) => {
  if (fieldType === "text_short" || fieldType === "text_medium" || fieldType === "single_select_enum") {
    return parseString(valueRow.value_text) || null;
  }
  if (fieldType === "integer" || fieldType === "decimal") {
    return readNumber(valueRow, ["value_number"]);
  }
  if (fieldType === "boolean") {
    return readBoolean(valueRow, ["value_boolean"]);
  }
  return parseString(valueRow.value_date) || null;
};

const toEventValueSnapshot = (valueRow: RawRow) => ({
  value_text: valueRow.value_text ?? null,
  value_number: valueRow.value_number ?? null,
  value_boolean: valueRow.value_boolean ?? null,
  value_date: valueRow.value_date ?? null,
  value_json: valueRow.value_json ?? null,
  value_search_text: valueRow.value_search_text ?? null,
  value_source_type: valueRow.value_source_type ?? null,
});

const dedupeWarnings = (warnings: string[]) => [...new Set(warnings.filter(Boolean))];

const loadTenantDefinitions = async (tenantId: string) => {
  const admin = getSupabaseAdminClient();
  const warnings: string[] = [];

  const definitionsResult = await admin
    .from(TABLES.definitions)
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(SAFE_LIST_LIMIT);

  if (definitionsResult.error) {
    const message = definitionsResult.error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message)) {
      return {
        definitions: [] as RawRow[],
        versions: [] as RawRow[],
        bindings: [] as RawRow[],
        warnings,
        error:
          "Tabelle custom fields non presenti nel DB esposto. Applica la baseline DB-CF-01 prima della validazione.",
      };
    }
    return {
      definitions: [] as RawRow[],
      versions: [] as RawRow[],
      bindings: [] as RawRow[],
      warnings,
      error: `Errore su ${TABLES.definitions}: ${message}`,
    };
  }

  const definitions = (definitionsResult.data ?? []) as RawRow[];
  if (definitions.length === 0) {
    return {
      definitions,
      versions: [] as RawRow[],
      bindings: [] as RawRow[],
      warnings,
      error: null,
    };
  }

  const definitionIds = definitions
    .map((row) => parseString(row.id))
    .filter((value) => value.length > 0);

  const versionsResult = await admin
    .from(TABLES.versions)
    .select("*")
    .eq("tenant_id", tenantId)
    .in("custom_field_definition_id", definitionIds)
    .order("version_no", { ascending: false })
    .limit(SAFE_LIST_LIMIT);

  if (versionsResult.error) {
    warnings.push(`Errore su ${TABLES.versions}: ${versionsResult.error.message ?? "Unknown query error"}`);
    return {
      definitions,
      versions: [] as RawRow[],
      bindings: [] as RawRow[],
      warnings,
      error: null,
    };
  }

  const versions = (versionsResult.data ?? []) as RawRow[];
  const versionIds = versions
    .map((row) => parseString(row.id))
    .filter((value) => value.length > 0);

  if (versionIds.length === 0) {
    return {
      definitions,
      versions,
      bindings: [] as RawRow[],
      warnings,
      error: null,
    };
  }

  const bindingsResult = await admin
    .from(TABLES.bindings)
    .select("*")
    .eq("tenant_id", tenantId)
    .in("custom_field_definition_version_id", versionIds)
    .order("sort_order", { ascending: true })
    .limit(SAFE_LIST_LIMIT);

  if (bindingsResult.error) {
    warnings.push(`Errore su ${TABLES.bindings}: ${bindingsResult.error.message ?? "Unknown query error"}`);
    return {
      definitions,
      versions,
      bindings: [] as RawRow[],
      warnings,
      error: null,
    };
  }

  return {
    definitions,
    versions,
    bindings: (bindingsResult.data ?? []) as RawRow[],
    warnings,
    error: null,
  };
};

const pickVersionByDefinitionId = (versions: RawRow[]) => {
  const byDefinition = new Map<string, RawRow[]>();
  versions.forEach((version) => {
    const definitionId = parseString(version.custom_field_definition_id);
    if (!definitionId) {
      return;
    }
    const current = byDefinition.get(definitionId) ?? [];
    current.push(version);
    byDefinition.set(definitionId, current);
  });

  const picked = new Map<string, RawRow>();
  byDefinition.forEach((versionRows, definitionId) => {
    const explicitCurrent = versionRows.find((row) => readBoolean(row, ["is_current"]) === true);
    if (explicitCurrent) {
      picked.set(definitionId, explicitCurrent);
      return;
    }

    const sorted = [...versionRows].sort(
      (left, right) => (readNumber(right, ["version_no"]) ?? 0) - (readNumber(left, ["version_no"]) ?? 0),
    );
    if (sorted[0]) {
      picked.set(definitionId, sorted[0]);
    }
  });

  return picked;
};

const mapBinding = (row: RawRow): CustomFieldBindingSummary | null => {
  const id = parseString(row.id);
  const targetLevel = normalizeTargetLevel(parseString(row.target_level));
  if (!id || !targetLevel) {
    return null;
  }

  return {
    id,
    objectTypeCode: parseString(row.object_type_code) || "unknown",
    screenCode: parseString(row.screen_code) || "unknown",
    sectionCode: parseString(row.section_code) || "general",
    targetLevel,
    lineContextType: parseString(row.line_context_type) || null,
    sortOrder: readNumber(row, ["sort_order"]) ?? 100,
    visibilityMode: parseString(row.visibility_mode) || "visible",
    editabilityMode: parseString(row.editability_mode) || "editable",
    requirednessMode: parseString(row.requiredness_mode) || "optional",
    bindingStatus: parseString(row.binding_status) || "active",
  };
};

export const getTenantCustomFieldCatalog = async (
  tenantId: string,
): Promise<CustomFieldCatalogResult> => {
  if (!tenantId) {
    return {
      definitions: [],
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Tenant non valido.",
    };
  }

  try {
    const loaded = await loadTenantDefinitions(tenantId);
    if (loaded.error) {
      return {
        definitions: [],
        sourceTables: [TABLES.definitions],
        warnings: loaded.warnings,
        emptyStateHint: null,
        error: loaded.error,
      };
    }

    if (loaded.definitions.length === 0) {
      return {
        definitions: [],
        sourceTables: [TABLES.definitions, TABLES.versions, TABLES.bindings],
        warnings: dedupeWarnings(loaded.warnings),
        emptyStateHint:
          "Nessuna definizione custom field disponibile per il tenant selezionato.",
        error: null,
      };
    }

    const versionByDefinitionId = pickVersionByDefinitionId(loaded.versions);
    const bindingsByVersionId = new Map<string, CustomFieldBindingSummary[]>();
    loaded.bindings.forEach((bindingRow) => {
      const versionId = parseString(bindingRow.custom_field_definition_version_id);
      const mapped = mapBinding(bindingRow);
      if (!versionId || !mapped) {
        return;
      }
      const current = bindingsByVersionId.get(versionId) ?? [];
      current.push(mapped);
      bindingsByVersionId.set(versionId, current);
    });

    const definitions = loaded.definitions
      .map((definitionRow) => {
        const definitionId = parseString(definitionRow.id);
        if (!definitionId) {
          return null;
        }

        const versionRow = versionByDefinitionId.get(definitionId);
        if (!versionRow) {
          return null;
        }

        const versionId = parseString(versionRow.id);
        const fieldType = DB_TO_FIELD_TYPE[parseString(versionRow.field_type)] ?? null;
        const targetLevel = normalizeTargetLevel(parseString(versionRow.target_level));
        if (!versionId || !fieldType || !targetLevel) {
          return null;
        }

        return {
          definitionId,
          code: parseString(definitionRow.code) || definitionId,
          status: parseString(definitionRow.status) || "active",
          fieldDomainCode: parseString(definitionRow.field_domain_code) || "general",
          createdAt: parseString(definitionRow.created_at) || null,
          updatedAt: parseString(definitionRow.updated_at) || null,
          createdByUserId: parseString(definitionRow.created_by_user_id) || null,
          updatedByUserId: parseString(definitionRow.updated_by_user_id) || null,
          versionId,
          versionNo: readNumber(versionRow, ["version_no"]) ?? 1,
          fieldKey: parseString(versionRow.field_key) || parseString(definitionRow.code),
          label: parseString(versionRow.label) || parseString(definitionRow.code),
          description: parseString(versionRow.description) || null,
          fieldType,
          targetLevel,
          isRequired: readBoolean(versionRow, ["is_required"]) ?? false,
          isReadOnly: readBoolean(versionRow, ["is_read_only"]) ?? false,
          isFilterable: readBoolean(versionRow, ["is_filterable"]) ?? false,
          isSearchable: readBoolean(versionRow, ["is_searchable"]) ?? false,
          isReportable: readBoolean(versionRow, ["is_reportable"]) ?? false,
          isDefaultVisible: readBoolean(versionRow, ["is_default_visible"]) ?? true,
          defaultValue: extractDefaultValue(versionRow),
          enumOptions: extractEnumOptions(versionRow),
          bindings: bindingsByVersionId.get(versionId) ?? [],
        } satisfies CustomFieldDefinitionSummary;
      })
      .filter((item): item is CustomFieldDefinitionSummary => Boolean(item))
      .sort((left, right) => left.code.localeCompare(right.code, "it"));

    return {
      definitions,
      sourceTables: [TABLES.definitions, TABLES.versions, TABLES.bindings],
      warnings: dedupeWarnings(loaded.warnings),
      emptyStateHint: definitions.length === 0 ? "Definizioni presenti ma non risolte." : null,
      error: null,
    };
  } catch (caughtError) {
    return {
      definitions: [],
      sourceTables: [TABLES.definitions, TABLES.versions, TABLES.bindings],
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

export type CreateCustomFieldDefinitionInput = {
  code: string;
  label: string;
  description?: string;
  fieldType: CustomFieldV1Type;
  targetLevel: CustomFieldTargetLevel;
  objectTypeCode: CustomFieldObjectType;
  screenCode: string;
  sectionCode: string;
  lineContextType?: string;
  fieldDomainCode?: string;
  isRequired?: boolean;
  isReadOnly?: boolean;
  isFilterable?: boolean;
  isSearchable?: boolean;
  isReportable?: boolean;
  isDefaultVisible?: boolean;
  visibilityMode?: "visible" | "hidden";
  editabilityMode?: "editable" | "read_only";
  requirednessMode?: "optional" | "required";
  enumOptions?: string[];
  defaultValue?: string;
  sortOrder?: number;
};

export type CreateCustomFieldDefinitionResult = {
  definitionId: string | null;
  versionId: string | null;
  bindingId: string | null;
  warnings: string[];
  error: string | null;
};

export const createTenantCustomFieldDefinition = async (
  tenantId: string,
  userId: string | null,
  input: CreateCustomFieldDefinitionInput,
): Promise<CreateCustomFieldDefinitionResult> => {
  if (!tenantId) {
    return {
      definitionId: null,
      versionId: null,
      bindingId: null,
      warnings: [],
      error: "Tenant non valido.",
    };
  }

  const normalizedCode = normalizeCode(input.code);
  if (!normalizedCode) {
    return {
      definitionId: null,
      versionId: null,
      bindingId: null,
      warnings: [],
      error: "Code campo obbligatorio.",
    };
  }

  const normalizedLabel = input.label.trim();
  if (!normalizedLabel) {
    return {
      definitionId: null,
      versionId: null,
      bindingId: null,
      warnings: [],
      error: "Label campo obbligatoria.",
    };
  }

  const fieldType = normalizeFieldType(input.fieldType);
  const targetLevel = normalizeTargetLevel(input.targetLevel);
  const objectType = normalizeObjectType(input.objectTypeCode);
  if (!fieldType || !targetLevel || !objectType) {
    return {
      definitionId: null,
      versionId: null,
      bindingId: null,
      warnings: [],
      error: "Tipo campo, livello o object type non validi.",
    };
  }

  if (fieldType === "single_select_enum" && (input.enumOptions ?? []).length === 0) {
    return {
      definitionId: null,
      versionId: null,
      bindingId: null,
      warnings: [],
      error: "Le opzioni enum sono obbligatorie per il tipo single select.",
    };
  }

  if (targetLevel === "line" && !parseString(input.lineContextType)) {
    return {
      definitionId: null,
      versionId: null,
      bindingId: null,
      warnings: [],
      error: "line_context_type obbligatorio quando target_level = line.",
    };
  }

  const requestedSortOrder =
    typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)
      ? Math.trunc(input.sortOrder)
      : 100;
  const sortOrder = Math.max(1, Math.min(10000, requestedSortOrder));

  try {
    const admin = getSupabaseAdminClient();
    const now = nowIso();

    const existingResult = await admin
      .from(TABLES.definitions)
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("code", normalizedCode)
      .limit(1);

    if (existingResult.error) {
      return {
        definitionId: null,
        versionId: null,
        bindingId: null,
        warnings: [],
        error: `Errore verifica duplicati: ${existingResult.error.message ?? "Unknown query error"}`,
      };
    }

    if ((existingResult.data ?? []).length > 0) {
      return {
        definitionId: null,
        versionId: null,
        bindingId: null,
        warnings: [],
        error: `Esiste gia una definizione con code "${normalizedCode}" nel tenant.`,
      };
    }

    const definitionId = randomUUID();
    const versionId = randomUUID();
    const bindingId = randomUUID();

    const definitionInsert = await admin.from(TABLES.definitions).insert({
      id: definitionId,
      tenant_id: tenantId,
      code: normalizedCode,
      status: "active",
      field_domain_code: normalizeCode(input.fieldDomainCode ?? "general") || "general",
      created_at: now,
      updated_at: now,
      created_by_user_id: userId,
      updated_by_user_id: userId,
      row_version: 1,
    } as never);

    if (definitionInsert.error) {
      return {
        definitionId: null,
        versionId: null,
        bindingId: null,
        warnings: [],
        error: `Errore insert ${TABLES.definitions}: ${definitionInsert.error.message ?? "Unknown query error"}`,
      };
    }

    const enumOptions = (input.enumOptions ?? []).map((option) => option.trim()).filter(Boolean);
    const defaultValue = parseString(input.defaultValue);
    const defaultValueJson =
      enumOptions.length > 0 || defaultValue.length > 0
        ? {
            ...(enumOptions.length > 0 ? { options: enumOptions } : {}),
            ...(defaultValue.length > 0 ? { default: defaultValue } : {}),
          }
        : null;

    const versionInsert = await admin.from(TABLES.versions).insert({
      id: versionId,
      tenant_id: tenantId,
      custom_field_definition_id: definitionId,
      version_no: 1,
      status: "active",
      field_key: `cf_${normalizedCode}`,
      label: normalizedLabel,
      description: parseString(input.description) || null,
      field_type: FIELD_TYPE_TO_DB[fieldType],
      target_level: targetLevel,
      storage_mode: "manual",
      is_required: input.isRequired ?? false,
      is_read_only: input.isReadOnly ?? false,
      is_filterable: input.isFilterable ?? false,
      is_searchable: input.isSearchable ?? false,
      is_reportable: input.isReportable ?? false,
      is_label_enabled: true,
      is_default_visible: input.isDefaultVisible ?? true,
      is_current: true,
      default_value_json: defaultValueJson,
      formula_expression: null,
      formula_language: null,
      valid_from: null,
      valid_to: null,
      created_at: now,
      updated_at: now,
      created_by_user_id: userId,
      updated_by_user_id: userId,
    } as never);

    if (versionInsert.error) {
      return {
        definitionId,
        versionId: null,
        bindingId: null,
        warnings: [],
        error: `Errore insert ${TABLES.versions}: ${versionInsert.error.message ?? "Unknown query error"}`,
      };
    }

    const bindingInsert = await admin.from(TABLES.bindings).insert({
      id: bindingId,
      tenant_id: tenantId,
      custom_field_definition_version_id: versionId,
      object_type_code: objectType,
      screen_code: normalizeCode(input.screenCode) || "general",
      section_code: normalizeCode(input.sectionCode) || "general",
      target_level: targetLevel,
      line_context_type: targetLevel === "line" ? normalizeCode(input.lineContextType ?? "") || null : null,
      sort_order: sortOrder,
      visibility_mode: input.visibilityMode ?? "visible",
      editability_mode: input.editabilityMode ?? "editable",
      requiredness_mode: input.requirednessMode ?? (input.isRequired ? "required" : "optional"),
      binding_status: "active",
      created_at: now,
      updated_at: now,
      created_by_user_id: userId,
      updated_by_user_id: userId,
    } as never);

    if (bindingInsert.error) {
      return {
        definitionId,
        versionId,
        bindingId: null,
        warnings: [],
        error: `Errore insert ${TABLES.bindings}: ${bindingInsert.error.message ?? "Unknown query error"}`,
      };
    }

    return {
      definitionId,
      versionId,
      bindingId,
      warnings: [],
      error: null,
    };
  } catch (caughtError) {
    return {
      definitionId: null,
      versionId: null,
      bindingId: null,
      warnings: [],
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

export type CustomFieldValueSummary = {
  valueId: string;
  customFieldDefinitionId: string;
  customFieldDefinitionVersionId: string;
  fieldKey: string;
  label: string;
  fieldType: CustomFieldV1Type;
  objectTypeCode: string;
  targetRecordId: string;
  targetLevel: CustomFieldTargetLevel;
  targetLineRecordId: string | null;
  value: string | number | boolean | null;
  valueSourceType: string;
  updatedAt: string | null;
  updatedByUserId: string | null;
};

export type CustomFieldValueListResult = {
  values: CustomFieldValueSummary[];
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

type ResolvedCurrentVersion = {
  id: string;
  definitionId: string;
  fieldKey: string;
  fieldType: CustomFieldV1Type;
  label: string;
  targetLevel: CustomFieldTargetLevel;
  enumOptions: string[];
};

const resolveCurrentVersionByDefinition = async (
  tenantId: string,
  definitionId: string,
): Promise<{ version: ResolvedCurrentVersion | null; error: string | null }> => {
  const admin = getSupabaseAdminClient();
  const currentResult = await admin
    .from(TABLES.versions)
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("custom_field_definition_id", definitionId)
    .eq("is_current", true)
    .limit(1);

  let versionRow: RawRow | null = null;

  if (currentResult.error) {
    return {
      version: null,
      error: `Errore su ${TABLES.versions}: ${currentResult.error.message ?? "Unknown query error"}`,
    };
  }

  if ((currentResult.data ?? []).length > 0) {
    versionRow = (currentResult.data?.[0] ?? null) as RawRow | null;
  } else {
    const fallback = await admin
      .from(TABLES.versions)
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("custom_field_definition_id", definitionId)
      .order("version_no", { ascending: false })
      .limit(1);
    if (fallback.error) {
      return {
        version: null,
        error: `Errore su ${TABLES.versions}: ${fallback.error.message ?? "Unknown query error"}`,
      };
    }
    versionRow = (fallback.data?.[0] ?? null) as RawRow | null;
  }

  if (!versionRow) {
    return {
      version: null,
      error: "Nessuna versione campo trovata per la definizione selezionata.",
    };
  }

  const fieldType = DB_TO_FIELD_TYPE[parseString(versionRow.field_type)] ?? null;
  const targetLevel = normalizeTargetLevel(parseString(versionRow.target_level));
  const versionId = parseString(versionRow.id);
  if (!fieldType || !targetLevel || !versionId) {
    return {
      version: null,
      error: "Versione campo non valida: field_type/target_level mancanti o non supportati.",
    };
  }

  return {
    version: {
      id: versionId,
      definitionId,
      fieldKey: parseString(versionRow.field_key) || definitionId,
      fieldType,
      label: parseString(versionRow.label) || parseString(versionRow.field_key) || definitionId,
      targetLevel,
      enumOptions: extractEnumOptions(versionRow),
    },
    error: null,
  };
};

export type UpsertCustomFieldValueInput = {
  customFieldDefinitionId: string;
  objectTypeCode: CustomFieldObjectType;
  targetRecordId: string;
  targetLevel: CustomFieldTargetLevel;
  targetLineRecordId?: string;
  rawValue: string;
  reason?: string;
};

export type UpsertCustomFieldValueResult = {
  valueId: string | null;
  eventId: string | null;
  warnings: string[];
  error: string | null;
};

export const upsertTenantCustomFieldValue = async (
  tenantId: string,
  userId: string | null,
  input: UpsertCustomFieldValueInput,
): Promise<UpsertCustomFieldValueResult> => {
  if (!tenantId) {
    return {
      valueId: null,
      eventId: null,
      warnings: [],
      error: "Tenant non valido.",
    };
  }

  const objectType = normalizeObjectType(input.objectTypeCode);
  const targetLevel = normalizeTargetLevel(input.targetLevel);
  if (!objectType || !targetLevel) {
    return {
      valueId: null,
      eventId: null,
      warnings: [],
      error: "Object type o target level non validi.",
    };
  }

  const definitionId = parseString(input.customFieldDefinitionId);
  const targetRecordId = parseString(input.targetRecordId);
  const targetLineRecordId = parseString(input.targetLineRecordId) || null;
  if (!definitionId || !targetRecordId) {
    return {
      valueId: null,
      eventId: null,
      warnings: [],
      error: "Definizione campo e target record sono obbligatori.",
    };
  }

  if (targetLevel === "line" && !targetLineRecordId) {
    return {
      valueId: null,
      eventId: null,
      warnings: [],
      error: "target_line_record_id obbligatorio quando target_level = line.",
    };
  }

  try {
    const admin = getSupabaseAdminClient();
    const now = nowIso();
    const resolvedVersion = await resolveCurrentVersionByDefinition(tenantId, definitionId);
    if (resolvedVersion.error || !resolvedVersion.version) {
      return {
        valueId: null,
        eventId: null,
        warnings: [],
        error: resolvedVersion.error ?? "Versione campo non trovata.",
      };
    }

    if (resolvedVersion.version.targetLevel !== targetLevel) {
      return {
        valueId: null,
        eventId: null,
        warnings: [],
        error:
          `Target level non coerente: il campo e definito come "${resolvedVersion.version.targetLevel}" ma la richiesta usa "${targetLevel}".`,
      };
    }

    const normalizedValue = normalizeTypedValue(
      resolvedVersion.version.fieldType,
      input.rawValue,
      resolvedVersion.version.enumOptions,
    );

    let currentQuery = admin
      .from(TABLES.values)
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("custom_field_definition_id", definitionId)
      .eq("object_type_code", objectType)
      .eq("target_record_id", targetRecordId)
      .eq("target_level", targetLevel)
      .limit(1);

    if (targetLevel === "line") {
      currentQuery = currentQuery.eq("target_line_record_id", targetLineRecordId as string);
    } else {
      currentQuery = currentQuery.is("target_line_record_id", null);
    }

    const currentResult = await currentQuery;
    if (currentResult.error) {
      return {
        valueId: null,
        eventId: null,
        warnings: [],
        error: `Errore su ${TABLES.values}: ${currentResult.error.message ?? "Unknown query error"}`,
      };
    }

    const current = ((currentResult.data ?? [])[0] ?? null) as RawRow | null;
    const updatePayload = {
      value_text: normalizedValue.valueText,
      value_number: normalizedValue.valueNumber,
      value_boolean: normalizedValue.valueBoolean,
      value_date: normalizedValue.valueDate,
      value_datetime: null,
      value_json: normalizedValue.valueJson,
      value_search_text: normalizedValue.valueSearchText,
      value_source_type: "manual",
      effective_from: now,
      effective_to: null,
      updated_at: now,
      updated_by_user_id: userId,
    };

    let valueId: string;
    let oldSnapshot: Record<string, unknown> | null = null;
    let eventType: "created" | "updated";

    if (!current) {
      valueId = randomUUID();
      eventType = "created";
      const insertResult = await admin.from(TABLES.values).insert({
        id: valueId,
        tenant_id: tenantId,
        custom_field_definition_id: definitionId,
        custom_field_definition_version_id: resolvedVersion.version.id,
        object_type_code: objectType,
        target_record_id: targetRecordId,
        target_level: targetLevel,
        target_line_record_id: targetLevel === "line" ? targetLineRecordId : null,
        ...updatePayload,
        created_at: now,
        created_by_user_id: userId,
        row_version: 1,
      } as never);

      if (insertResult.error) {
        return {
          valueId: null,
          eventId: null,
          warnings: [],
          error: `Errore insert ${TABLES.values}: ${insertResult.error.message ?? "Unknown query error"}`,
        };
      }
    } else {
      valueId = parseString(current.id);
      if (!valueId) {
        return {
          valueId: null,
          eventId: null,
          warnings: [],
          error: "Valore corrente non valido: id mancante.",
        };
      }
      eventType = "updated";
      oldSnapshot = toEventValueSnapshot(current);
      const currentRowVersion = readNumber(current, ["row_version"]) ?? 1;

      const updateQuery = admin
        .from(TABLES.values)
        .update({
          ...updatePayload,
          row_version: currentRowVersion + 1,
          custom_field_definition_version_id: resolvedVersion.version.id,
        } as never)
        .eq("id", valueId)
        .eq("tenant_id", tenantId);

      const updateResult = await updateQuery;
      if (updateResult.error) {
        return {
          valueId: null,
          eventId: null,
          warnings: [],
          error: `Errore update ${TABLES.values}: ${updateResult.error.message ?? "Unknown query error"}`,
        };
      }
    }

    const newSnapshot = {
      ...toEventValueSnapshot({
        ...updatePayload,
        value_source_type: "manual",
      }),
      typed_value: normalizedValue.typedValue,
      field_key: resolvedVersion.version.fieldKey,
      field_type: resolvedVersion.version.fieldType,
      object_type_code: objectType,
      target_record_id: targetRecordId,
      target_line_record_id: targetLevel === "line" ? targetLineRecordId : null,
      target_level: targetLevel,
    };

    const eventId = randomUUID();
    const eventInsert = await admin.from(TABLES.valueEvents).insert({
      id: eventId,
      tenant_id: tenantId,
      custom_field_value_id: valueId,
      event_type: eventType,
      old_value_json: oldSnapshot,
      new_value_json: newSnapshot,
      event_reason: parseString(input.reason) || null,
      source_event_code: "cf01_manual_upsert",
      created_at: now,
      created_by_user_id: userId,
    } as never);

    if (eventInsert.error) {
      return {
        valueId,
        eventId: null,
        warnings: [],
        error: `Errore insert ${TABLES.valueEvents}: ${eventInsert.error.message ?? "Unknown query error"}`,
      };
    }

    return {
      valueId,
      eventId,
      warnings: [],
      error: null,
    };
  } catch (caughtError) {
    return {
      valueId: null,
      eventId: null,
      warnings: [],
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

export type CustomFieldValueListInput = {
  objectTypeCode: CustomFieldObjectType;
  targetRecordId: string;
  targetLevel: CustomFieldTargetLevel;
  targetLineRecordId?: string;
};

export const getTenantCustomFieldValues = async (
  tenantId: string,
  input: CustomFieldValueListInput,
): Promise<CustomFieldValueListResult> => {
  if (!tenantId) {
    return {
      values: [],
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Tenant non valido.",
    };
  }

  const objectType = normalizeObjectType(input.objectTypeCode);
  const targetLevel = normalizeTargetLevel(input.targetLevel);
  const targetRecordId = parseString(input.targetRecordId);
  const targetLineRecordId = parseString(input.targetLineRecordId) || null;
  if (!objectType || !targetLevel || !targetRecordId) {
    return {
      values: [],
      sourceTables: [TABLES.values, TABLES.versions],
      warnings: [],
      emptyStateHint: null,
      error: "Parametri object_type_code / target_level / target_record_id non validi.",
    };
  }

  if (targetLevel === "line" && !targetLineRecordId) {
    return {
      values: [],
      sourceTables: [TABLES.values, TABLES.versions],
      warnings: [],
      emptyStateHint: null,
      error: "target_line_record_id obbligatorio quando target_level = line.",
    };
  }

  try {
    const admin = getSupabaseAdminClient();
    let valuesQuery = admin
      .from(TABLES.values)
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("object_type_code", objectType)
      .eq("target_record_id", targetRecordId)
      .eq("target_level", targetLevel)
      .order("updated_at", { ascending: false })
      .limit(SAFE_LIST_LIMIT);

    if (targetLevel === "line") {
      valuesQuery = valuesQuery.eq("target_line_record_id", targetLineRecordId as string);
    } else {
      valuesQuery = valuesQuery.is("target_line_record_id", null);
    }

    const valuesResult = await valuesQuery;
    if (valuesResult.error) {
      const message = valuesResult.error.message ?? "Unknown query error";
      return {
        values: [],
        sourceTables: [TABLES.values, TABLES.versions],
        warnings: [],
        emptyStateHint: null,
        error: looksLikeMissingTable(message)
          ? "Tabelle custom field values non presenti nel DB esposto."
          : `Errore su ${TABLES.values}: ${message}`,
      };
    }

    const valueRows = (valuesResult.data ?? []) as RawRow[];
    if (valueRows.length === 0) {
      return {
        values: [],
        sourceTables: [TABLES.values, TABLES.versions],
        warnings: [],
        emptyStateHint: "Nessun valore custom field per il target selezionato.",
        error: null,
      };
    }

    const versionIds = [...new Set(valueRows.map((row) => parseString(row.custom_field_definition_version_id)).filter(Boolean))];
    const versionsResult = await admin
      .from(TABLES.versions)
      .select("*")
      .eq("tenant_id", tenantId)
      .in("id", versionIds)
      .limit(SAFE_LIST_LIMIT);

    if (versionsResult.error) {
      return {
        values: [],
        sourceTables: [TABLES.values, TABLES.versions],
        warnings: [],
        emptyStateHint: null,
        error: `Errore su ${TABLES.versions}: ${versionsResult.error.message ?? "Unknown query error"}`,
      };
    }

    const versionsById = new Map<string, RawRow>();
    ((versionsResult.data ?? []) as RawRow[]).forEach((version) => {
      const versionId = parseString(version.id);
      if (versionId) {
        versionsById.set(versionId, version);
      }
    });

    const mappedValues = valueRows
      .map((valueRow) => {
        const valueId = parseString(valueRow.id);
        const versionId = parseString(valueRow.custom_field_definition_version_id);
        const definitionId = parseString(valueRow.custom_field_definition_id);
        const version = versionsById.get(versionId);
        if (!valueId || !versionId || !definitionId || !version) {
          return null;
        }

        const fieldType = DB_TO_FIELD_TYPE[parseString(version.field_type)] ?? null;
        const level = normalizeTargetLevel(parseString(valueRow.target_level));
        if (!fieldType || !level) {
          return null;
        }

        return {
          valueId,
          customFieldDefinitionId: definitionId,
          customFieldDefinitionVersionId: versionId,
          fieldKey: parseString(version.field_key) || definitionId,
          label: parseString(version.label) || parseString(version.field_key) || definitionId,
          fieldType,
          objectTypeCode: parseString(valueRow.object_type_code) || objectType,
          targetRecordId: parseString(valueRow.target_record_id) || targetRecordId,
          targetLevel: level,
          targetLineRecordId: parseString(valueRow.target_line_record_id) || null,
          value: toTypedValue(valueRow, fieldType),
          valueSourceType: parseString(valueRow.value_source_type) || "manual",
          updatedAt: parseString(valueRow.updated_at) || null,
          updatedByUserId: parseString(valueRow.updated_by_user_id) || null,
        } satisfies CustomFieldValueSummary;
      })
      .filter((item): item is CustomFieldValueSummary => Boolean(item))
      .sort((left, right) => left.fieldKey.localeCompare(right.fieldKey, "it"));

    return {
      values: mappedValues,
      sourceTables: [TABLES.values, TABLES.versions],
      warnings: [],
      emptyStateHint:
        mappedValues.length === 0 ? "Valori presenti ma non risolti nel mapping runtime." : null,
      error: null,
    };
  } catch (caughtError) {
    return {
      values: [],
      sourceTables: [TABLES.values, TABLES.versions],
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

export type CustomFieldLineValueSummary = {
  valueId: string;
  customFieldDefinitionId: string;
  customFieldDefinitionVersionId: string;
  fieldKey: string;
  label: string;
  fieldType: CustomFieldV1Type;
  objectTypeCode: string;
  targetRecordId: string;
  targetLineRecordId: string;
  value: string | number | boolean | null;
  valueSourceType: string;
  updatedAt: string | null;
  updatedByUserId: string | null;
};

export type CustomFieldLineValueListInput = {
  objectTypeCode: CustomFieldObjectType;
  targetLineRecordIds: string[];
};

export type CustomFieldLineValueListResult = {
  values: CustomFieldLineValueSummary[];
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

export const getTenantCustomFieldLineValuesByLineIds = async (
  tenantId: string,
  input: CustomFieldLineValueListInput,
): Promise<CustomFieldLineValueListResult> => {
  if (!tenantId) {
    return {
      values: [],
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Tenant non valido.",
    };
  }

  const objectType = normalizeObjectType(input.objectTypeCode);
  if (!objectType) {
    return {
      values: [],
      sourceTables: [TABLES.values, TABLES.versions],
      warnings: [],
      emptyStateHint: null,
      error: "Object type non valido.",
    };
  }

  const uniqueLineIds = [...new Set(input.targetLineRecordIds.map((value) => parseString(value)).filter(Boolean))];
  if (uniqueLineIds.length === 0) {
    return {
      values: [],
      sourceTables: [TABLES.values, TABLES.versions],
      warnings: [],
      emptyStateHint: "Nessun target_line_record_id disponibile.",
      error: null,
    };
  }

  const lineIds = uniqueLineIds.slice(0, SAFE_LIST_LIMIT);
  const warnings: string[] = [];
  if (lineIds.length < uniqueLineIds.length) {
    warnings.push(
      `Richiesta line IDs ridotta a ${SAFE_LIST_LIMIT} elementi (ricevuti ${uniqueLineIds.length}).`,
    );
  }

  try {
    const admin = getSupabaseAdminClient();
    const valuesResult = await admin
      .from(TABLES.values)
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("object_type_code", objectType)
      .eq("target_level", "line")
      .in("target_line_record_id", lineIds)
      .order("updated_at", { ascending: false })
      .limit(SAFE_LIST_LIMIT);

    if (valuesResult.error) {
      const message = valuesResult.error.message ?? "Unknown query error";
      return {
        values: [],
        sourceTables: [TABLES.values, TABLES.versions],
        warnings,
        emptyStateHint: null,
        error: looksLikeMissingTable(message)
          ? "Tabelle custom field values non presenti nel DB esposto."
          : `Errore su ${TABLES.values}: ${message}`,
      };
    }

    const valueRows = (valuesResult.data ?? []) as RawRow[];
    if (valueRows.length === 0) {
      return {
        values: [],
        sourceTables: [TABLES.values, TABLES.versions],
        warnings,
        emptyStateHint: "Nessun valore custom field line per i target selezionati.",
        error: null,
      };
    }

    const versionIds = [
      ...new Set(valueRows.map((row) => parseString(row.custom_field_definition_version_id)).filter(Boolean)),
    ];
    const versionsResult = await admin
      .from(TABLES.versions)
      .select("*")
      .eq("tenant_id", tenantId)
      .in("id", versionIds)
      .limit(SAFE_LIST_LIMIT);

    if (versionsResult.error) {
      return {
        values: [],
        sourceTables: [TABLES.values, TABLES.versions],
        warnings,
        emptyStateHint: null,
        error: `Errore su ${TABLES.versions}: ${versionsResult.error.message ?? "Unknown query error"}`,
      };
    }

    const versionsById = new Map<string, RawRow>();
    ((versionsResult.data ?? []) as RawRow[]).forEach((version) => {
      const versionId = parseString(version.id);
      if (versionId) {
        versionsById.set(versionId, version);
      }
    });

    const mappedValues = valueRows
      .map((valueRow) => {
        const valueId = parseString(valueRow.id);
        const versionId = parseString(valueRow.custom_field_definition_version_id);
        const definitionId = parseString(valueRow.custom_field_definition_id);
        const targetRecordId = parseString(valueRow.target_record_id);
        const targetLineRecordId = parseString(valueRow.target_line_record_id);
        const version = versionsById.get(versionId);
        if (!valueId || !versionId || !definitionId || !targetRecordId || !targetLineRecordId || !version) {
          return null;
        }

        const fieldType = DB_TO_FIELD_TYPE[parseString(version.field_type)] ?? null;
        if (!fieldType) {
          return null;
        }

        return {
          valueId,
          customFieldDefinitionId: definitionId,
          customFieldDefinitionVersionId: versionId,
          fieldKey: parseString(version.field_key) || definitionId,
          label: parseString(version.label) || parseString(version.field_key) || definitionId,
          fieldType,
          objectTypeCode: parseString(valueRow.object_type_code) || objectType,
          targetRecordId,
          targetLineRecordId,
          value: toTypedValue(valueRow, fieldType),
          valueSourceType: parseString(valueRow.value_source_type) || "manual",
          updatedAt: parseString(valueRow.updated_at) || null,
          updatedByUserId: parseString(valueRow.updated_by_user_id) || null,
        } satisfies CustomFieldLineValueSummary;
      })
      .filter((item): item is CustomFieldLineValueSummary => Boolean(item))
      .sort((left, right) => left.fieldKey.localeCompare(right.fieldKey, "it"));

    return {
      values: mappedValues,
      sourceTables: [TABLES.values, TABLES.versions],
      warnings,
      emptyStateHint:
        mappedValues.length === 0 ? "Valori line presenti ma non risolti nel mapping runtime." : null,
      error: null,
    };
  } catch (caughtError) {
    return {
      values: [],
      sourceTables: [TABLES.values, TABLES.versions],
      warnings,
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};
