import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type ProcurementCoverageFilter = "all" | "covered" | "partial" | "uncovered";
export type ProcurementMaterialFilter = "all" | "critical" | "standard";
export type ProcurementExecutionModeFilter =
  | "all"
  | "interno"
  | "conto_lavoro"
  | "misto"
  | "nd";

export type CommessaProcurementFilters = {
  q?: string;
  coverage?: string;
  material?: string;
  executionMode?: string;
  status?: string;
};

export type CommessaProcurementCoverageStatus = "covered" | "partial" | "uncovered";
export type CommessaProcurementExecutionMode = "interno" | "conto_lavoro" | "misto" | "nd";

export type CommessaProcurementItem = {
  id: string;
  tenantId: string;
  commessaId: string;
  materialCode: string;
  materialName: string;
  status: string;
  coverageStatus: CommessaProcurementCoverageStatus;
  requiredQty: number | null;
  coveredQty: number | null;
  uncoveredQty: number | null;
  coveragePct: number | null;
  isCritical: boolean;
  executionMode: CommessaProcurementExecutionMode;
  supplierCode: string | null;
  supplierName: string | null;
  documentCode: string | null;
  orderCode: string | null;
  phaseCode: string | null;
  dueDate: string | null;
  note: string | null;
  sourceTable: string;
};

export type CommessaProcurementSummary = {
  itemsTotal: number;
  coveredItems: number;
  partialItems: number;
  uncoveredItems: number;
  criticalItems: number;
  internalItems: number;
  subcontractItems: number;
  mixedItems: number;
  unknownModeItems: number;
  requiredQtyTotal: number | null;
  coveredQtyTotal: number | null;
  uncoveredQtyTotal: number | null;
  avgCoveragePct: number | null;
};

export type CommessaProcurementResult = {
  items: CommessaProcurementItem[];
  statuses: string[];
  executionModes: CommessaProcurementExecutionMode[];
  summary: CommessaProcurementSummary;
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

type RawRow = Record<string, unknown>;

type ProcurementTableCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  parentColumns: string[];
  materialCodeColumns: string[];
  materialNameColumns: string[];
  statusColumns: string[];
  coverageStatusColumns: string[];
  requiredQtyColumns: string[];
  coveredQtyColumns: string[];
  uncoveredQtyColumns: string[];
  coveragePctColumns: string[];
  criticalColumns: string[];
  executionModeColumns: string[];
  externalColumns: string[];
  internalColumns: string[];
  supplierCodeColumns: string[];
  supplierNameColumns: string[];
  documentCodeColumns: string[];
  orderCodeColumns: string[];
  phaseCodeColumns: string[];
  dueDateColumns: string[];
  noteColumns: string[];
};

type QueryRowsResult = {
  exists: boolean;
  rows: RawRow[];
  warning: string | null;
};

const SAFE_LIST_LIMIT = 1800;

