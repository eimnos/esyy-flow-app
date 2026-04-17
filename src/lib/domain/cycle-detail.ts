import "server-only";

import { getTenantCycleById, type CycleListItem } from "@/lib/domain/cycles";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RawRow = Record<string, unknown>;

type PhaseType = "interna" | "esterna" | "n/d";
type TimeMode = "fisso" | "proporzionale" | "batch" | "n/d";

export type CycleVersionDetail = {
  id: string | null;
  versionNo: number | null;
  versionLabel: string;
  status: string;
  validFrom: string | null;
  validTo: string | null;
  isCurrent: boolean | null;
};

export type CyclePhaseDetail = {
  id: string;
  stepNo: number | null;
  phaseCode: string;
  phaseName: string;
  phaseType: PhaseType;
  isExternal: boolean;
  departmentCode: string | null;
  workCenterCode: string | null;
  externalSupplierCode: string | null;
  hasQualityCheck: boolean | null;
  standardTimeMinutes: number | null;
  setupTimeMinutes: number | null;
  parallelResources: number | null;
  batchSize: number | null;
  timeMode: TimeMode;
  capacityPerHour: number | null;
  simulatedResultMinutes: number | null;
  operationalRules: string | null;
  notes: string | null;
};

export type CycleDetailResult = {
  cycle: CycleListItem | null;
  version: CycleVersionDetail | null;
  phases: CyclePhaseDetail[];
  sourceTable: string | null;
  versionSourceTable: string | null;
  phaseSourceTable: string | null;
  warnings: string[];
  error: string | null;
};

const VERSION_SOURCE_TABLE = "routing_template_versions";
const PHASE_SOURCE_TABLE = "routing_template_version_steps";

const SAFE_LIST_LIMIT = 2000;

const VERSION_ID_COLUMNS = ["id", "routing_template_version_id"];
const VERSION_NO_COLUMNS = ["version_no", "revision_no", "version"];
const VERSION_STATUS_COLUMNS = ["status", "state", "lifecycle_status", "is_active"];
const VERSION_VALID_FROM_COLUMNS = ["valid_from", "effective_from", "start_date"];
const VERSION_VALID_TO_COLUMNS = ["valid_to", "effective_to", "end_date"];
const VERSION_IS_CURRENT_COLUMNS = ["is_current", "current_flag"];

const PHASE_ID_COLUMNS = ["id", "routing_template_version_step_id", "step_id"];
const PHASE_NO_COLUMNS = ["step_no", "phase_no", "sequence_no", "line_no"];
const PHASE_CODE_COLUMNS = ["phase_code", "step_code", "operation_code", "code"];
const PHASE_NAME_COLUMNS = ["phase_name", "step_name", "operation_name", "name", "description"];
const PHASE_TYPE_COLUMNS = ["phase_type", "step_type", "process_type", "execution_type"];
const PHASE_EXTERNAL_COLUMNS = ["is_external", "is_outsourced", "outsourced_flag", "is_subcontracted"];
const PHASE_DEPARTMENT_COLUMNS = ["department_code", "department", "area_code", "shop_code"];
const PHASE_WORK_CENTER_COLUMNS = ["work_center_code", "work_center_id", "machine_code", "resource_code"];
const PHASE_SUPPLIER_COLUMNS = ["supplier_code", "vendor_code", "subcontractor_code", "external_partner_code"];
const PHASE_QUALITY_COLUMNS = ["has_quality_check", "quality_required", "requires_quality", "quality_enabled"];
const PHASE_STANDARD_TIME_COLUMNS = ["run_time_minutes", "standard_time_minutes", "cycle_time_minutes", "processing_time_minutes"];
const PHASE_SETUP_TIME_COLUMNS = ["setup_time_minutes", "setup_minutes", "changeover_time_minutes"];
const PHASE_PARALLEL_COLUMNS = ["parallel_resources", "parallel_resource_count", "resource_parallelism", "parallel_units"];
const PHASE_BATCH_SIZE_COLUMNS = ["batch_size", "lot_size", "batch_qty"];
const PHASE_TIME_MODE_COLUMNS = ["time_mode", "duration_mode", "calculation_mode"];
const PHASE_FIXED_TIME_COLUMNS = ["fixed_time_minutes", "time_fixed_minutes"];
const PHASE_CAPACITY_COLUMNS = ["capacity_per_hour", "hourly_capacity", "units_per_hour"];
const PHASE_SIMULATION_COLUMNS = [
  "simulated_result_minutes",
  "simulated_time_minutes",
  "result_time_minutes",
  "estimated_total_minutes",
];
const PHASE_RULE_COLUMNS = ["operational_rule", "operation_rule", "rule_code", "rule_notes"];
const PHASE_NOTE_COLUMNS = ["notes", "note", "phase_note", "instructions"];

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

