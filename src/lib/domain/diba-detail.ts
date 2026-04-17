import "server-only";

import { type DibaListItem, getTenantDibaById } from "@/lib/domain/diba";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RawRow = Record<string, unknown>;

type ProductLookupValue = {
  code: string | null;
  name: string | null;
};

export type DibaVersionDetail = {
  id: string | null;
  versionNo: number | null;
  versionLabel: string;
  status: string;
  validFrom: string | null;
  validTo: string | null;
  isCurrent: boolean | null;
};

export type DibaLineDetail = {
  id: string;
  lineNo: number | null;
  componentItemId: string | null;
  componentCode: string;
  componentDescription: string;
  quantityPerBase: number | null;
  baseQuantity: number | null;
  unitOfMeasure: string | null;
  isOptional: boolean;
  isAlternative: boolean;
  alternativeGroup: string | null;
  notes: string | null;
  baseCalculation: string | null;
  multiplier: number | null;
  uomConversion: string | null;
  roundingRule: string | null;
  pickingMultiple: number | null;
  minimumPickable: number | null;
  theoreticalConsumptionQty: number | null;
  actualWithdrawalQty: number | null;
};

export type DibaDetailResult = {
  diba: DibaListItem | null;
  version: DibaVersionDetail | null;
  lines: DibaLineDetail[];
  sourceTable: string | null;
  versionSourceTable: string | null;
  lineSourceTable: string | null;
  warnings: string[];
  error: string | null;
};

const VERSION_SOURCE_TABLE = "bom_template_versions";
const LINE_SOURCE_TABLE = "bom_template_version_lines";

const VERSION_ID_COLUMNS = ["id", "bom_template_version_id"];
const VERSION_NO_COLUMNS = ["version_no", "revision_no", "version"];
const VERSION_STATUS_COLUMNS = ["status", "state", "lifecycle_status", "is_active"];
const VERSION_VALID_FROM_COLUMNS = ["valid_from", "effective_from", "start_date"];
const VERSION_VALID_TO_COLUMNS = ["valid_to", "effective_to", "end_date"];
const VERSION_IS_CURRENT_COLUMNS = ["is_current", "current_flag"];

const LINE_ID_COLUMNS = ["id", "bom_template_version_line_id", "line_id"];
const LINE_NO_COLUMNS = ["line_no", "line_number", "sequence_no", "position_no"];
const LINE_COMPONENT_ITEM_ID_COLUMNS = [
  "component_item_id",
  "component_product_id",
  "item_id",
  "product_id",
  "component_id",
  "material_item_id",
];
const LINE_COMPONENT_CODE_COLUMNS = ["component_code", "item_code", "material_code", "code"];
const LINE_COMPONENT_DESCRIPTION_COLUMNS = [
  "component_description",
  "description",
  "component_name",
  "material_description",
  "name",
];
const LINE_QTY_PER_BASE_COLUMNS = [
  "qty_per_base",
  "quantity",
  "qty",
  "component_qty",
  "consumption_qty",
];
const LINE_BASE_QTY_COLUMNS = ["base_qty", "base_quantity", "base_calc_qty"];
const LINE_UOM_COLUMNS = ["uom", "unit_of_measure", "uom_code", "unit_code"];
const LINE_OPTIONAL_COLUMNS = ["is_optional", "optional_flag", "is_option"];
const LINE_ALTERNATIVE_COLUMNS = [
  "is_alternative",
  "has_alternative",
  "is_substitute",
  "allow_substitute",
];
const LINE_ALTERNATIVE_GROUP_COLUMNS = [
  "alternative_group_code",
  "alternative_group",
  "substitute_group_code",
];
const LINE_NOTES_COLUMNS = ["notes", "note", "line_note", "technical_note"];
const LINE_BASE_CALCULATION_COLUMNS = [
  "base_calculation_mode",
  "calc_basis",
  "calculation_basis",
  "base_calc_formula",
];
const LINE_MULTIPLIER_COLUMNS = ["multiplier", "consumption_multiplier", "qty_multiplier"];
const LINE_UOM_CONVERSION_COLUMNS = [
  "uom_conversion_factor",
  "conversion_factor",
  "uom_conversion_rule",
  "conversion_rule",
];
const LINE_ROUNDING_COLUMNS = ["rounding_rule", "rounding_mode", "rounding_precision"];
const LINE_PICKING_MULTIPLE_COLUMNS = [
  "picking_multiple",
  "withdrawal_multiple",
  "pick_multiple",
];
const LINE_MIN_PICK_COLUMNS = [
  "minimum_pick_qty",
  "min_pick_qty",
  "minimum_withdrawal_qty",
  "withdrawal_min_qty",
];
const LINE_THEORETICAL_CONSUMPTION_COLUMNS = [
  "theoretical_consumption_qty",
  "theoretical_qty",
  "expected_consumption_qty",
  "consumption_theoretical",
];
const LINE_ACTUAL_WITHDRAWAL_COLUMNS = [
  "actual_withdrawal_qty",
  "real_withdrawal_qty",
  "picked_qty",
  "withdrawn_qty",
  "actual_consumption_qty",
];

const readFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return null;
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

const pickBestVersion = (rows: RawRow[]) => {
  if (rows.length === 0) {
    return null;
  }

  const current = rows.find((row) => readBooleanFromKeys(row, VERSION_IS_CURRENT_COLUMNS) === true);
  if (current) {
    return current;
  }

  const byVersion = [...rows]
    .map((row) => ({
      row,
      versionNo: readNumberFromKeys(row, VERSION_NO_COLUMNS) ?? -1,
    }))
    .sort((a, b) => b.versionNo - a.versionNo);

  return byVersion[0]?.row ?? rows[0];
};

const buildAlternativesEvidence = (optionalLines: number | null, alternativeLines: number | null) => {
  if (optionalLines === null || alternativeLines === null) {
    return "N/D";
  }
  return `opzionali ${optionalLines} - alternative ${alternativeLines}`;
};

const sortLines = (lines: DibaLineDetail[]) => {
  return [...lines].sort((left, right) => {
    const leftLine = left.lineNo ?? Number.MAX_SAFE_INTEGER;
    const rightLine = right.lineNo ?? Number.MAX_SAFE_INTEGER;
    if (leftLine !== rightLine) {
      return leftLine - rightLine;
    }
    return left.id.localeCompare(right.id, "it");
  });
};

const buildProductLookup = async (
  tenantId: string,
  productIds: string[],
): Promise<Map<string, ProductLookupValue>> => {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  const lookup = new Map<string, ProductLookupValue>();
  if (uniqueIds.length === 0) {
    return lookup;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("id, code, name, description")
    .eq("tenant_id", tenantId)
    .in("id", uniqueIds);

  if (error) {
    return lookup;
  }

  for (const row of (data ?? []) as RawRow[]) {
    const id = readStringFromKeys(row, ["id"]);
    if (!id) {
      continue;
    }
    lookup.set(id, {
      code: readStringFromKeys(row, ["code"]),
      name: readStringFromKeys(row, ["name", "description"]),
    });
  }

  return lookup;
};

const resolveVersionDetail = async (tenantId: string, dibaId: string) => {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from(VERSION_SOURCE_TABLE)
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("bom_template_id", dibaId)
    .limit(200);

  if (error) {
    return {
      version: null as DibaVersionDetail | null,
      versionId: null as string | null,
      warning: `Errore su ${VERSION_SOURCE_TABLE}: ${error.message ?? "Unknown query error"}`,
    };
  }

  const rows = (data ?? []) as RawRow[];
  const best = pickBestVersion(rows);
  if (!best) {
    return {
      version: null as DibaVersionDetail | null,
      versionId: null as string | null,
      warning: null as string | null,
    };
  }

  const versionNo = readNumberFromKeys(best, VERSION_NO_COLUMNS);
  return {
    version: {
      id: readStringFromKeys(best, VERSION_ID_COLUMNS),
      versionNo,
      versionLabel: versionNo !== null ? `v${versionNo}` : "N/D",
      status: normalizeStatus(best, VERSION_STATUS_COLUMNS),
      validFrom: readStringFromKeys(best, VERSION_VALID_FROM_COLUMNS),
      validTo: readStringFromKeys(best, VERSION_VALID_TO_COLUMNS),
      isCurrent: readBooleanFromKeys(best, VERSION_IS_CURRENT_COLUMNS),
    } as DibaVersionDetail,
    versionId: readStringFromKeys(best, VERSION_ID_COLUMNS),
    warning: null as string | null,
  };
};

const resolveLineRows = async (tenantId: string, versionId: string) => {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from(LINE_SOURCE_TABLE)
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("bom_template_version_id", versionId)
    .limit(1500);

  if (error) {
    return {
      rows: [] as RawRow[],
      warning: `Errore su ${LINE_SOURCE_TABLE}: ${error.message ?? "Unknown query error"}`,
    };
  }

  return {
    rows: (data ?? []) as RawRow[],
    warning: null as string | null,
  };
};

const mapLineRows = async (tenantId: string, rows: RawRow[]) => {
  const componentIds = rows
    .map((row) => readStringFromKeys(row, LINE_COMPONENT_ITEM_ID_COLUMNS))
    .filter((value): value is string => Boolean(value));
  const productLookup = await buildProductLookup(tenantId, componentIds);

  const lines = rows.map((row, index) => {
    const componentItemId = readStringFromKeys(row, LINE_COMPONENT_ITEM_ID_COLUMNS);
    const componentLookup = componentItemId ? productLookup.get(componentItemId) : null;
    const componentCode =
      readStringFromKeys(row, LINE_COMPONENT_CODE_COLUMNS) ??
      componentLookup?.code ??
      componentItemId ??
      "N/D";
    const componentDescription =
      readStringFromKeys(row, LINE_COMPONENT_DESCRIPTION_COLUMNS) ??
      componentLookup?.name ??
      componentCode;

    const quantityPerBase = readNumberFromKeys(row, LINE_QTY_PER_BASE_COLUMNS);
    const alternativeGroup = readStringFromKeys(row, LINE_ALTERNATIVE_GROUP_COLUMNS);
    const isAlternativeFlag = readBooleanFromKeys(row, LINE_ALTERNATIVE_COLUMNS) ?? false;

    const theoreticalConsumptionQty =
      readNumberFromKeys(row, LINE_THEORETICAL_CONSUMPTION_COLUMNS) ?? quantityPerBase;

    return {
      id: readStringFromKeys(row, LINE_ID_COLUMNS) ?? `line-${index + 1}`,
      lineNo: readNumberFromKeys(row, LINE_NO_COLUMNS),
      componentItemId,
      componentCode,
      componentDescription,
      quantityPerBase,
      baseQuantity: readNumberFromKeys(row, LINE_BASE_QTY_COLUMNS),
      unitOfMeasure: readStringFromKeys(row, LINE_UOM_COLUMNS),
      isOptional: readBooleanFromKeys(row, LINE_OPTIONAL_COLUMNS) ?? false,
      isAlternative: isAlternativeFlag || Boolean(alternativeGroup),
      alternativeGroup,
      notes: readStringFromKeys(row, LINE_NOTES_COLUMNS),
      baseCalculation: readStringFromKeys(row, LINE_BASE_CALCULATION_COLUMNS),
      multiplier: readNumberFromKeys(row, LINE_MULTIPLIER_COLUMNS),
      uomConversion: readStringFromKeys(row, LINE_UOM_CONVERSION_COLUMNS),
      roundingRule: readStringFromKeys(row, LINE_ROUNDING_COLUMNS),
      pickingMultiple: readNumberFromKeys(row, LINE_PICKING_MULTIPLE_COLUMNS),
      minimumPickable: readNumberFromKeys(row, LINE_MIN_PICK_COLUMNS),
      theoreticalConsumptionQty,
      actualWithdrawalQty: readNumberFromKeys(row, LINE_ACTUAL_WITHDRAWAL_COLUMNS),
    } as DibaLineDetail;
  });

  return sortLines(lines);
};

export const getTenantDibaDetailById = async (
  tenantId: string,
  dibaId: string,
): Promise<DibaDetailResult> => {
  if (!tenantId || !dibaId) {
    return {
      diba: null,
      version: null,
      lines: [],
      sourceTable: null,
      versionSourceTable: null,
      lineSourceTable: null,
      warnings: [],
      error: "Parametri non validi.",
    };
  }

  const baseDetail = await getTenantDibaById(tenantId, dibaId);
  if (!baseDetail.diba && !baseDetail.error) {
    return {
      diba: null,
      version: null,
      lines: [],
      sourceTable: baseDetail.sourceTable,
      versionSourceTable: VERSION_SOURCE_TABLE,
      lineSourceTable: LINE_SOURCE_TABLE,
      warnings: baseDetail.warnings,
      error: null,
    };
  }

  const warnings = [...baseDetail.warnings];

  const versionResult = await resolveVersionDetail(tenantId, dibaId);
  if (versionResult.warning) {
    warnings.push(versionResult.warning);
  }

  let lines: DibaLineDetail[] = [];
  if (versionResult.versionId) {
    const lineResult = await resolveLineRows(tenantId, versionResult.versionId);
    if (lineResult.warning) {
      warnings.push(lineResult.warning);
    } else {
      lines = await mapLineRows(tenantId, lineResult.rows);
    }
  }

  let diba = baseDetail.diba;
  if (diba && lines.length > 0) {
    const optionalLines = lines.filter((line) => line.isOptional).length;
    const alternativeLines = lines.filter((line) => line.isAlternative).length;
    diba = {
      ...diba,
      optionalLines,
      alternativeLines,
      hasAlternatives: alternativeLines > 0,
      alternativesEvidence: buildAlternativesEvidence(optionalLines, alternativeLines),
      versionNo: versionResult.version?.versionNo ?? diba.versionNo,
      versionLabel: versionResult.version?.versionLabel ?? diba.versionLabel,
      status: versionResult.version?.status ?? diba.status,
    };
  }

  return {
    diba,
    version: versionResult.version,
    lines,
    sourceTable: baseDetail.sourceTable,
    versionSourceTable: VERSION_SOURCE_TABLE,
    lineSourceTable: LINE_SOURCE_TABLE,
    warnings,
    error: baseDetail.error,
  };
};