const TABLE_CANDIDATES: ProcurementTableCandidate[] = [
  {
    table: "project_procurements",
    idColumns: ["id", "project_procurement_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    coverageStatusColumns: ["coverage_status", "coverage_state", "supply_status"],
    requiredQtyColumns: ["required_qty", "requirement_qty", "planned_qty", "qty_required"],
    coveredQtyColumns: ["covered_qty", "available_qty", "procured_qty", "qty_covered"],
    uncoveredQtyColumns: ["uncovered_qty", "missing_qty", "shortage_qty", "qty_uncovered"],
    coveragePctColumns: ["coverage_pct", "coverage_percent", "coverage_ratio", "coverage"],
    criticalColumns: ["is_critical", "critical_flag", "is_blocking", "criticality_flag"],
    executionModeColumns: ["execution_mode", "process_type", "supply_mode", "fulfillment_mode"],
    externalColumns: ["is_external", "is_outsourced", "subcontracting_required"],
    internalColumns: ["is_internal", "in_house", "internal_supply"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    documentCodeColumns: ["document_no", "purchase_request_no", "purchase_order_no"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no"],
    phaseCodeColumns: ["phase_code", "operation_code", "step_code"],
    dueDateColumns: ["due_date", "required_date", "target_date", "planned_date"],
    noteColumns: ["note", "notes", "description", "remark"],
  },
  {
    table: "project_material_requirements",
    idColumns: ["id", "project_material_requirement_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    coverageStatusColumns: ["coverage_status", "coverage_state", "supply_status"],
    requiredQtyColumns: ["required_qty", "requirement_qty", "planned_qty", "qty_required"],
    coveredQtyColumns: ["covered_qty", "available_qty", "procured_qty", "qty_covered"],
    uncoveredQtyColumns: ["uncovered_qty", "missing_qty", "shortage_qty", "qty_uncovered"],
    coveragePctColumns: ["coverage_pct", "coverage_percent", "coverage_ratio", "coverage"],
    criticalColumns: ["is_critical", "critical_flag", "is_blocking", "criticality_flag"],
    executionModeColumns: ["execution_mode", "process_type", "supply_mode", "fulfillment_mode"],
    externalColumns: ["is_external", "is_outsourced", "subcontracting_required"],
    internalColumns: ["is_internal", "in_house", "internal_supply"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    documentCodeColumns: ["document_no", "purchase_request_no", "purchase_order_no"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no"],
    phaseCodeColumns: ["phase_code", "operation_code", "step_code"],
    dueDateColumns: ["due_date", "required_date", "target_date", "planned_date"],
    noteColumns: ["note", "notes", "description", "remark"],
  },
  {
    table: "procurement_requirements",
    idColumns: ["id", "procurement_requirement_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    coverageStatusColumns: ["coverage_status", "coverage_state", "supply_status"],
    requiredQtyColumns: ["required_qty", "requirement_qty", "planned_qty", "qty_required"],
    coveredQtyColumns: ["covered_qty", "available_qty", "procured_qty", "qty_covered"],
    uncoveredQtyColumns: ["uncovered_qty", "missing_qty", "shortage_qty", "qty_uncovered"],
    coveragePctColumns: ["coverage_pct", "coverage_percent", "coverage_ratio", "coverage"],
    criticalColumns: ["is_critical", "critical_flag", "is_blocking", "criticality_flag"],
    executionModeColumns: ["execution_mode", "process_type", "supply_mode", "fulfillment_mode"],
    externalColumns: ["is_external", "is_outsourced", "subcontracting_required"],
    internalColumns: ["is_internal", "in_house", "internal_supply"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    documentCodeColumns: ["document_no", "purchase_request_no", "purchase_order_no"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no"],
    phaseCodeColumns: ["phase_code", "operation_code", "step_code"],
    dueDateColumns: ["due_date", "required_date", "target_date", "planned_date"],
    noteColumns: ["note", "notes", "description", "remark"],
  },
  {
    table: "purchase_requisition_lines",
    idColumns: ["id", "purchase_requisition_line_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    materialCodeColumns: ["item_code", "material_code", "product_code", "code"],
    materialNameColumns: ["item_name", "material_name", "description", "name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    coverageStatusColumns: ["coverage_status", "coverage_state", "supply_status"],
    requiredQtyColumns: ["required_qty", "request_qty", "planned_qty", "qty_required"],
    coveredQtyColumns: ["approved_qty", "ordered_qty", "covered_qty", "qty_covered"],
    uncoveredQtyColumns: ["uncovered_qty", "missing_qty", "shortage_qty", "qty_uncovered"],
    coveragePctColumns: ["coverage_pct", "coverage_percent", "coverage_ratio", "coverage"],
    criticalColumns: ["is_critical", "critical_flag", "is_blocking", "criticality_flag"],
    executionModeColumns: ["execution_mode", "process_type", "supply_mode"],
    externalColumns: ["is_external", "is_outsourced", "subcontracting_required"],
    internalColumns: ["is_internal", "in_house", "internal_supply"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    documentCodeColumns: ["document_no", "purchase_requisition_no", "request_no"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no"],
    phaseCodeColumns: ["phase_code", "operation_code", "step_code"],
    dueDateColumns: ["due_date", "required_date", "target_date", "planned_date"],
    noteColumns: ["note", "notes", "description", "remark"],
  },
  {
    table: "purchase_order_lines",
    idColumns: ["id", "purchase_order_line_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    materialCodeColumns: ["item_code", "material_code", "product_code", "code"],
    materialNameColumns: ["item_name", "material_name", "description", "name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    coverageStatusColumns: ["coverage_status", "coverage_state", "supply_status"],
    requiredQtyColumns: ["required_qty", "ordered_qty", "planned_qty", "qty_required"],
    coveredQtyColumns: ["received_qty", "covered_qty", "qty_covered", "available_qty"],
    uncoveredQtyColumns: ["uncovered_qty", "missing_qty", "shortage_qty", "qty_uncovered"],
    coveragePctColumns: ["coverage_pct", "coverage_percent", "coverage_ratio", "coverage"],
    criticalColumns: ["is_critical", "critical_flag", "is_blocking", "criticality_flag"],
    executionModeColumns: ["execution_mode", "process_type", "supply_mode"],
    externalColumns: ["is_external", "is_outsourced", "subcontracting_required"],
    internalColumns: ["is_internal", "in_house", "internal_supply"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    documentCodeColumns: ["document_no", "purchase_order_no", "order_no"],
    orderCodeColumns: ["production_order_no", "odp_no", "work_order_no"],
    phaseCodeColumns: ["phase_code", "operation_code", "step_code"],
    dueDateColumns: ["due_date", "delivery_date", "target_date", "planned_date"],
    noteColumns: ["note", "notes", "description", "remark"],
  },
  {
    table: "production_order_materials",
    idColumns: ["id", "production_order_material_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    coverageStatusColumns: ["coverage_status", "coverage_state", "supply_status"],
    requiredQtyColumns: ["required_qty", "planned_qty", "qty_required"],
    coveredQtyColumns: ["issued_qty", "available_qty", "covered_qty", "qty_covered"],
    uncoveredQtyColumns: ["uncovered_qty", "missing_qty", "shortage_qty", "qty_uncovered"],
    coveragePctColumns: ["coverage_pct", "coverage_percent", "coverage_ratio", "coverage"],
    criticalColumns: ["is_critical", "critical_flag", "is_blocking", "criticality_flag"],
    executionModeColumns: ["execution_mode", "process_type", "supply_mode"],
    externalColumns: ["is_external", "is_outsourced", "subcontracting_required"],
    internalColumns: ["is_internal", "in_house", "internal_supply"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    documentCodeColumns: ["document_no", "picking_no", "requisition_no"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no"],
    phaseCodeColumns: ["phase_code", "operation_code", "step_code"],
    dueDateColumns: ["due_date", "required_date", "target_date", "planned_date"],
    noteColumns: ["note", "notes", "description", "remark"],
  },
];

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

const parseString = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? `${value}` : "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
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
    if (
      [
        "true",
        "1",
        "yes",
        "y",
        "si",
        "on",
        "enabled",
        "active",
        "critical",
        "bloccante",
      ].includes(normalized)
    ) {
      return true;
    }
    if (["false", "0", "no", "n", "off", "disabled", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return null;
};

const toDateText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return parsed.toISOString();
};

const readStringFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = parseString(row[key]);
    if (value.length > 0) {
      return value;
    }
  }
  return "";
};

const readNumberFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = parseNumber(row[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
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

const readDateTextFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = toDateText(row[key]);
    if (value) {
      return value;
    }
  }
  return null;
};

const normalizeCoveragePct = (value: number | null) => {
  if (value === null) {
    return null;
  }

  if (value <= 1) {
    return Math.round(Math.max(0, value) * 10000) / 100;
  }

  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
};

const normalizeCoverageStatusFromLabel = (
  value: string,
): CommessaProcurementCoverageStatus | null => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("covered") ||
    normalized.includes("coperto") ||
    normalized.includes("full")
  ) {
    return "covered";
  }
  if (
    normalized.includes("partial") ||
    normalized.includes("parzial") ||
    normalized.includes("in_progress")
  ) {
    return "partial";
  }
  if (
    normalized.includes("uncovered") ||
    normalized.includes("scoperto") ||
    normalized.includes("shortage") ||
    normalized.includes("missing")
  ) {
    return "uncovered";
  }

  return null;
};

const normalizeExecutionMode = (
  row: RawRow,
  candidate: ProcurementTableCandidate,
): CommessaProcurementExecutionMode => {
  const explicitMode = readStringFromKeys(row, candidate.executionModeColumns).toLowerCase();
  if (explicitMode) {
    if (
      explicitMode.includes("misto") ||
      explicitMode.includes("mixed") ||
      explicitMode.includes("hybrid")
    ) {
      return "misto";
    }

    if (
      explicitMode.includes("conto") ||
      explicitMode.includes("estern") ||
      explicitMode.includes("outsour")
    ) {
      return "conto_lavoro";
    }

    if (explicitMode.includes("intern") || explicitMode.includes("in_house")) {
      return "interno";
    }
  }

  const external = readBooleanFromKeys(row, candidate.externalColumns);
  const internal = readBooleanFromKeys(row, candidate.internalColumns);

  if (external === true && internal === true) {
    return "misto";
  }
  if (external === true) {
    return "conto_lavoro";
  }
  if (internal === true) {
    return "interno";
  }

  const supplierEvidence =
    readStringFromKeys(row, candidate.supplierCodeColumns).length > 0 ||
    readStringFromKeys(row, candidate.supplierNameColumns).length > 0;
  if (supplierEvidence) {
    return "conto_lavoro";
  }

  return "nd";
};

const normalizeCriticality = (
  row: RawRow,
  candidate: ProcurementTableCandidate,
  coverageStatus: CommessaProcurementCoverageStatus,
  uncoveredQty: number | null,
) => {
  const explicit = readBooleanFromKeys(row, candidate.criticalColumns);
  if (explicit !== null) {
    return explicit;
  }

  const status = readStringFromKeys(row, candidate.statusColumns).toLowerCase();
  if (
    status.includes("critical") ||
    status.includes("blocc") ||
    status.includes("urgent") ||
    status.includes("late")
  ) {
    return true;
  }

  if (coverageStatus === "uncovered" && uncoveredQty !== null && uncoveredQty > 0) {
    return true;
  }

  return false;
};

const normalizeCoverage = (row: RawRow, candidate: ProcurementTableCandidate) => {
  const requiredQty = readNumberFromKeys(row, candidate.requiredQtyColumns);
  const coveredQtyRaw = readNumberFromKeys(row, candidate.coveredQtyColumns);
  const uncoveredQtyRaw = readNumberFromKeys(row, candidate.uncoveredQtyColumns);
  const explicitCoveragePct = normalizeCoveragePct(readNumberFromKeys(row, candidate.coveragePctColumns));

  let coveredQty = coveredQtyRaw;
  let uncoveredQty = uncoveredQtyRaw;

  if (coveredQty === null && requiredQty !== null && uncoveredQty !== null) {
    coveredQty = Math.max(0, requiredQty - uncoveredQty);
  }

  if (uncoveredQty === null && requiredQty !== null && coveredQty !== null) {
    uncoveredQty = Math.max(0, requiredQty - coveredQty);
  }

  let coveragePct = explicitCoveragePct;
  if (coveragePct === null && requiredQty !== null && requiredQty > 0 && coveredQty !== null) {
    coveragePct = Math.round((Math.max(0, coveredQty / requiredQty) * 100) * 100) / 100;
  }

  if (coveragePct === null && requiredQty === 0) {
    coveragePct = 100;
  }

  const explicitCoverageLabel = readStringFromKeys(row, candidate.coverageStatusColumns);
  let coverageStatus = normalizeCoverageStatusFromLabel(explicitCoverageLabel);

  if (!coverageStatus) {
    if (coveragePct !== null) {
      if (coveragePct >= 99.5) {
        coverageStatus = "covered";
      } else if (coveragePct <= 0.5) {
        coverageStatus = "uncovered";
      } else {
        coverageStatus = "partial";
      }
    } else if (requiredQty !== null && uncoveredQty !== null) {
      if (uncoveredQty <= 0) {
        coverageStatus = "covered";
      } else if (uncoveredQty >= requiredQty) {
        coverageStatus = "uncovered";
      } else {
        coverageStatus = "partial";
      }
    } else {
      const status = readStringFromKeys(row, candidate.statusColumns).toLowerCase();
      coverageStatus = normalizeCoverageStatusFromLabel(status) ?? "partial";
    }
  }

  return {
    requiredQty,
    coveredQty,
    uncoveredQty,
    coveragePct,
    coverageStatus,
  };
};

const queryCandidateRows = async (
  candidate: ProcurementTableCandidate,
  tenantId: string,
  commessaId: string,
  limit: number,
): Promise<QueryRowsResult> => {
  const admin = getSupabaseAdminClient();

  for (const parentColumn of candidate.parentColumns) {
    for (const tenantColumn of candidate.tenantColumns) {
      const { data, error } = await admin
        .from(candidate.table)
        .select("*")
        .eq(parentColumn, commessaId)
        .eq(tenantColumn, tenantId)
        .limit(limit);

      if (!error) {
        return {
          exists: true,
          rows: (data ?? []) as RawRow[],
          warning: null,
        };
      }

      const message = error.message ?? "Unknown query error";
      if (
        looksLikeMissingTable(message) ||
        looksLikeMissingColumn(message, parentColumn) ||
        looksLikeMissingColumn(message, tenantColumn)
      ) {
        continue;
      }

      return {
        exists: true,
        rows: [],
        warning: `Errore su ${candidate.table}: ${message}`,
      };
    }
  }

  for (const parentColumn of candidate.parentColumns) {
    const { data, error } = await admin
      .from(candidate.table)
      .select("*")
      .eq(parentColumn, commessaId)
      .limit(limit);

    if (!error) {
      const scopedRows = ((data ?? []) as RawRow[]).filter((row) => {
        const rowTenant = readStringFromKeys(row, candidate.tenantColumns);
        return !rowTenant || rowTenant === tenantId;
      });

      return {
        exists: true,
        rows: scopedRows,
        warning: null,
      };
    }

    const message = error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, parentColumn)) {
      continue;
    }

    return {
      exists: true,
      rows: [],
      warning: `Errore su ${candidate.table}: ${message}`,
    };
  }

  const fallback = await admin.from(candidate.table).select("*").limit(limit);
  if (fallback.error) {
    const message = fallback.error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message)) {
      return {
        exists: false,
        rows: [],
        warning: null,
      };
    }

    return {
      exists: true,
      rows: [],
      warning: `Errore su ${candidate.table}: ${message}`,
    };
  }

  const scopedRows = ((fallback.data ?? []) as RawRow[]).filter((row) => {
    const rowTenant = readStringFromKeys(row, candidate.tenantColumns);
    const parent = readStringFromKeys(row, candidate.parentColumns);
    return rowTenant === tenantId && parent === commessaId;
  });

  return {
    exists: true,
    rows: scopedRows,
    warning: null,
  };
};

const normalizeRow = (
  row: RawRow,
  candidate: ProcurementTableCandidate,
  tenantId: string,
  commessaId: string,
  rowIndex: number,
): CommessaProcurementItem | null => {
  const id = readStringFromKeys(row, candidate.idColumns) || `${candidate.table}-${commessaId}-${rowIndex}`;
  if (!id) {
    return null;
  }

  const materialCode =
    readStringFromKeys(row, candidate.materialCodeColumns) ||
    readStringFromKeys(row, candidate.documentCodeColumns) ||
    `MAT-${rowIndex + 1}`;
  const materialName =
    readStringFromKeys(row, candidate.materialNameColumns) ||
    readStringFromKeys(row, candidate.noteColumns) ||
    materialCode;
  const status = readStringFromKeys(row, candidate.statusColumns) || "unknown";
  const coverage = normalizeCoverage(row, candidate);
  const executionMode = normalizeExecutionMode(row, candidate);
  const critical = normalizeCriticality(
    row,
    candidate,
    coverage.coverageStatus,
    coverage.uncoveredQty,
  );

  return {
    id,
    tenantId: readStringFromKeys(row, candidate.tenantColumns) || tenantId,
    commessaId,
    materialCode,
    materialName,
    status,
    coverageStatus: coverage.coverageStatus,
    requiredQty: coverage.requiredQty,
    coveredQty: coverage.coveredQty,
    uncoveredQty: coverage.uncoveredQty,
    coveragePct: coverage.coveragePct,
    isCritical: critical,
    executionMode,
    supplierCode: readStringFromKeys(row, candidate.supplierCodeColumns) || null,
    supplierName: readStringFromKeys(row, candidate.supplierNameColumns) || null,
    documentCode: readStringFromKeys(row, candidate.documentCodeColumns) || null,
    orderCode: readStringFromKeys(row, candidate.orderCodeColumns) || null,
    phaseCode: readStringFromKeys(row, candidate.phaseCodeColumns) || null,
    dueDate: readDateTextFromKeys(row, candidate.dueDateColumns),
    note: readStringFromKeys(row, candidate.noteColumns) || null,
    sourceTable: candidate.table,
  };
};

const normalizeCoverageFilter = (value: string | undefined): ProcurementCoverageFilter => {
  if (value === "covered" || value === "partial" || value === "uncovered") {
    return value;
  }
  return "all";
};

const normalizeMaterialFilter = (value: string | undefined): ProcurementMaterialFilter => {
  if (value === "critical" || value === "standard") {
    return value;
  }
  return "all";
};

const normalizeExecutionModeFilter = (
  value: string | undefined,
): ProcurementExecutionModeFilter => {
  if (
    value === "interno" ||
    value === "conto_lavoro" ||
    value === "misto" ||
    value === "nd"
  ) {
    return value;
  }
  return "all";
};

const applyFilters = (
  items: CommessaProcurementItem[],
  filters: CommessaProcurementFilters,
) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const coverageFilter = normalizeCoverageFilter(filters.coverage);
  const materialFilter = normalizeMaterialFilter(filters.material);
  const executionModeFilter = normalizeExecutionModeFilter(filters.executionMode);
  const statusFilter = (filters.status ?? "all").trim().toLowerCase();

  return items.filter((item) => {
    if (query) {
      const haystack = [
        item.materialCode,
        item.materialName,
        item.status,
        item.supplierCode ?? "",
        item.supplierName ?? "",
        item.documentCode ?? "",
        item.orderCode ?? "",
        item.phaseCode ?? "",
        item.note ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (coverageFilter !== "all" && item.coverageStatus !== coverageFilter) {
      return false;
    }

    if (materialFilter === "critical" && !item.isCritical) {
      return false;
    }
    if (materialFilter === "standard" && item.isCritical) {
      return false;
    }

    if (executionModeFilter !== "all" && item.executionMode !== executionModeFilter) {
      return false;
    }

    if (statusFilter !== "all" && item.status.toLowerCase() !== statusFilter) {
      return false;
    }

    return true;
  });
};

const safeDateValue = (value: string | null) => {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return Number.MAX_SAFE_INTEGER;
  }
  return parsed.getTime();
};

const coverageRank = (value: CommessaProcurementCoverageStatus) => {
  if (value === "uncovered") {
    return 0;
  }
  if (value === "partial") {
    return 1;
  }
  return 2;
};

const sortItems = (items: CommessaProcurementItem[]) =>
  [...items].sort((left, right) => {
    if (left.isCritical !== right.isCritical) {
      return left.isCritical ? -1 : 1;
    }

    const byCoverage = coverageRank(left.coverageStatus) - coverageRank(right.coverageStatus);
    if (byCoverage !== 0) {
      return byCoverage;
    }

    const byDueDate = safeDateValue(left.dueDate) - safeDateValue(right.dueDate);
    if (byDueDate !== 0) {
      return byDueDate;
    }

    return left.materialCode.localeCompare(right.materialCode, "it");
  });

const dedupeItems = (items: CommessaProcurementItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.sourceTable}:${item.id}:${item.materialCode}:${item.executionMode}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const uniqueValues = (items: string[]) =>
  [...new Set(items.map((item) => item.trim()).filter((item) => item.length > 0))].sort(
    (left, right) => left.localeCompare(right, "it"),
  );

const avg = (values: Array<number | null>) => {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length === 0) {
    return null;
  }

  const total = numbers.reduce((sum, value) => sum + value, 0);
  return Math.round((total / numbers.length) * 100) / 100;
};

const sumOrNull = (values: Array<number | null>) => {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length === 0) {
    return null;
  }
  return numbers.reduce((sum, value) => sum + value, 0);
};

const buildSummary = (items: CommessaProcurementItem[]): CommessaProcurementSummary => ({
  itemsTotal: items.length,
  coveredItems: items.filter((item) => item.coverageStatus === "covered").length,
  partialItems: items.filter((item) => item.coverageStatus === "partial").length,
  uncoveredItems: items.filter((item) => item.coverageStatus === "uncovered").length,
  criticalItems: items.filter((item) => item.isCritical).length,
  internalItems: items.filter((item) => item.executionMode === "interno").length,
  subcontractItems: items.filter((item) => item.executionMode === "conto_lavoro").length,
  mixedItems: items.filter((item) => item.executionMode === "misto").length,
  unknownModeItems: items.filter((item) => item.executionMode === "nd").length,
  requiredQtyTotal: sumOrNull(items.map((item) => item.requiredQty)),
  coveredQtyTotal: sumOrNull(items.map((item) => item.coveredQty)),
  uncoveredQtyTotal: sumOrNull(items.map((item) => item.uncoveredQty)),
  avgCoveragePct: avg(items.map((item) => item.coveragePct)),
});

const buildProcurement = async (
  tenantId: string,
  commessaId: string,
  filters: CommessaProcurementFilters,
): Promise<CommessaProcurementResult> => {
  const warnings: string[] = [];
  const sourceTables = new Set<string>();
  const allItems: CommessaProcurementItem[] = [];

  for (const candidate of TABLE_CANDIDATES) {
    const result = await queryCandidateRows(candidate, tenantId, commessaId, SAFE_LIST_LIMIT);
    if (result.warning) {
      warnings.push(result.warning);
    }

    if (!result.exists) {
      continue;
    }

    sourceTables.add(candidate.table);
    result.rows.forEach((row, index) => {
      const normalized = normalizeRow(row, candidate, tenantId, commessaId, index);
      if (normalized) {
        allItems.push(normalized);
      }
    });
  }

  if (sourceTables.size === 0) {
    return {
      items: [],
      statuses: [],
      executionModes: [],
      summary: buildSummary([]),
      sourceTables: [],
      warnings,
      emptyStateHint:
        "Nessuna sorgente approvvigionamenti disponibile nel DB esposto per la commessa selezionata.",
      error: null,
    };
  }

  const deduped = dedupeItems(allItems);
  const sorted = sortItems(deduped);
  const filtered = applyFilters(sorted, filters);
  const statuses = uniqueValues(sorted.map((item) => item.status));
  const executionModes = uniqueValues(sorted.map((item) => item.executionMode)) as CommessaProcurementExecutionMode[];

  let emptyStateHint: string | null = null;
  if (sorted.length === 0) {
    emptyStateHint =
      "Nessun fabbisogno di approvvigionamento collegato alla commessa nel tenant selezionato.";
  } else if (filtered.length === 0) {
    emptyStateHint = "Nessuna riga approvvigionamento trovata con i filtri correnti.";
  }

  return {
    items: filtered,
    statuses,
    executionModes,
    summary: buildSummary(filtered),
    sourceTables: [...sourceTables].sort((left, right) => left.localeCompare(right, "it")),
    warnings,
    emptyStateHint,
    error: null,
  };
};

export const getTenantCommessaProcurement = async (
  tenantId: string,
  commessaId: string,
  filters: CommessaProcurementFilters,
): Promise<CommessaProcurementResult> => {
  if (!tenantId || !commessaId) {
    return {
      items: [],
      statuses: [],
      executionModes: [],
      summary: buildSummary([]),
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Parametri non validi.",
    };
  }

  try {
    return await buildProcurement(tenantId, commessaId, filters);
  } catch (caughtError) {
    return {
      items: [],
      statuses: [],
      executionModes: [],
      summary: buildSummary([]),
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};