const normalizePhaseType = (phaseTypeRaw: string | null, isExternal: boolean): PhaseType => {
  const normalized = phaseTypeRaw?.trim().toLowerCase() ?? "";
  if (["internal", "interno", "interna", "inhouse", "in-house", "inside"].includes(normalized)) {
    return "interna";
  }
  if (
    ["external", "esterno", "esterna", "outsource", "subcontract", "subcontracted"].includes(
      normalized,
    )
  ) {
    return "esterna";
  }
  if (isExternal) {
    return "esterna";
  }
  if (normalized.length > 0) {
    return "interna";
  }
  return "n/d";
};

const normalizeTimeMode = (
  modeRaw: string | null,
  batchSize: number | null,
  fixedTime: number | null,
  standardTime: number | null,
): TimeMode => {
  const normalized = modeRaw?.trim().toLowerCase() ?? "";
  if (["fixed", "fisso", "fixed_time", "constant"].includes(normalized)) {
    return "fisso";
  }
  if (["proportional", "proporzionale", "variable", "run"].includes(normalized)) {
    return "proporzionale";
  }
  if (["batch", "lot", "batch_mode"].includes(normalized)) {
    return "batch";
  }

  if (batchSize !== null && batchSize > 0) {
    return "batch";
  }
  if (fixedTime !== null) {
    return "fisso";
  }
  if (standardTime !== null) {
    return "proporzionale";
  }
  return "n/d";
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
    .map((row) => ({ row, versionNo: readNumberFromKeys(row, VERSION_NO_COLUMNS) ?? -1 }))
    .sort((a, b) => b.versionNo - a.versionNo);

  return byVersion[0]?.row ?? rows[0];
};

const sortPhases = (phases: CyclePhaseDetail[]) => {
  return [...phases].sort((left, right) => {
    const leftNo = left.stepNo ?? Number.MAX_SAFE_INTEGER;
    const rightNo = right.stepNo ?? Number.MAX_SAFE_INTEGER;
    if (leftNo !== rightNo) {
      return leftNo - rightNo;
    }
    return left.id.localeCompare(right.id, "it");
  });
};

const resolveVersionDetail = async (tenantId: string, cycleId: string) => {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from(VERSION_SOURCE_TABLE)
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("routing_template_id", cycleId)
    .limit(200);

  if (error) {
    return {
      version: null as CycleVersionDetail | null,
      versionId: null as string | null,
      warning: `Errore su ${VERSION_SOURCE_TABLE}: ${error.message ?? "Unknown query error"}`,
    };
  }

  const rows = (data ?? []) as RawRow[];
  const best = pickBestVersion(rows);
  if (!best) {
    return {
      version: null as CycleVersionDetail | null,
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
    } as CycleVersionDetail,
    versionId: readStringFromKeys(best, VERSION_ID_COLUMNS),
    warning: null as string | null,
  };
};

const resolvePhases = async (tenantId: string, versionId: string) => {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from(PHASE_SOURCE_TABLE)
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("routing_template_version_id", versionId)
    .limit(SAFE_LIST_LIMIT);

  if (error) {
    return {
      phases: [] as CyclePhaseDetail[],
      warning: `Errore su ${PHASE_SOURCE_TABLE}: ${error.message ?? "Unknown query error"}`,
    };
  }

  const rows = (data ?? []) as RawRow[];
  const phases = rows.map((row, index) => {
    const id = readStringFromKeys(row, PHASE_ID_COLUMNS) ?? `phase-${index + 1}`;
    const stepNo = readNumberFromKeys(row, PHASE_NO_COLUMNS);
    const phaseCode = readStringFromKeys(row, PHASE_CODE_COLUMNS) ?? id;
    const phaseName = readStringFromKeys(row, PHASE_NAME_COLUMNS) ?? phaseCode;
    const phaseTypeRaw = readStringFromKeys(row, PHASE_TYPE_COLUMNS);
    const isExternal = readBooleanFromKeys(row, PHASE_EXTERNAL_COLUMNS) ?? false;

    const standardTimeMinutes = readNumberFromKeys(row, PHASE_STANDARD_TIME_COLUMNS);
    const setupTimeMinutes = readNumberFromKeys(row, PHASE_SETUP_TIME_COLUMNS);
    const batchSize = readNumberFromKeys(row, PHASE_BATCH_SIZE_COLUMNS);
    const fixedTime = readNumberFromKeys(row, PHASE_FIXED_TIME_COLUMNS);

    const simulatedExplicit = readNumberFromKeys(row, PHASE_SIMULATION_COLUMNS);
    const simulatedFallback =
      setupTimeMinutes !== null || standardTimeMinutes !== null
        ? (setupTimeMinutes ?? 0) + (standardTimeMinutes ?? 0)
        : null;

    return {
      id,
      stepNo,
      phaseCode,
      phaseName,
      phaseType: normalizePhaseType(phaseTypeRaw, isExternal),
      isExternal,
      departmentCode: readStringFromKeys(row, PHASE_DEPARTMENT_COLUMNS),
      workCenterCode: readStringFromKeys(row, PHASE_WORK_CENTER_COLUMNS),
      externalSupplierCode: readStringFromKeys(row, PHASE_SUPPLIER_COLUMNS),
      hasQualityCheck: readBooleanFromKeys(row, PHASE_QUALITY_COLUMNS),
      standardTimeMinutes,
      setupTimeMinutes,
      parallelResources: readNumberFromKeys(row, PHASE_PARALLEL_COLUMNS),
      batchSize,
      timeMode: normalizeTimeMode(
        readStringFromKeys(row, PHASE_TIME_MODE_COLUMNS),
        batchSize,
        fixedTime,
        standardTimeMinutes,
      ),
      capacityPerHour: readNumberFromKeys(row, PHASE_CAPACITY_COLUMNS),
      simulatedResultMinutes: simulatedExplicit ?? simulatedFallback,
      operationalRules: readStringFromKeys(row, PHASE_RULE_COLUMNS),
      notes: readStringFromKeys(row, PHASE_NOTE_COLUMNS),
    } as CyclePhaseDetail;
  });

  return {
    phases: sortPhases(phases),
    warning: null as string | null,
  };
};

const deriveProcessTypeFromPhases = (phases: CyclePhaseDetail[]) => {
  if (phases.length === 0) {
    return "n/d";
  }

  const hasInternal = phases.some((phase) => phase.phaseType === "interna");
  const hasExternal = phases.some((phase) => phase.phaseType === "esterna");

  if (hasInternal && hasExternal) {
    return "misto";
  }
  if (hasExternal) {
    return "esterno";
  }
  if (hasInternal) {
    return "interno";
  }
  return "n/d";
};

export const getTenantCycleDetailById = async (
  tenantId: string,
  cycleId: string,
): Promise<CycleDetailResult> => {
  if (!tenantId || !cycleId) {
    return {
      cycle: null,
      version: null,
      phases: [],
      sourceTable: null,
      versionSourceTable: null,
      phaseSourceTable: null,
      warnings: [],
      error: "Parametri non validi.",
    };
  }

  const warnings: string[] = [];
  const baseDetail = await getTenantCycleById(tenantId, cycleId);
  if (!baseDetail.cycle && !baseDetail.error) {
    return {
      cycle: null,
      version: null,
      phases: [],
      sourceTable: baseDetail.sourceTable,
      versionSourceTable: VERSION_SOURCE_TABLE,
      phaseSourceTable: PHASE_SOURCE_TABLE,
      warnings: baseDetail.warnings,
      error: null,
    };
  }

  warnings.push(...baseDetail.warnings);

  const versionResult = await resolveVersionDetail(tenantId, cycleId);
  if (versionResult.warning) {
    warnings.push(versionResult.warning);
  }

  let phases: CyclePhaseDetail[] = [];
  if (versionResult.versionId) {
    const phaseResult = await resolvePhases(tenantId, versionResult.versionId);
    if (phaseResult.warning) {
      warnings.push(phaseResult.warning);
    } else {
      phases = phaseResult.phases;
    }
  }

  let cycle = baseDetail.cycle;
  if (cycle) {
    const processType = deriveProcessTypeFromPhases(phases);
    const hasQuality =
      phases.length > 0
        ? phases.some((phase) => phase.hasQualityCheck === true)
        : cycle.hasQuality;

    cycle = {
      ...cycle,
      versionNo: versionResult.version?.versionNo ?? cycle.versionNo,
      versionLabel: versionResult.version?.versionLabel ?? cycle.versionLabel,
      status: versionResult.version?.status ?? cycle.status,
      phaseCount: phases.length > 0 ? phases.length : cycle.phaseCount,
      processType: processType !== "n/d" ? processType : cycle.processType,
      hasQuality,
    };
  }

  return {
    cycle,
    version: versionResult.version,
    phases,
    sourceTable: baseDetail.sourceTable,
    versionSourceTable: VERSION_SOURCE_TABLE,
    phaseSourceTable: PHASE_SOURCE_TABLE,
    warnings,
    error: baseDetail.error,
  };
};

