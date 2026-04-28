import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type OdpBinaryFilter = "all" | "yes" | "no";
export type OdpDelayFilter = "all" | "late" | "on-time";

export type OdpCatalogFilters = {
  q?: string;
  status?: string;
  delay?: OdpDelayFilter;
  criticality?: OdpBinaryFilter;
  linkedProject?: OdpBinaryFilter;
  origin?: string;
};

export type OdpListItem = {
  id: string;
  tenantId: string;
  commessaId: string | null;
  commessaCode: string | null;
  code: string;
  name: string;
  status: string;
  progressPct: number | null;
  isDelayed: boolean;
  delayDays: number | null;
  isBlocked: boolean;
  openIssues: number | null;
  hasCriticality: boolean;
  phaseCount: number | null;
  completedPhases: number | null;
  qtyPlanned: number | null;
  qtyProduced: number | null;
  qtyScrapped: number | null;
  qtyResidual: number | null;
  isExternal: boolean | null;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  origin: string;
  sourceTable: string;
};

export type OdpDetailResult = {
  order: OdpListItem | null;
  sourceTable: string | null;
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

export type OdpPhaseFilters = {
  q?: string;
  status?: string;
  delay?: OdpDelayFilter;
  blocked?: OdpBinaryFilter;
  external?: OdpBinaryFilter;
  quality?: OdpBinaryFilter;
};

export type OdpPhaseItem = {
  id: string;
  tenantId: string;
  odpId: string;
  odpCode: string | null;
  phaseNo: number | null;
  phaseCode: string;
  phaseName: string;
  status: string;
  progressPct: number | null;
  isDelayed: boolean;
  delayDays: number | null;
  isBlocked: boolean;
  isExternal: boolean | null;
  hasQuality: boolean | null;
  openIssues: number | null;
  startedAt: string | null;
  dueDate: string | null;
  completedAt: string | null;
  sourceTable: string;
};

export type OdpPhaseTimelineEvent = {
  id: string;
  at: string | null;
  title: string;
  detail: string;
  sourceTable: string;
};

export type OdpPhaseSummary = {
  total: number;
  delayed: number;
  blocked: number;
  external: number;
  withQuality: number;
  completed: number;
  avgProgressPct: number | null;
};

export type OdpPhaseResult = {
  order: OdpListItem | null;
  phases: OdpPhaseItem[];
  timeline: OdpPhaseTimelineEvent[];
  statuses: string[];
  summary: OdpPhaseSummary;
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

export type OdpCatalogSummary = {
  total: number;
  delayed: number;
  blocked: number;
  critical: number;
  linkedToCommessa: number;
  avgProgressPct: number | null;
};

export type OdpCatalogResult = {
  orders: OdpListItem[];
  statuses: string[];
  origins: string[];
  summary: OdpCatalogSummary;
  sourceTable: string | null;
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

type RawRow = Record<string, unknown>;

type OdpTableCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  commessaColumns: string[];
  commessaCodeColumns: string[];
  codeColumns: string[];
  nameColumns: string[];
  statusColumns: string[];
  progressColumns: string[];
  delayColumns: string[];
  dueDateColumns: string[];
  blockedColumns: string[];
  openIssueColumns: string[];
  criticalityColumns: string[];
  phaseCountColumns: string[];
  completedPhaseColumns: string[];
  qtyPlannedColumns: string[];
  qtyProducedColumns: string[];
  qtyScrappedColumns: string[];
  qtyResidualColumns: string[];
  externalColumns: string[];
  startedAtColumns: string[];
  completedAtColumns: string[];
  originColumns: string[];
};

type OdpPhaseTableCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  orderColumns: string[];
  orderCodeColumns: string[];
  phaseNoColumns: string[];
  phaseCodeColumns: string[];
  phaseNameColumns: string[];
  statusColumns: string[];
  progressColumns: string[];
  delayColumns: string[];
  dueDateColumns: string[];
  blockedColumns: string[];
  externalColumns: string[];
  qualityColumns: string[];
  openIssueColumns: string[];
  startedAtColumns: string[];
  completedAtColumns: string[];
};

type CandidateRowsBundle = {
  candidate: OdpTableCandidate;
  rows: RawRow[];
};

type QueryRowsResult = {
  exists: boolean;
  rows: RawRow[];
  warning: string | null;
};

const SAFE_LIST_LIMIT = 1500;

const TABLE_CANDIDATES: OdpTableCandidate[] = [
  {
    table: "production_orders",
    idColumns: ["id", "production_order_id", "order_id", "odp_id"],
    tenantColumns: ["tenant_id", "tenant_uuid"],
    commessaColumns: ["project_id", "commessa_id", "job_id"],
    commessaCodeColumns: ["project_code", "commessa_code", "job_code"],
    codeColumns: ["document_no", "production_order_no", "order_no", "code"],
    nameColumns: ["title", "description", "name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status", "is_active"],
    progressColumns: [
      "progress_pct",
      "completion_pct",
      "completion_percent",
      "progress_ratio",
      "progress",
    ],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "target_date", "planned_end_date"],
    blockedColumns: ["is_blocked", "has_blocking_issue", "blocked_flag", "blocker_count"],
    openIssueColumns: ["open_issue_count", "criticality_count", "open_alert_count", "issue_count"],
    criticalityColumns: ["has_critical_issue", "is_critical", "has_anomaly"],
    phaseCountColumns: ["phase_count", "steps_count", "operations_count"],
    completedPhaseColumns: [
      "completed_phase_count",
      "completed_steps_count",
      "completed_operations_count",
    ],
    qtyPlannedColumns: [
      "qty_planned",
      "planned_qty",
      "quantity_planned",
      "target_qty",
      "qty_total",
    ],
    qtyProducedColumns: [
      "qty_produced",
      "produced_qty",
      "quantity_produced",
      "completed_qty",
      "qty_done",
    ],
    qtyScrappedColumns: [
      "qty_scrapped",
      "scrap_qty",
      "waste_qty",
      "rejected_qty",
      "qty_rejected",
    ],
    qtyResidualColumns: [
      "qty_residual",
      "residual_qty",
      "qty_remaining",
      "remaining_qty",
      "open_qty",
    ],
    externalColumns: ["is_external", "is_outsourced", "execution_mode", "process_type"],
    startedAtColumns: ["started_at", "actual_start_at", "production_start_at", "planned_start_at"],
    completedAtColumns: ["completed_at", "actual_end_at", "production_end_at"],
    originColumns: ["origin_type", "source_type", "origin", "origin_document_type", "origin_module"],
  },
  {
    table: "production_order_overviews",
    idColumns: ["id", "production_order_id", "order_id", "odp_id"],
    tenantColumns: ["tenant_id", "tenant_uuid"],
    commessaColumns: ["project_id", "commessa_id", "job_id"],
    commessaCodeColumns: ["project_code", "commessa_code", "job_code"],
    codeColumns: ["document_no", "production_order_no", "order_no", "code"],
    nameColumns: ["title", "description", "name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status", "is_active"],
    progressColumns: [
      "progress_pct",
      "completion_pct",
      "completion_percent",
      "progress_ratio",
      "progress",
    ],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "target_date", "planned_end_date"],
    blockedColumns: ["is_blocked", "has_blocking_issue", "blocked_flag", "blocker_count"],
    openIssueColumns: ["open_issue_count", "criticality_count", "open_alert_count", "issue_count"],
    criticalityColumns: ["has_critical_issue", "is_critical", "has_anomaly"],
    phaseCountColumns: ["phase_count", "steps_count", "operations_count"],
    completedPhaseColumns: [
      "completed_phase_count",
      "completed_steps_count",
      "completed_operations_count",
    ],
    qtyPlannedColumns: [
      "qty_planned",
      "planned_qty",
      "quantity_planned",
      "target_qty",
      "qty_total",
    ],
    qtyProducedColumns: [
      "qty_produced",
      "produced_qty",
      "quantity_produced",
      "completed_qty",
      "qty_done",
    ],
    qtyScrappedColumns: [
      "qty_scrapped",
      "scrap_qty",
      "waste_qty",
      "rejected_qty",
      "qty_rejected",
    ],
    qtyResidualColumns: [
      "qty_residual",
      "residual_qty",
      "qty_remaining",
      "remaining_qty",
      "open_qty",
    ],
    externalColumns: ["is_external", "is_outsourced", "execution_mode", "process_type"],
    startedAtColumns: ["started_at", "actual_start_at", "production_start_at", "planned_start_at"],
    completedAtColumns: ["completed_at", "actual_end_at", "production_end_at"],
    originColumns: ["origin_type", "source_type", "origin", "origin_document_type", "origin_module"],
  },
  {
    table: "work_orders",
    idColumns: ["id", "work_order_id", "order_id"],
    tenantColumns: ["tenant_id", "tenant_uuid"],
    commessaColumns: ["project_id", "commessa_id", "job_id"],
    commessaCodeColumns: ["project_code", "commessa_code", "job_code"],
    codeColumns: ["document_no", "work_order_no", "order_no", "code"],
    nameColumns: ["title", "description", "name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status", "is_active"],
    progressColumns: [
      "progress_pct",
      "completion_pct",
      "completion_percent",
      "progress_ratio",
      "progress",
    ],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "target_date", "planned_end_date"],
    blockedColumns: ["is_blocked", "has_blocking_issue", "blocked_flag", "blocker_count"],
    openIssueColumns: ["open_issue_count", "criticality_count", "open_alert_count", "issue_count"],
    criticalityColumns: ["has_critical_issue", "is_critical", "has_anomaly"],
    phaseCountColumns: ["phase_count", "steps_count", "operations_count"],
    completedPhaseColumns: [
      "completed_phase_count",
      "completed_steps_count",
      "completed_operations_count",
    ],
    qtyPlannedColumns: [
      "qty_planned",
      "planned_qty",
      "quantity_planned",
      "target_qty",
      "qty_total",
    ],
    qtyProducedColumns: [
      "qty_produced",
      "produced_qty",
      "quantity_produced",
      "completed_qty",
      "qty_done",
    ],
    qtyScrappedColumns: [
      "qty_scrapped",
      "scrap_qty",
      "waste_qty",
      "rejected_qty",
      "qty_rejected",
    ],
    qtyResidualColumns: [
      "qty_residual",
      "residual_qty",
      "qty_remaining",
      "remaining_qty",
      "open_qty",
    ],
    externalColumns: ["is_external", "is_outsourced", "execution_mode", "process_type"],
    startedAtColumns: ["started_at", "actual_start_at", "production_start_at", "planned_start_at"],
    completedAtColumns: ["completed_at", "actual_end_at", "production_end_at"],
    originColumns: ["origin_type", "source_type", "origin", "origin_document_type", "origin_module"],
  },
];

const ODP_PHASE_TABLE_CANDIDATES: OdpPhaseTableCandidate[] = [
  {
    table: "production_order_phases",
    idColumns: ["id", "production_order_phase_id", "phase_id"],
    tenantColumns: ["tenant_id", "tenant_uuid"],
    orderColumns: ["production_order_id", "order_id", "odp_id"],
    orderCodeColumns: ["production_order_no", "order_no", "order_code", "document_no", "code"],
    phaseNoColumns: ["phase_no", "step_no", "sequence_no", "line_no"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code", "code"],
    phaseNameColumns: ["phase_name", "step_name", "operation_name", "name", "description"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    progressColumns: [
      "progress_pct",
      "completion_pct",
      "completion_percent",
      "progress_ratio",
      "progress",
    ],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "target_date", "planned_end_date"],
    blockedColumns: ["is_blocked", "has_blocking_issue", "blocked_flag", "blocker_count"],
    externalColumns: ["is_external", "is_outsourced", "phase_type", "execution_type", "process_type"],
    qualityColumns: ["has_quality_check", "quality_required", "requires_quality", "quality_enabled"],
    openIssueColumns: ["open_issue_count", "criticality_count", "open_alert_count", "issue_count"],
    startedAtColumns: [
      "started_at",
      "actual_start_at",
      "production_start_at",
      "started_on",
      "start_at",
    ],
    completedAtColumns: [
      "completed_at",
      "actual_end_at",
      "production_end_at",
      "finished_at",
      "ended_at",
    ],
  },
  {
    table: "production_order_steps",
    idColumns: ["id", "production_order_step_id", "phase_id", "step_id"],
    tenantColumns: ["tenant_id", "tenant_uuid"],
    orderColumns: ["production_order_id", "order_id", "odp_id"],
    orderCodeColumns: ["production_order_no", "order_no", "order_code", "document_no", "code"],
    phaseNoColumns: ["phase_no", "step_no", "sequence_no", "line_no"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code", "code"],
    phaseNameColumns: ["phase_name", "step_name", "operation_name", "name", "description"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    progressColumns: [
      "progress_pct",
      "completion_pct",
      "completion_percent",
      "progress_ratio",
      "progress",
    ],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "target_date", "planned_end_date"],
    blockedColumns: ["is_blocked", "has_blocking_issue", "blocked_flag", "blocker_count"],
    externalColumns: ["is_external", "is_outsourced", "phase_type", "execution_type", "process_type"],
    qualityColumns: ["has_quality_check", "quality_required", "requires_quality", "quality_enabled"],
    openIssueColumns: ["open_issue_count", "criticality_count", "open_alert_count", "issue_count"],
    startedAtColumns: [
      "started_at",
      "actual_start_at",
      "production_start_at",
      "started_on",
      "start_at",
    ],
    completedAtColumns: [
      "completed_at",
      "actual_end_at",
      "production_end_at",
      "finished_at",
      "ended_at",
    ],
  },
  {
    table: "production_phase_instances",
    idColumns: ["id", "production_phase_instance_id", "phase_id"],
    tenantColumns: ["tenant_id", "tenant_uuid"],
    orderColumns: ["production_order_id", "order_id", "odp_id"],
    orderCodeColumns: ["production_order_no", "order_no", "order_code", "document_no", "code"],
    phaseNoColumns: ["phase_no", "step_no", "sequence_no", "line_no"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code", "code"],
    phaseNameColumns: ["phase_name", "step_name", "operation_name", "name", "description"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    progressColumns: [
      "progress_pct",
      "completion_pct",
      "completion_percent",
      "progress_ratio",
      "progress",
    ],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "target_date", "planned_end_date"],
    blockedColumns: ["is_blocked", "has_blocking_issue", "blocked_flag", "blocker_count"],
    externalColumns: ["is_external", "is_outsourced", "phase_type", "execution_type", "process_type"],
    qualityColumns: ["has_quality_check", "quality_required", "requires_quality", "quality_enabled"],
    openIssueColumns: ["open_issue_count", "criticality_count", "open_alert_count", "issue_count"],
    startedAtColumns: [
      "started_at",
      "actual_start_at",
      "production_start_at",
      "started_on",
      "start_at",
    ],
    completedAtColumns: [
      "completed_at",
      "actual_end_at",
      "production_end_at",
      "finished_at",
      "ended_at",
    ],
  },
];

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

const parseString = (value: unknown) => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : "";
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
        "on",
        "enabled",
        "active",
        "external",
        "esterna",
        "outsourced",
      ].includes(normalized)
    ) {
      return true;
    }
    if (
      [
        "false",
        "0",
        "no",
        "n",
        "off",
        "disabled",
        "inactive",
        "internal",
        "interna",
      ].includes(normalized)
    ) {
      return false;
    }
  }

  return null;
};

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
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

const readDateFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = parseDate(row[key]);
    if (value) {
      return value;
    }
  }
  return null;
};

const readDateTextFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = parseString(row[key]);
    if (value) {
      return value;
    }
  }
  return null;
};

const parseStatus = (row: RawRow, candidate: OdpTableCandidate) => {
  const stringStatus = readStringFromKeys(row, candidate.statusColumns);
  if (stringStatus) {
    return stringStatus;
  }

  const boolStatus = readBooleanFromKeys(row, candidate.statusColumns);
  if (boolStatus !== null) {
    return boolStatus ? "active" : "inactive";
  }

  return "unknown";
};

const parseProgress = (row: RawRow, candidate: OdpTableCandidate) => {
  const value = readNumberFromKeys(row, candidate.progressColumns);
  if (value === null) {
    return null;
  }
  if (value <= 1) {
    return Math.round(Math.max(0, value) * 10000) / 100;
  }
  return Math.round(Math.max(0, value) * 100) / 100;
};

const parseProgressFromColumns = (row: RawRow, progressColumns: string[]) => {
  const value = readNumberFromKeys(row, progressColumns);
  if (value === null) {
    return null;
  }
  if (value <= 1) {
    return Math.round(Math.max(0, value) * 10000) / 100;
  }
  return Math.round(Math.max(0, value) * 100) / 100;
};

const parseDelay = (row: RawRow, candidate: OdpTableCandidate) => {
  const explicit = readNumberFromKeys(row, candidate.delayColumns);
  if (explicit !== null) {
    const rounded = Math.floor(explicit);
    return {
      isDelayed: rounded > 0,
      delayDays: rounded > 0 ? rounded : 0,
    };
  }

  const dueDate = readDateFromKeys(row, candidate.dueDateColumns);
  if (!dueDate) {
    return {
      isDelayed: false,
      delayDays: null as number | null,
    };
  }

  const millis = Date.now() - dueDate.getTime();
  const days = Math.floor(millis / (1000 * 60 * 60 * 24));
  return {
    isDelayed: days > 0,
    delayDays: days > 0 ? days : 0,
  };
};

const resolveDelayFromColumns = (
  row: RawRow,
  delayColumns: string[],
  dueDateColumns: string[],
) => {
  const explicit = readNumberFromKeys(row, delayColumns);
  if (explicit !== null) {
    const rounded = Math.floor(explicit);
    return {
      isDelayed: rounded > 0,
      delayDays: rounded > 0 ? rounded : 0,
    };
  }

  const dueDate = readDateFromKeys(row, dueDateColumns);
  if (!dueDate) {
    return {
      isDelayed: false,
      delayDays: null as number | null,
    };
  }

  const millis = Date.now() - dueDate.getTime();
  const days = Math.floor(millis / (1000 * 60 * 60 * 24));
  return {
    isDelayed: days > 0,
    delayDays: days > 0 ? days : 0,
  };
};

const parseOrigin = (row: RawRow, candidate: OdpTableCandidate) => {
  const explicit = readStringFromKeys(row, candidate.originColumns);
  if (explicit) {
    return explicit;
  }

  if (candidate.table === "production_order_overviews") {
    return "read-model";
  }

  if (candidate.table === "production_orders") {
    return "operativo";
  }

  return candidate.table;
};

const normalizeRow = (
  row: RawRow,
  candidate: OdpTableCandidate,
  tenantId: string,
): OdpListItem | null => {
  const id = readStringFromKeys(row, candidate.idColumns);
  if (!id) {
    return null;
  }

  const code = readStringFromKeys(row, candidate.codeColumns) || id;
  const name = readStringFromKeys(row, candidate.nameColumns) || code;
  const status = parseStatus(row, candidate);
  const progressPct = parseProgress(row, candidate);
  const delay = parseDelay(row, candidate);
  const blocked =
    readBooleanFromKeys(row, candidate.blockedColumns) ??
    ((readNumberFromKeys(row, candidate.blockedColumns) ?? 0) > 0);
  const openIssues = readNumberFromKeys(row, candidate.openIssueColumns);
  const explicitCriticality = readBooleanFromKeys(row, candidate.criticalityColumns);
  const hasCriticality =
    explicitCriticality ?? (blocked || (openIssues !== null && openIssues > 0));

  const commessaId = readStringFromKeys(row, candidate.commessaColumns) || null;
  const commessaCode =
    readStringFromKeys(row, candidate.commessaCodeColumns) || (commessaId ?? null);

  return {
    id,
    tenantId: readStringFromKeys(row, candidate.tenantColumns) || tenantId,
    commessaId,
    commessaCode,
    code,
    name,
    status,
    progressPct,
    isDelayed: delay.isDelayed,
    delayDays: delay.delayDays,
    isBlocked: blocked,
    openIssues,
    hasCriticality,
    phaseCount: readNumberFromKeys(row, candidate.phaseCountColumns),
    completedPhases: readNumberFromKeys(row, candidate.completedPhaseColumns),
    qtyPlanned: readNumberFromKeys(row, candidate.qtyPlannedColumns),
    qtyProduced: readNumberFromKeys(row, candidate.qtyProducedColumns),
    qtyScrapped: readNumberFromKeys(row, candidate.qtyScrappedColumns),
    qtyResidual: readNumberFromKeys(row, candidate.qtyResidualColumns),
    isExternal: readBooleanFromKeys(row, candidate.externalColumns),
    dueDate: readDateTextFromKeys(row, candidate.dueDateColumns),
    startedAt: readDateTextFromKeys(row, candidate.startedAtColumns),
    completedAt: readDateTextFromKeys(row, candidate.completedAtColumns),
    origin: parseOrigin(row, candidate),
    sourceTable: candidate.table,
  };
};

const queryCandidateRows = async (
  candidate: OdpTableCandidate,
  tenantId: string,
  limit: number,
): Promise<QueryRowsResult> => {
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
        warning: null,
      };
    }

    const message = error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, tenantColumn)) {
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

  const rows = ((fallback.data ?? []) as RawRow[]).filter((row) => {
    const rowTenant = readStringFromKeys(row, candidate.tenantColumns);
    return rowTenant === tenantId;
  });

  return {
    exists: true,
    rows,
    warning: null,
  };
};

const normalizeBinaryFilter = (value: OdpBinaryFilter | string | undefined): OdpBinaryFilter => {
  if (value === "yes" || value === "no") {
    return value;
  }
  return "all";
};

const normalizeDelayFilter = (value: OdpDelayFilter | string | undefined): OdpDelayFilter => {
  if (value === "late" || value === "on-time") {
    return value;
  }
  return "all";
};

const matchesBinaryFilter = (value: boolean, filter: OdpBinaryFilter) => {
  if (filter === "all") {
    return true;
  }
  return filter === "yes" ? value : !value;
};

const matchesDelayFilter = (value: boolean, filter: OdpDelayFilter) => {
  if (filter === "all") {
    return true;
  }
  return filter === "late" ? value : !value;
};

const applyFilters = (items: OdpListItem[], filters: OdpCatalogFilters) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const selectedStatus = (filters.status ?? "all").trim().toLowerCase();
  const selectedOrigin = (filters.origin ?? "all").trim().toLowerCase();
  const delayFilter = normalizeDelayFilter(filters.delay);
  const criticalityFilter = normalizeBinaryFilter(filters.criticality);
  const linkedProjectFilter = normalizeBinaryFilter(filters.linkedProject);

  return items.filter((item) => {
    if (query) {
      const haystack = [
        item.code,
        item.name,
        item.status,
        item.origin,
        item.commessaCode ?? "",
        item.commessaId ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (selectedStatus !== "all" && item.status.toLowerCase() !== selectedStatus) {
      return false;
    }

    if (selectedOrigin !== "all" && item.origin.toLowerCase() !== selectedOrigin) {
      return false;
    }

    if (!matchesDelayFilter(item.isDelayed, delayFilter)) {
      return false;
    }

    if (!matchesBinaryFilter(item.hasCriticality, criticalityFilter)) {
      return false;
    }

    if (!matchesBinaryFilter(item.commessaId !== null, linkedProjectFilter)) {
      return false;
    }

    return true;
  });
};

const safeDate = (value: string | null) => {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return Number.MAX_SAFE_INTEGER;
  }
  return parsed.getTime();
};

const sortItems = (items: OdpListItem[]) => {
  return [...items].sort((left, right) => {
    if (left.isBlocked !== right.isBlocked) {
      return left.isBlocked ? -1 : 1;
    }

    if (left.isDelayed !== right.isDelayed) {
      return left.isDelayed ? -1 : 1;
    }

    if (left.hasCriticality !== right.hasCriticality) {
      return left.hasCriticality ? -1 : 1;
    }

    const byDueDate = safeDate(left.dueDate) - safeDate(right.dueDate);
    if (byDueDate !== 0) {
      return byDueDate;
    }

    return left.code.localeCompare(right.code, "it");
  });
};

const dedupeItems = (items: OdpListItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
};

const uniqueValues = (items: string[]) =>
  [...new Set(items.map((item) => item.trim()).filter((item) => item.length > 0))].sort(
    (left, right) => left.localeCompare(right, "it"),
  );

const avgProgress = (items: OdpListItem[]) => {
  const values = items
    .map((item) => item.progressPct)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 100) / 100;
};

const buildSummary = (items: OdpListItem[]): OdpCatalogSummary => ({
  total: items.length,
  delayed: items.filter((item) => item.isDelayed).length,
  blocked: items.filter((item) => item.isBlocked).length,
  critical: items.filter((item) => item.hasCriticality).length,
  linkedToCommessa: items.filter((item) => item.commessaId !== null).length,
  avgProgressPct: avgProgress(items),
});

const loadCandidateRows = async (tenantId: string) => {
  const warnings: string[] = [];
  const availableCandidates: CandidateRowsBundle[] = [];

  for (const candidate of TABLE_CANDIDATES) {
    const result = await queryCandidateRows(candidate, tenantId, SAFE_LIST_LIMIT);
    if (result.warning) {
      warnings.push(result.warning);
    }
    if (!result.exists) {
      continue;
    }
    availableCandidates.push({
      candidate,
      rows: result.rows,
    });
  }

  return {
    warnings,
    availableCandidates,
  };
};

const findRowById = (rows: RawRow[], candidate: OdpTableCandidate, odpId: string) => {
  for (const row of rows) {
    const rowId = readStringFromKeys(row, candidate.idColumns);
    if (rowId === odpId) {
      return row;
    }
  }
  return null;
};

const queryCandidateRowById = async (
  candidate: OdpTableCandidate,
  tenantId: string,
  odpId: string,
) => {
  const admin = getSupabaseAdminClient();

  for (const idColumn of candidate.idColumns) {
    for (const tenantColumn of candidate.tenantColumns) {
      const { data, error } = await admin
        .from(candidate.table)
        .select("*")
        .eq(idColumn, odpId)
        .eq(tenantColumn, tenantId)
        .limit(1);

      if (!error) {
        return {
          exists: true,
          row: ((data ?? []) as RawRow[])[0] ?? null,
          warning: null as string | null,
        };
      }

      const message = error.message ?? "Unknown query error";
      if (
        looksLikeMissingTable(message) ||
        looksLikeMissingColumn(message, idColumn) ||
        looksLikeMissingColumn(message, tenantColumn)
      ) {
        continue;
      }

      return {
        exists: true,
        row: null,
        warning: `Errore su ${candidate.table}: ${message}`,
      };
    }
  }

  for (const idColumn of candidate.idColumns) {
    const fallbackById = await admin.from(candidate.table).select("*").eq(idColumn, odpId).limit(1);
    if (!fallbackById.error) {
      const row = ((fallbackById.data ?? []) as RawRow[]).find((item) => {
        const rowTenant = readStringFromKeys(item, candidate.tenantColumns);
        return rowTenant === tenantId;
      });
      return {
        exists: true,
        row: row ?? null,
        warning: null as string | null,
      };
    }

    const message = fallbackById.error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, idColumn)) {
      continue;
    }

    return {
      exists: true,
      row: null,
      warning: `Errore su ${candidate.table}: ${message}`,
    };
  }

  const fallbackRows = await queryCandidateRows(candidate, tenantId, SAFE_LIST_LIMIT);
  if (fallbackRows.warning) {
    return {
      exists: fallbackRows.exists,
      row: null,
      warning: fallbackRows.warning,
    };
  }

  return {
    exists: fallbackRows.exists,
    row: findRowById(fallbackRows.rows, candidate, odpId),
    warning: null as string | null,
  };
};

const buildCatalog = async (
  tenantId: string,
  filters: OdpCatalogFilters,
): Promise<OdpCatalogResult> => {
  const { warnings, availableCandidates } = await loadCandidateRows(tenantId);

  if (availableCandidates.length === 0) {
    return {
      orders: [],
      statuses: [],
      origins: [],
      summary: buildSummary([]),
      sourceTable: null,
      warnings,
      emptyStateHint:
        "Nessuna sorgente ODP disponibile nel DB esposto. La pagina resta pronta in attesa del dominio.",
      error: null,
    };
  }

  const winner =
    availableCandidates.find((candidateSet) => candidateSet.rows.length > 0) ??
    availableCandidates[0];

  const normalized = dedupeItems(
    winner.rows
      .map((row) => normalizeRow(row, winner.candidate, tenantId))
      .filter((row): row is OdpListItem => Boolean(row)),
  );
  const sorted = sortItems(normalized);
  const filtered = applyFilters(sorted, filters);

  let emptyStateHint: string | null = null;
  if (sorted.length === 0) {
    emptyStateHint = "Nessun ODP disponibile per il tenant selezionato.";
  } else if (filtered.length === 0) {
    emptyStateHint = "Nessun ODP trovato con i filtri correnti.";
  }

  return {
    orders: filtered,
    statuses: uniqueValues(sorted.map((item) => item.status)),
    origins: uniqueValues(sorted.map((item) => item.origin)),
    summary: buildSummary(filtered),
    sourceTable: winner.candidate.table,
    warnings,
    emptyStateHint,
    error: null,
  };
};

export const getTenantOdpCatalog = async (
  tenantId: string,
  filters: OdpCatalogFilters,
): Promise<OdpCatalogResult> => {
  if (!tenantId) {
    return {
      orders: [],
      statuses: [],
      origins: [],
      summary: buildSummary([]),
      sourceTable: null,
      warnings: [],
      emptyStateHint: null,
      error: "Tenant non valido.",
    };
  }

  try {
    return await buildCatalog(tenantId, filters);
  } catch (caughtError) {
    return {
      orders: [],
      statuses: [],
      origins: [],
      summary: buildSummary([]),
      sourceTable: null,
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

const buildDetail = async (tenantId: string, odpId: string): Promise<OdpDetailResult> => {
  const warnings: string[] = [];

  for (const candidate of TABLE_CANDIDATES) {
    const result = await queryCandidateRowById(candidate, tenantId, odpId);
    if (result.warning) {
      warnings.push(result.warning);
    }

    if (!result.exists) {
      continue;
    }

    if (!result.row) {
      continue;
    }

    const normalized = normalizeRow(result.row, candidate, tenantId);
    if (!normalized) {
      return {
        order: null,
        sourceTable: candidate.table,
        warnings,
        emptyStateHint: "ODP trovato ma non normalizzabile con il mapping corrente.",
        error: null,
      };
    }

    return {
      order: normalized,
      sourceTable: candidate.table,
      warnings,
      emptyStateHint: null,
      error: null,
    };
  }

  return {
    order: null,
    sourceTable: null,
    warnings,
    emptyStateHint: "ODP non trovato per il tenant selezionato.",
    error: null,
  };
};

export const getTenantOdpById = async (
  tenantId: string,
  odpId: string,
): Promise<OdpDetailResult> => {
  if (!tenantId || !odpId) {
    return {
      order: null,
      sourceTable: null,
      warnings: [],
      emptyStateHint: null,
      error: "Parametri non validi.",
    };
  }

  try {
    return await buildDetail(tenantId, odpId);
  } catch (caughtError) {
    return {
      order: null,
      sourceTable: null,
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

const queryPhaseRowsByOrder = async (
  candidate: OdpPhaseTableCandidate,
  tenantId: string,
  odpId: string,
): Promise<QueryRowsResult> => {
  const admin = getSupabaseAdminClient();

  for (const orderColumn of candidate.orderColumns) {
    for (const tenantColumn of candidate.tenantColumns) {
      const { data, error } = await admin
        .from(candidate.table)
        .select("*")
        .eq(orderColumn, odpId)
        .eq(tenantColumn, tenantId)
        .limit(SAFE_LIST_LIMIT);

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
        looksLikeMissingColumn(message, orderColumn) ||
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

  for (const orderColumn of candidate.orderColumns) {
    const fallback = await admin
      .from(candidate.table)
      .select("*")
      .eq(orderColumn, odpId)
      .limit(SAFE_LIST_LIMIT);
    if (!fallback.error) {
      const rows = ((fallback.data ?? []) as RawRow[]).filter((row) => {
        const rowTenant = readStringFromKeys(row, candidate.tenantColumns);
        return rowTenant === tenantId;
      });
      return {
        exists: true,
        rows,
        warning: null,
      };
    }

    const message = fallback.error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, orderColumn)) {
      continue;
    }

    return {
      exists: true,
      rows: [],
      warning: `Errore su ${candidate.table}: ${message}`,
    };
  }

  return {
    exists: false,
    rows: [],
    warning: null,
  };
};

const normalizePhaseRow = (
  row: RawRow,
  candidate: OdpPhaseTableCandidate,
  tenantId: string,
  odpId: string,
  fallbackCode: string | null,
  rowIndex: number,
): OdpPhaseItem | null => {
  const id =
    readStringFromKeys(row, candidate.idColumns) || `${candidate.table}-phase-${rowIndex + 1}`;
  if (!id) {
    return null;
  }

  const phaseCode = readStringFromKeys(row, candidate.phaseCodeColumns) || `Fase-${rowIndex + 1}`;
  const phaseName = readStringFromKeys(row, candidate.phaseNameColumns) || phaseCode;
  const status = readStringFromKeys(row, candidate.statusColumns) || "unknown";
  const progressPct = parseProgressFromColumns(row, candidate.progressColumns);
  const delay = resolveDelayFromColumns(row, candidate.delayColumns, candidate.dueDateColumns);
  const blocked =
    readBooleanFromKeys(row, candidate.blockedColumns) ??
    ((readNumberFromKeys(row, candidate.blockedColumns) ?? 0) > 0);

  const orderCode = readStringFromKeys(row, candidate.orderCodeColumns) || fallbackCode;

  return {
    id,
    tenantId: readStringFromKeys(row, candidate.tenantColumns) || tenantId,
    odpId,
    odpCode: orderCode || null,
    phaseNo: readNumberFromKeys(row, candidate.phaseNoColumns),
    phaseCode,
    phaseName,
    status,
    progressPct,
    isDelayed: delay.isDelayed,
    delayDays: delay.delayDays,
    isBlocked: blocked,
    isExternal: readBooleanFromKeys(row, candidate.externalColumns),
    hasQuality: readBooleanFromKeys(row, candidate.qualityColumns),
    openIssues: readNumberFromKeys(row, candidate.openIssueColumns),
    startedAt: readDateTextFromKeys(row, candidate.startedAtColumns),
    dueDate: readDateTextFromKeys(row, candidate.dueDateColumns),
    completedAt: readDateTextFromKeys(row, candidate.completedAtColumns),
    sourceTable: candidate.table,
  };
};

const dedupePhases = (items: OdpPhaseItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.id}:${item.phaseCode}:${item.sourceTable}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const sortPhases = (items: OdpPhaseItem[]) =>
  [...items].sort((left, right) => {
    if (left.isBlocked !== right.isBlocked) {
      return left.isBlocked ? -1 : 1;
    }
    if (left.isDelayed !== right.isDelayed) {
      return left.isDelayed ? -1 : 1;
    }

    const leftNo = left.phaseNo ?? Number.MAX_SAFE_INTEGER;
    const rightNo = right.phaseNo ?? Number.MAX_SAFE_INTEGER;
    if (leftNo !== rightNo) {
      return leftNo - rightNo;
    }

    return left.phaseCode.localeCompare(right.phaseCode, "it");
  });

const avgPhaseProgress = (items: OdpPhaseItem[]) => {
  const values = items
    .map((item) => item.progressPct)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 100) / 100;
};

const buildPhaseSummary = (items: OdpPhaseItem[]): OdpPhaseSummary => ({
  total: items.length,
  delayed: items.filter((item) => item.isDelayed).length,
  blocked: items.filter((item) => item.isBlocked).length,
  external: items.filter((item) => item.isExternal === true).length,
  withQuality: items.filter((item) => item.hasQuality === true).length,
  completed: items.filter((item) => item.status.toLowerCase().includes("complete")).length,
  avgProgressPct: avgPhaseProgress(items),
});

const safeTimelineDate = (value: string | null) => {
  if (!value) {
    return -1;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return -1;
  }
  return parsed.getTime();
};

const buildPhaseTimeline = (items: OdpPhaseItem[]) => {
  const events: OdpPhaseTimelineEvent[] = [];

  for (const phase of items) {
    const label = phase.phaseNo !== null ? `${phase.phaseNo} - ${phase.phaseCode}` : phase.phaseCode;
    if (phase.startedAt) {
      events.push({
        id: `${phase.id}:start`,
        at: phase.startedAt,
        title: `Avvio fase ${label}`,
        detail: phase.phaseName,
        sourceTable: phase.sourceTable,
      });
    }
    if (phase.dueDate) {
      events.push({
        id: `${phase.id}:due`,
        at: phase.dueDate,
        title: `Scadenza fase ${label}`,
        detail: phase.phaseName,
        sourceTable: phase.sourceTable,
      });
    }
    if (phase.completedAt) {
      events.push({
        id: `${phase.id}:completed`,
        at: phase.completedAt,
        title: `Completamento fase ${label}`,
        detail: phase.phaseName,
        sourceTable: phase.sourceTable,
      });
    }
  }

  return events
    .sort((left, right) => safeTimelineDate(right.at) - safeTimelineDate(left.at))
    .slice(0, 40);
};

const applyPhaseFilters = (items: OdpPhaseItem[], filters: OdpPhaseFilters) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const selectedStatus = (filters.status ?? "all").trim().toLowerCase();
  const delayFilter = normalizeDelayFilter(filters.delay);
  const blockedFilter = normalizeBinaryFilter(filters.blocked);
  const externalFilter = normalizeBinaryFilter(filters.external);
  const qualityFilter = normalizeBinaryFilter(filters.quality);

  return items.filter((item) => {
    if (query) {
      const haystack = [
        item.phaseCode,
        item.phaseName,
        item.status,
        item.odpCode ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (selectedStatus !== "all" && item.status.toLowerCase() !== selectedStatus) {
      return false;
    }

    if (!matchesDelayFilter(item.isDelayed, delayFilter)) {
      return false;
    }
    if (!matchesBinaryFilter(item.isBlocked, blockedFilter)) {
      return false;
    }
    if (!matchesBinaryFilter(item.isExternal === true, externalFilter)) {
      return false;
    }
    if (!matchesBinaryFilter(item.hasQuality === true, qualityFilter)) {
      return false;
    }

    return true;
  });
};

const buildPhases = async (
  tenantId: string,
  odpId: string,
  filters: OdpPhaseFilters,
): Promise<OdpPhaseResult> => {
  const detail = await getTenantOdpById(tenantId, odpId);
  const warnings = [...detail.warnings];
  const sourceTables = new Set<string>();
  const normalized: OdpPhaseItem[] = [];

  const fallbackOrderCode = detail.order?.code ?? null;

  for (const candidate of ODP_PHASE_TABLE_CANDIDATES) {
    const result = await queryPhaseRowsByOrder(candidate, tenantId, odpId);
    if (result.warning) {
      warnings.push(result.warning);
    }
    if (!result.exists) {
      continue;
    }

    sourceTables.add(candidate.table);
    result.rows.forEach((row, index) => {
      const item = normalizePhaseRow(row, candidate, tenantId, odpId, fallbackOrderCode, index);
      if (item) {
        normalized.push(item);
      }
    });
  }

  const sorted = sortPhases(dedupePhases(normalized));
  const phases = applyPhaseFilters(sorted, filters);
  const timeline = buildPhaseTimeline(phases);
  const statuses = uniqueValues(sorted.map((item) => item.status));

  let emptyStateHint: string | null = null;
  if (sorted.length === 0) {
    emptyStateHint =
      sourceTables.size === 0
        ? "Nessuna sorgente fasi ODP disponibile nel DB esposto."
        : "Nessuna fase disponibile per l'ODP selezionato nel tenant corrente.";
  } else if (phases.length === 0) {
    emptyStateHint = "Nessuna fase trovata con i filtri correnti.";
  }

  return {
    order: detail.order,
    phases,
    timeline,
    statuses,
    summary: buildPhaseSummary(phases),
    sourceTables: [...sourceTables].sort((left, right) => left.localeCompare(right, "it")),
    warnings,
    emptyStateHint,
    error: detail.error,
  };
};

export const getTenantOdpPhases = async (
  tenantId: string,
  odpId: string,
  filters: OdpPhaseFilters,
): Promise<OdpPhaseResult> => {
  if (!tenantId || !odpId) {
    return {
      order: null,
      phases: [],
      timeline: [],
      statuses: [],
      summary: buildPhaseSummary([]),
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Parametri non validi.",
    };
  }

  try {
    return await buildPhases(tenantId, odpId, filters);
  } catch (caughtError) {
    return {
      order: null,
      phases: [],
      timeline: [],
      statuses: [],
      summary: buildPhaseSummary([]),
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

export type OdpMaterialDifferenceFilter = "all" | "positive" | "negative" | "none";

export type OdpMaterialFilters = {
  q?: string;
  status?: string;
  difference?: OdpMaterialDifferenceFilter;
  manual?: OdpBinaryFilter;
  substitution?: OdpBinaryFilter;
  lots?: OdpBinaryFilter;
  externalLink?: OdpBinaryFilter;
};

export type OdpMaterialItem = {
  id: string;
  tenantId: string;
  odpId: string;
  odpCode: string | null;
  phaseId: string | null;
  materialCode: string;
  materialName: string;
  uom: string | null;
  status: string;
  theoreticalQty: number | null;
  pickedQty: number | null;
  consumedQty: number | null;
  differenceQty: number | null;
  hasManualChange: boolean;
  hasSubstitution: boolean;
  isCritical: boolean;
  lotCode: string | null;
  hasLots: boolean;
  externalPhaseCode: string | null;
  subcontractingCode: string | null;
  note: string | null;
  sourceTable: string;
};

export type OdpMaterialSummary = {
  total: number;
  withDifference: number;
  overConsumed: number;
  underConsumed: number;
  aligned: number;
  manualChanges: number;
  substitutions: number;
  withLots: number;
  externalLinked: number;
  theoreticalQtyTotal: number | null;
  pickedQtyTotal: number | null;
  consumedQtyTotal: number | null;
  differenceQtyTotal: number | null;
};

export type OdpMaterialResult = {
  order: OdpListItem | null;
  items: OdpMaterialItem[];
  statuses: string[];
  summary: OdpMaterialSummary;
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

type OdpMaterialTableCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  orderColumns: string[];
  orderCodeColumns: string[];
  phaseIdColumns: string[];
  materialCodeColumns: string[];
  materialNameColumns: string[];
  uomColumns: string[];
  statusColumns: string[];
  theoreticalQtyColumns: string[];
  pickedQtyColumns: string[];
  consumedQtyColumns: string[];
  differenceQtyColumns: string[];
  manualColumns: string[];
  substitutionColumns: string[];
  criticalColumns: string[];
  lotColumns: string[];
  lotsFlagColumns: string[];
  externalPhaseColumns: string[];
  subcontractColumns: string[];
  noteColumns: string[];
};

const ODP_MATERIAL_TABLE_CANDIDATES: OdpMaterialTableCandidate[] = [
  {
    table: "production_order_materials",
    idColumns: ["id", "production_order_material_id", "line_id"],
    tenantColumns: ["tenant_id", "tenant_uuid"],
    orderColumns: ["production_order_id", "order_id", "odp_id"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "document_no", "order_code"],
    phaseIdColumns: ["production_order_phase_id", "phase_id", "step_id"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    uomColumns: ["uom", "unit_of_measure", "base_uom", "um"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    theoreticalQtyColumns: ["theoretical_qty", "planned_qty", "required_qty", "qty_required", "bom_qty"],
    pickedQtyColumns: ["picked_qty", "issued_qty", "withdrawn_qty", "qty_picked", "prelevato_qty"],
    consumedQtyColumns: ["consumed_qty", "actual_consumed_qty", "used_qty", "qty_consumed"],
    differenceQtyColumns: ["difference_qty", "variance_qty", "delta_qty", "qty_difference", "scostamento_qty"],
    manualColumns: ["is_manual", "manual_override", "manual_change", "changed_manually"],
    substitutionColumns: ["is_substitute", "is_substitution", "allow_substitute", "substitute_flag"],
    criticalColumns: ["is_critical", "has_critical_issue", "criticality_flag", "is_anomaly"],
    lotColumns: ["lot_code", "lot_no", "batch_code", "batch_no"],
    lotsFlagColumns: ["has_lot", "has_lots", "lot_required"],
    externalPhaseColumns: ["external_phase_code", "phase_code", "operation_code", "step_code"],
    subcontractColumns: [
      "subcontracting_code",
      "subcontract_code",
      "terzista_document_no",
      "supplier_document_no",
    ],
    noteColumns: ["note", "notes", "description", "remark"],
  },
  {
    table: "production_order_material_movements",
    idColumns: ["id", "production_order_material_movement_id", "movement_id"],
    tenantColumns: ["tenant_id", "tenant_uuid"],
    orderColumns: ["production_order_id", "order_id", "odp_id"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "document_no", "order_code"],
    phaseIdColumns: ["production_order_phase_id", "phase_id", "step_id"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    uomColumns: ["uom", "unit_of_measure", "base_uom", "um"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    theoreticalQtyColumns: ["theoretical_qty", "planned_qty", "required_qty", "qty_required", "bom_qty"],
    pickedQtyColumns: ["picked_qty", "issued_qty", "withdrawn_qty", "qty_picked", "movement_qty"],
    consumedQtyColumns: ["consumed_qty", "actual_consumed_qty", "used_qty", "qty_consumed"],
    differenceQtyColumns: ["difference_qty", "variance_qty", "delta_qty", "qty_difference", "scostamento_qty"],
    manualColumns: ["is_manual", "manual_override", "manual_change", "changed_manually"],
    substitutionColumns: ["is_substitute", "is_substitution", "allow_substitute", "substitute_flag"],
    criticalColumns: ["is_critical", "has_critical_issue", "criticality_flag", "is_anomaly"],
    lotColumns: ["lot_code", "lot_no", "batch_code", "batch_no"],
    lotsFlagColumns: ["has_lot", "has_lots", "lot_required"],
    externalPhaseColumns: ["external_phase_code", "phase_code", "operation_code", "step_code"],
    subcontractColumns: [
      "subcontracting_code",
      "subcontract_code",
      "terzista_document_no",
      "supplier_document_no",
    ],
    noteColumns: ["note", "notes", "description", "remark"],
  },
  {
    table: "production_material_consumptions",
    idColumns: ["id", "production_material_consumption_id", "line_id"],
    tenantColumns: ["tenant_id", "tenant_uuid"],
    orderColumns: ["production_order_id", "order_id", "odp_id"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "document_no", "order_code"],
    phaseIdColumns: ["production_order_phase_id", "phase_id", "step_id"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    uomColumns: ["uom", "unit_of_measure", "base_uom", "um"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    theoreticalQtyColumns: ["theoretical_qty", "planned_qty", "required_qty", "qty_required", "bom_qty"],
    pickedQtyColumns: ["picked_qty", "issued_qty", "withdrawn_qty", "qty_picked"],
    consumedQtyColumns: ["consumed_qty", "actual_consumed_qty", "used_qty", "qty_consumed"],
    differenceQtyColumns: ["difference_qty", "variance_qty", "delta_qty", "qty_difference", "scostamento_qty"],
    manualColumns: ["is_manual", "manual_override", "manual_change", "changed_manually"],
    substitutionColumns: ["is_substitute", "is_substitution", "allow_substitute", "substitute_flag"],
    criticalColumns: ["is_critical", "has_critical_issue", "criticality_flag", "is_anomaly"],
    lotColumns: ["lot_code", "lot_no", "batch_code", "batch_no"],
    lotsFlagColumns: ["has_lot", "has_lots", "lot_required"],
    externalPhaseColumns: ["external_phase_code", "phase_code", "operation_code", "step_code"],
    subcontractColumns: [
      "subcontracting_code",
      "subcontract_code",
      "terzista_document_no",
      "supplier_document_no",
    ],
    noteColumns: ["note", "notes", "description", "remark"],
  },
  {
    table: "production_order_material_overviews",
    idColumns: ["id", "production_order_material_overview_id", "line_id"],
    tenantColumns: ["tenant_id", "tenant_uuid"],
    orderColumns: ["production_order_id", "order_id", "odp_id"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "document_no", "order_code"],
    phaseIdColumns: ["production_order_phase_id", "phase_id", "step_id"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    uomColumns: ["uom", "unit_of_measure", "base_uom", "um"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    theoreticalQtyColumns: ["theoretical_qty", "planned_qty", "required_qty", "qty_required", "bom_qty"],
    pickedQtyColumns: ["picked_qty", "issued_qty", "withdrawn_qty", "qty_picked"],
    consumedQtyColumns: ["consumed_qty", "actual_consumed_qty", "used_qty", "qty_consumed"],
    differenceQtyColumns: ["difference_qty", "variance_qty", "delta_qty", "qty_difference", "scostamento_qty"],
    manualColumns: ["is_manual", "manual_override", "manual_change", "changed_manually"],
    substitutionColumns: ["is_substitute", "is_substitution", "allow_substitute", "substitute_flag"],
    criticalColumns: ["is_critical", "has_critical_issue", "criticality_flag", "is_anomaly"],
    lotColumns: ["lot_code", "lot_no", "batch_code", "batch_no"],
    lotsFlagColumns: ["has_lot", "has_lots", "lot_required"],
    externalPhaseColumns: ["external_phase_code", "phase_code", "operation_code", "step_code"],
    subcontractColumns: [
      "subcontracting_code",
      "subcontract_code",
      "terzista_document_no",
      "supplier_document_no",
    ],
    noteColumns: ["note", "notes", "description", "remark"],
  },
];

const ODP_PHASE_MATERIAL_TABLE_CANDIDATES: OdpMaterialTableCandidate[] = [
  {
    table: "production_order_phase_materials",
    idColumns: ["id", "production_order_phase_material_id", "line_id"],
    tenantColumns: ["tenant_id", "tenant_uuid"],
    orderColumns: ["production_order_id", "order_id", "odp_id"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "document_no", "order_code"],
    phaseIdColumns: ["production_order_phase_id", "phase_id", "step_id"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    uomColumns: ["uom", "unit_of_measure", "base_uom", "um"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status", "material_status"],
    theoreticalQtyColumns: ["theoretical_qty", "planned_qty", "required_qty", "qty_required", "bom_qty"],
    pickedQtyColumns: ["picked_qty", "issued_qty", "withdrawn_qty", "qty_picked", "prelevato_qty"],
    consumedQtyColumns: ["consumed_qty", "actual_consumed_qty", "used_qty", "qty_consumed"],
    differenceQtyColumns: ["difference_qty", "variance_qty", "delta_qty", "qty_difference", "scostamento_qty"],
    manualColumns: ["is_manual", "manual_override", "manual_change", "changed_manually"],
    substitutionColumns: ["is_substitute", "is_substitution", "allow_substitute", "substitute_flag"],
    criticalColumns: ["is_critical", "has_critical_issue", "criticality_flag", "is_anomaly"],
    lotColumns: ["lot_code", "lot_no", "batch_code", "batch_no"],
    lotsFlagColumns: ["has_lot", "has_lots", "lot_required"],
    externalPhaseColumns: ["external_phase_code", "phase_code", "operation_code", "step_code"],
    subcontractColumns: [
      "subcontracting_code",
      "subcontract_code",
      "terzista_document_no",
      "supplier_document_no",
    ],
    noteColumns: ["note", "notes", "description", "remark"],
  },
];

const normalizeDifferenceFilter = (value: string | undefined): OdpMaterialDifferenceFilter => {
  if (value === "positive" || value === "negative" || value === "none") {
    return value;
  }
  return "all";
};

const roundQty = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 1000) / 1000;
};

const sumQtyOrNull = (values: Array<number | null>) => {
  const normalized = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (normalized.length === 0) {
    return null;
  }
  return roundQty(normalized.reduce((sum, value) => sum + value, 0));
};

const queryMaterialRowsByPhaseIds = async (
  candidate: OdpMaterialTableCandidate,
  tenantId: string,
  phaseIds: string[],
): Promise<QueryRowsResult> => {
  if (phaseIds.length === 0) {
    return {
      exists: false,
      rows: [],
      warning: null,
    };
  }

  const admin = getSupabaseAdminClient();

  for (const phaseIdColumn of candidate.phaseIdColumns) {
    for (const tenantColumn of candidate.tenantColumns) {
      const { data, error } = await admin
        .from(candidate.table)
        .select("*")
        .in(phaseIdColumn, phaseIds)
        .eq(tenantColumn, tenantId)
        .limit(SAFE_LIST_LIMIT);

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
        looksLikeMissingColumn(message, phaseIdColumn) ||
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

  for (const phaseIdColumn of candidate.phaseIdColumns) {
    const fallback = await admin
      .from(candidate.table)
      .select("*")
      .in(phaseIdColumn, phaseIds)
      .limit(SAFE_LIST_LIMIT);

    if (!fallback.error) {
      const rows = ((fallback.data ?? []) as RawRow[]).filter((row) => {
        const rowTenant = readStringFromKeys(row, candidate.tenantColumns);
        return rowTenant === tenantId;
      });

      return {
        exists: true,
        rows,
        warning: null,
      };
    }

    const message = fallback.error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, phaseIdColumn)) {
      continue;
    }

    return {
      exists: true,
      rows: [],
      warning: `Errore su ${candidate.table}: ${message}`,
    };
  }

  return {
    exists: false,
    rows: [],
    warning: null,
  };
};

const queryMaterialRowsByOrder = async (
  candidate: OdpMaterialTableCandidate,
  tenantId: string,
  odpId: string,
): Promise<QueryRowsResult> => {
  const admin = getSupabaseAdminClient();

  for (const orderColumn of candidate.orderColumns) {
    for (const tenantColumn of candidate.tenantColumns) {
      const { data, error } = await admin
        .from(candidate.table)
        .select("*")
        .eq(orderColumn, odpId)
        .eq(tenantColumn, tenantId)
        .limit(SAFE_LIST_LIMIT);

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
        looksLikeMissingColumn(message, orderColumn) ||
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

  for (const orderColumn of candidate.orderColumns) {
    const fallback = await getSupabaseAdminClient()
      .from(candidate.table)
      .select("*")
      .eq(orderColumn, odpId)
      .limit(SAFE_LIST_LIMIT);

    if (!fallback.error) {
      const rows = ((fallback.data ?? []) as RawRow[]).filter((row) => {
        const rowTenant = readStringFromKeys(row, candidate.tenantColumns);
        return rowTenant === tenantId;
      });
      return {
        exists: true,
        rows,
        warning: null,
      };
    }

    const message = fallback.error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, orderColumn)) {
      continue;
    }

    return {
      exists: true,
      rows: [],
      warning: `Errore su ${candidate.table}: ${message}`,
    };
  }

  return {
    exists: false,
    rows: [],
    warning: null,
  };
};

const normalizeMaterialRow = (
  row: RawRow,
  candidate: OdpMaterialTableCandidate,
  tenantId: string,
  odpId: string,
  fallbackOrderCode: string | null,
  rowIndex: number,
): OdpMaterialItem | null => {
  const id =
    readStringFromKeys(row, candidate.idColumns) || `${candidate.table}-material-${rowIndex + 1}`;
  if (!id) {
    return null;
  }

  const materialCode =
    readStringFromKeys(row, candidate.materialCodeColumns) || `MAT-${rowIndex + 1}`;
  const materialName = readStringFromKeys(row, candidate.materialNameColumns) || materialCode;
  const phaseId = readStringFromKeys(row, candidate.phaseIdColumns) || null;
  const status = readStringFromKeys(row, candidate.statusColumns) || "unknown";
  const theoreticalQty = roundQty(readNumberFromKeys(row, candidate.theoreticalQtyColumns));
  const pickedQty = roundQty(readNumberFromKeys(row, candidate.pickedQtyColumns));
  const consumedQty = roundQty(readNumberFromKeys(row, candidate.consumedQtyColumns));
  const explicitDiff = roundQty(readNumberFromKeys(row, candidate.differenceQtyColumns));
  const derivedDiff =
    consumedQty !== null && theoreticalQty !== null ? roundQty(consumedQty - theoreticalQty) : null;
  const differenceQty = explicitDiff ?? derivedDiff;

  const lotCode = readStringFromKeys(row, candidate.lotColumns) || null;
  const hasLots = (readBooleanFromKeys(row, candidate.lotsFlagColumns) ?? false) || lotCode !== null;
  const externalPhaseCode = readStringFromKeys(row, candidate.externalPhaseColumns) || null;
  const subcontractingCode = readStringFromKeys(row, candidate.subcontractColumns) || null;
  const isCritical =
    (readBooleanFromKeys(row, candidate.criticalColumns) ??
      ((readNumberFromKeys(row, candidate.criticalColumns) ?? 0) > 0)) ||
    false;

  const hasRelevantData =
    Boolean(materialCode) ||
    theoreticalQty !== null ||
    pickedQty !== null ||
    consumedQty !== null ||
    lotCode !== null ||
    externalPhaseCode !== null ||
    subcontractingCode !== null;

  if (!hasRelevantData) {
    return null;
  }

  return {
    id,
    tenantId: readStringFromKeys(row, candidate.tenantColumns) || tenantId,
    odpId,
    odpCode: readStringFromKeys(row, candidate.orderCodeColumns) || fallbackOrderCode,
    phaseId,
    materialCode,
    materialName,
    uom: readStringFromKeys(row, candidate.uomColumns) || null,
    status,
    theoreticalQty,
    pickedQty,
    consumedQty,
    differenceQty,
    hasManualChange: readBooleanFromKeys(row, candidate.manualColumns) ?? false,
    hasSubstitution: readBooleanFromKeys(row, candidate.substitutionColumns) ?? false,
    isCritical,
    lotCode,
    hasLots,
    externalPhaseCode,
    subcontractingCode,
    note: readStringFromKeys(row, candidate.noteColumns) || null,
    sourceTable: candidate.table,
  };
};

const dedupeMaterials = (items: OdpMaterialItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [
      item.sourceTable,
      item.id,
      item.materialCode,
      item.lotCode ?? "",
      item.externalPhaseCode ?? "",
    ].join(":");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const sortMaterials = (items: OdpMaterialItem[]) =>
  [...items].sort((left, right) => {
    if (left.hasManualChange !== right.hasManualChange) {
      return left.hasManualChange ? -1 : 1;
    }
    if (left.hasSubstitution !== right.hasSubstitution) {
      return left.hasSubstitution ? -1 : 1;
    }

    const leftDiff = Math.abs(left.differenceQty ?? 0);
    const rightDiff = Math.abs(right.differenceQty ?? 0);
    if (leftDiff !== rightDiff) {
      return rightDiff - leftDiff;
    }

    return left.materialCode.localeCompare(right.materialCode, "it");
  });

const matchesDifferenceFilter = (differenceQty: number | null, filter: OdpMaterialDifferenceFilter) => {
  if (filter === "all") {
    return true;
  }

  const diff = differenceQty ?? 0;
  if (filter === "positive") {
    return diff > 0;
  }
  if (filter === "negative") {
    return diff < 0;
  }
  return Math.abs(diff) < 0.0001;
};

const applyMaterialFilters = (items: OdpMaterialItem[], filters: OdpMaterialFilters) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const selectedStatus = (filters.status ?? "all").trim().toLowerCase();
  const differenceFilter = normalizeDifferenceFilter(filters.difference);
  const manualFilter = normalizeBinaryFilter(filters.manual);
  const substitutionFilter = normalizeBinaryFilter(filters.substitution);
  const lotsFilter = normalizeBinaryFilter(filters.lots);
  const externalFilter = normalizeBinaryFilter(filters.externalLink);

  return items.filter((item) => {
    if (query) {
      const haystack = [
        item.materialCode,
        item.materialName,
        item.status,
        item.lotCode ?? "",
        item.externalPhaseCode ?? "",
        item.subcontractingCode ?? "",
        item.note ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (selectedStatus !== "all" && item.status.toLowerCase() !== selectedStatus) {
      return false;
    }

    if (!matchesDifferenceFilter(item.differenceQty, differenceFilter)) {
      return false;
    }
    if (!matchesBinaryFilter(item.hasManualChange, manualFilter)) {
      return false;
    }
    if (!matchesBinaryFilter(item.hasSubstitution, substitutionFilter)) {
      return false;
    }
    if (!matchesBinaryFilter(item.hasLots, lotsFilter)) {
      return false;
    }

    const hasExternalLink = Boolean(item.externalPhaseCode || item.subcontractingCode);
    if (!matchesBinaryFilter(hasExternalLink, externalFilter)) {
      return false;
    }

    return true;
  });
};

const buildMaterialSummary = (items: OdpMaterialItem[]): OdpMaterialSummary => {
  const withDifference = items.filter(
    (item) => item.differenceQty !== null && Math.abs(item.differenceQty) >= 0.0001,
  ).length;
  const overConsumed = items.filter((item) => (item.differenceQty ?? 0) > 0).length;
  const underConsumed = items.filter((item) => (item.differenceQty ?? 0) < 0).length;
  const aligned = items.filter(
    (item) => item.differenceQty !== null && Math.abs(item.differenceQty) < 0.0001,
  ).length;

  return {
    total: items.length,
    withDifference,
    overConsumed,
    underConsumed,
    aligned,
    manualChanges: items.filter((item) => item.hasManualChange).length,
    substitutions: items.filter((item) => item.hasSubstitution).length,
    withLots: items.filter((item) => item.hasLots).length,
    externalLinked: items.filter((item) => Boolean(item.externalPhaseCode || item.subcontractingCode)).length,
    theoreticalQtyTotal: sumQtyOrNull(items.map((item) => item.theoreticalQty)),
    pickedQtyTotal: sumQtyOrNull(items.map((item) => item.pickedQty)),
    consumedQtyTotal: sumQtyOrNull(items.map((item) => item.consumedQty)),
    differenceQtyTotal: sumQtyOrNull(items.map((item) => item.differenceQty)),
  };
};

const buildMaterials = async (
  tenantId: string,
  odpId: string,
  filters: OdpMaterialFilters,
): Promise<OdpMaterialResult> => {
  const detail = await getTenantOdpById(tenantId, odpId);
  const warnings = [...detail.warnings];
  const sourceTables = new Set<string>();
  const normalized: OdpMaterialItem[] = [];
  const fallbackOrderCode = detail.order?.code ?? null;

  const phaseSnapshot = await getTenantOdpPhases(tenantId, odpId, {
    q: "",
    status: "all",
    delay: "all",
    blocked: "all",
    external: "all",
    quality: "all",
  });

  warnings.push(...phaseSnapshot.warnings);
  const phaseById = new Map(phaseSnapshot.phases.map((phase) => [phase.id, phase]));
  const phaseIds = [...phaseById.keys()];
  let canonicalSourceResolved = false;

  for (const candidate of ODP_PHASE_MATERIAL_TABLE_CANDIDATES) {
    const byPhaseResult = phaseIds.length > 0 ? await queryMaterialRowsByPhaseIds(candidate, tenantId, phaseIds) : null;
    if (byPhaseResult?.warning) {
      warnings.push(byPhaseResult.warning);
    }

    let resolvedResult = byPhaseResult;
    if (!resolvedResult?.exists || resolvedResult.rows.length === 0) {
      const byOrderResult = await queryMaterialRowsByOrder(candidate, tenantId, odpId);
      if (byOrderResult.warning) {
        warnings.push(byOrderResult.warning);
      }
      if (byOrderResult.exists) {
        resolvedResult = byOrderResult;
      }
    }

    if (!resolvedResult?.exists) {
      continue;
    }

    canonicalSourceResolved = true;
    sourceTables.add(candidate.table);

    resolvedResult.rows.forEach((row, index) => {
      const item = normalizeMaterialRow(row, candidate, tenantId, odpId, fallbackOrderCode, index);
      if (!item) {
        return;
      }

      const phase = item.phaseId ? phaseById.get(item.phaseId) : undefined;
      if (phase) {
        item.externalPhaseCode = item.externalPhaseCode ?? phase.phaseCode;
        item.odpCode = item.odpCode ?? phase.odpCode ?? fallbackOrderCode;
      }
      normalized.push(item);
    });
  }

  if (!canonicalSourceResolved) {
    for (const candidate of ODP_MATERIAL_TABLE_CANDIDATES) {
      const result = await queryMaterialRowsByOrder(candidate, tenantId, odpId);
      if (result.warning) {
        warnings.push(result.warning);
      }
      if (!result.exists) {
        continue;
      }

      sourceTables.add(candidate.table);
      result.rows.forEach((row, index) => {
        const item = normalizeMaterialRow(row, candidate, tenantId, odpId, fallbackOrderCode, index);
        if (item) {
          normalized.push(item);
        }
      });
    }
  }

  const sorted = sortMaterials(dedupeMaterials(normalized));
  const items = applyMaterialFilters(sorted, filters);
  const statuses = uniqueValues(sorted.map((item) => item.status));

  let emptyStateHint: string | null = null;
  if (sorted.length === 0) {
    emptyStateHint =
      sourceTables.size === 0
        ? "Nessuna sorgente materiali ODP disponibile nel DB esposto."
        : "Nessun materiale disponibile per l'ODP selezionato nel tenant corrente.";
  } else if (items.length === 0) {
    emptyStateHint = "Nessun materiale trovato con i filtri correnti.";
  }

  return {
    order: detail.order,
    items,
    statuses,
    summary: buildMaterialSummary(items),
    sourceTables: [...sourceTables].sort((left, right) => left.localeCompare(right, "it")),
    warnings,
    emptyStateHint,
    error: detail.error,
  };
};

export const getTenantOdpMaterials = async (
  tenantId: string,
  odpId: string,
  filters: OdpMaterialFilters,
): Promise<OdpMaterialResult> => {
  if (!tenantId || !odpId) {
    return {
      order: null,
      items: [],
      statuses: [],
      summary: buildMaterialSummary([]),
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Parametri non validi.",
    };
  }

  try {
    return await buildMaterials(tenantId, odpId, filters);
  } catch (caughtError) {
    return {
      order: null,
      items: [],
      statuses: [],
      summary: buildMaterialSummary([]),
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

export type OdpCockpitNodeKind = "odp" | "phase" | "material" | "event";
export type OdpCockpitSignal =
  | "delay"
  | "blocked"
  | "external"
  | "critical_material"
  | "quality";

export type OdpCockpitLink = {
  key: "detail" | "phases" | "materials" | "subcontracting" | "traceability" | "fallback";
  label: string;
  href: string;
};

export type OdpCockpitMetric = {
  label: string;
  value: string;
};

export type OdpCockpitNode = {
  id: string;
  parentId: string | null;
  kind: OdpCockpitNodeKind;
  label: string;
  secondaryLabel: string | null;
  status: string | null;
  progressPct: number | null;
  signals: OdpCockpitSignal[];
  metrics: OdpCockpitMetric[];
  detailLines: string[];
  links: OdpCockpitLink[];
  sourceTable: string | null;
  sortOrder: number;
};

export type OdpCockpitResult = {
  order: OdpListItem | null;
  rootNodeId: string | null;
  nodes: OdpCockpitNode[];
  counts: {
    phases: number;
    materials: number;
    events: number;
  };
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
  fallbackViews: {
    detail: string;
    phases: string;
    materials: string;
    subcontracting: string;
    traceability: string;
  };
};

const formatCockpitPercent = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) {
    return "N/D";
  }
  return `${Math.round(value)}%`;
};

const formatCockpitQty = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) {
    return "N/D";
  }
  return value.toLocaleString("it-IT", { maximumFractionDigits: 3 });
};

const formatCockpitDate = (value: string | null) => {
  if (!value) {
    return "N/D";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const normalizeSignalList = (signals: OdpCockpitSignal[]) => {
  const unique = new Set<OdpCockpitSignal>(signals);
  return [...unique];
};

const dedupeWarnings = (warnings: string[]) => [...new Set(warnings.filter(Boolean))];

const buildCockpitFallbackViews = (order: OdpListItem | null, odpId: string) => ({
  detail: `/odp/${odpId}`,
  phases: `/odp/${odpId}/fasi`,
  materials: `/odp/${odpId}/materiali`,
  subcontracting: order?.commessaId
    ? `/commesse/${order.commessaId}/conto-lavoro`
    : `/odp/${odpId}?section=conto-lavoro`,
  traceability: order?.commessaId ? `/commesse/${order.commessaId}/tracciabilita` : "/commesse",
});

const safeContains = (value: string, query: string) =>
  value.toLowerCase().includes(query.toLowerCase());

const materialIsCritical = (material: OdpMaterialItem) =>
  material.isCritical ||
  (material.differenceQty ?? 0) > 0 ||
  material.hasManualChange ||
  material.hasSubstitution;

const normalizeLookupToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

type CockpitNodeInput = Omit<OdpCockpitNode, "sortOrder">;

const buildCockpitNodes = (
  order: OdpListItem,
  phases: OdpPhaseResult,
  materials: OdpMaterialResult,
  fallbackViews: OdpCockpitResult["fallbackViews"],
) => {
  const nodes: OdpCockpitNode[] = [];
  let sortOrder = 0;

  const addNode = (node: CockpitNodeInput) => {
    const withOrder: OdpCockpitNode = { ...node, sortOrder };
    sortOrder += 1;
    nodes.push(withOrder);
    return withOrder.id;
  };

  const rootId = `odp:${order.id}`;
  const rootSignals: OdpCockpitSignal[] = [];
  if (order.isDelayed) {
    rootSignals.push("delay");
  }
  if (order.isBlocked) {
    rootSignals.push("blocked");
  }
  if (phases.phases.some((phase) => phase.isExternal === true)) {
    rootSignals.push("external");
  }
  if (phases.phases.some((phase) => phase.hasQuality === true)) {
    rootSignals.push("quality");
  }
  if (materials.items.some(materialIsCritical)) {
    rootSignals.push("critical_material");
  }

  addNode({
    id: rootId,
    parentId: null,
    kind: "odp",
    label: order.code,
    secondaryLabel: order.name,
    status: order.status,
    progressPct: order.progressPct,
    signals: normalizeSignalList(rootSignals),
    metrics: [
      { label: "Avanzamento", value: formatCockpitPercent(order.progressPct) },
      {
        label: "Ritardo",
        value: order.isDelayed
          ? `Si${order.delayDays !== null ? ` (${Math.floor(order.delayDays)} gg)` : ""}`
          : "No",
      },
      {
        label: "Blocco",
        value: order.isBlocked ? "Si" : "No",
      },
      {
        label: "Qt residua",
        value: formatCockpitQty(order.qtyResidual),
      },
    ],
    detailLines: [
      `Stato: ${order.status}`,
      `Origine: ${order.origin}`,
      `Commessa: ${order.commessaCode ?? order.commessaId ?? "N/D"}`,
      `Fine prevista: ${formatCockpitDate(order.dueDate)}`,
      `Sorgente: ${order.sourceTable}`,
    ],
    links: [
      { key: "detail", label: "D", href: fallbackViews.detail },
      { key: "phases", label: "F", href: fallbackViews.phases },
      { key: "materials", label: "M", href: fallbackViews.materials },
      { key: "subcontracting", label: "CL", href: fallbackViews.subcontracting },
      { key: "traceability", label: "TR", href: fallbackViews.traceability },
    ],
    sourceTable: order.sourceTable,
  });

  const phaseNodeIdByCode = new Map<string, string>();
  const phaseNodeIdById = new Map<string, string>();
  const phaseNodeIdsInOrder: string[] = [];
  const phaseLabelByNodeId = new Map<string, string>();
  const phaseNodeStatsById = new Map<
    string,
    { materials: number; criticalMaterials: number; missionEvents: number }
  >();

  const getPhaseNodeStats = (phaseNodeId: string) => {
    const existing = phaseNodeStatsById.get(phaseNodeId);
    if (existing) {
      return existing;
    }
    const created = {
      materials: 0,
      criticalMaterials: 0,
      missionEvents: 0,
    };
    phaseNodeStatsById.set(phaseNodeId, created);
    return created;
  };

  phases.phases.forEach((phase, index) => {
    const phaseId = `phase:${phase.id}:${index + 1}`;
    const phaseSignals: OdpCockpitSignal[] = [];
    if (phase.isDelayed) {
      phaseSignals.push("delay");
    }
    if (phase.isBlocked) {
      phaseSignals.push("blocked");
    }
    if (phase.isExternal === true) {
      phaseSignals.push("external");
    }
    if (phase.hasQuality === true) {
      phaseSignals.push("quality");
    }

    addNode({
      id: phaseId,
      parentId: rootId,
      kind: "phase",
      label: phase.phaseCode,
      secondaryLabel: phase.phaseName,
      status: phase.status,
      progressPct: phase.progressPct,
      signals: normalizeSignalList(phaseSignals),
      metrics: [
        { label: "Avanz.", value: formatCockpitPercent(phase.progressPct) },
        { label: "Ritardo", value: phase.isDelayed ? "Si" : "No" },
        { label: "Blocco", value: phase.isBlocked ? "Si" : "No" },
      ],
      detailLines: [
        `Numero fase: ${phase.phaseNo ?? "N/D"}`,
        `Tipo fase: ${phase.isExternal === true ? "Esterna" : phase.isExternal === false ? "Interna" : "N/D"}`,
        `Qualita: ${phase.hasQuality === true ? "Si" : phase.hasQuality === false ? "No" : "N/D"}`,
        `Scadenza: ${formatCockpitDate(phase.dueDate)}`,
        `Sorgente: ${phase.sourceTable}`,
      ],
      links: [
        { key: "detail", label: "D", href: fallbackViews.detail },
        { key: "phases", label: "F", href: fallbackViews.phases },
        { key: "materials", label: "M", href: fallbackViews.materials },
        { key: "subcontracting", label: "CL", href: fallbackViews.subcontracting },
      ],
      sourceTable: phase.sourceTable,
    });

    phaseNodeIdById.set(phase.id, phaseId);
    phaseNodeIdsInOrder.push(phaseId);
    phaseLabelByNodeId.set(phaseId, `${phase.phaseCode} - ${phase.phaseName}`);
    getPhaseNodeStats(phaseId);

    const codeTokens = [
      phase.phaseCode,
      phase.phaseName,
      phase.phaseNo !== null ? `${phase.phaseNo}` : "",
    ]
      .map(normalizeLookupToken)
      .filter(Boolean);
    codeTokens.forEach((token) => {
      if (!phaseNodeIdByCode.has(token)) {
        phaseNodeIdByCode.set(token, phaseId);
      }
    });
  });

  const materialNodeIdByItemId = new Map<string, string>();
  const materialPhaseNodeIdByItemId = new Map<string, string>();

  materials.items.forEach((material, index) => {
    let parentId = rootId;
    let parentPhaseLabel = "ODP";
    let associationSource = "root";

    const directPhaseNodeId = material.phaseId ? phaseNodeIdById.get(material.phaseId) : undefined;
    if (directPhaseNodeId) {
      parentId = directPhaseNodeId;
      associationSource = "phase-id";
    } else {
      const materialToken = normalizeLookupToken(
        `${material.externalPhaseCode ?? ""} ${material.note ?? ""}`,
      );
      if (materialToken) {
        const direct = phaseNodeIdByCode.get(materialToken);
        if (direct) {
          parentId = direct;
          associationSource = "direct-token";
        } else {
          for (const [phaseToken, phaseNodeId] of phaseNodeIdByCode.entries()) {
            if (safeContains(materialToken, phaseToken) || safeContains(phaseToken, materialToken)) {
              parentId = phaseNodeId;
              associationSource = "contains-token";
              break;
            }
          }
        }
      }
    }

    if (parentId === rootId && phaseNodeIdsInOrder.length > 0) {
      let selectedPhaseNode = phaseNodeIdsInOrder[0];
      let minCount = getPhaseNodeStats(selectedPhaseNode).materials;
      phaseNodeIdsInOrder.forEach((phaseNodeId) => {
        const currentCount = getPhaseNodeStats(phaseNodeId).materials;
        if (currentCount < minCount) {
          minCount = currentCount;
          selectedPhaseNode = phaseNodeId;
        }
      });
      parentId = selectedPhaseNode;
      associationSource = "balanced-fallback";
    }

    const isCriticalMaterial = materialIsCritical(material);

    if (parentId !== rootId) {
      const phaseStats = getPhaseNodeStats(parentId);
      phaseStats.materials += 1;
      if (isCriticalMaterial) {
        phaseStats.criticalMaterials += 1;
      }
      materialPhaseNodeIdByItemId.set(material.id, parentId);
      parentPhaseLabel = phaseLabelByNodeId.get(parentId) ?? parentPhaseLabel;
    }

    const materialSignals: OdpCockpitSignal[] = [];
    if (isCriticalMaterial) {
      materialSignals.push("critical_material");
    }
    if (material.externalPhaseCode || material.subcontractingCode) {
      materialSignals.push("external");
    }

    const materialNodeId = `material:${material.id}:${index + 1}`;
    addNode({
      id: materialNodeId,
      parentId,
      kind: "material",
      label: material.materialCode,
      secondaryLabel: material.materialName,
      status: material.status,
      progressPct: null,
      signals: normalizeSignalList(materialSignals),
      metrics: [
        { label: "Teorico", value: formatCockpitQty(material.theoreticalQty) },
        { label: "Prelevato", value: formatCockpitQty(material.pickedQty) },
        { label: "Consumato", value: formatCockpitQty(material.consumedQty) },
        { label: "Diff.", value: formatCockpitQty(material.differenceQty) },
      ],
      detailLines: [
        `UM: ${material.uom ?? "N/D"}`,
        `Lotto: ${material.lotCode ?? "N/D"}`,
        `Fase esterna: ${material.externalPhaseCode ?? "N/D"}`,
        `Phase ID: ${material.phaseId ?? "N/D"}`,
        `Nodo fase associato: ${parentPhaseLabel}`,
        `Associazione: ${associationSource}`,
        `Conto lavoro: ${material.subcontractingCode ?? "N/D"}`,
        `Nota: ${material.note ?? "N/D"}`,
        `Sorgente: ${material.sourceTable}`,
      ],
      links: [
        { key: "detail", label: "D", href: fallbackViews.detail },
        { key: "materials", label: "M", href: fallbackViews.materials },
        { key: "phases", label: "F", href: fallbackViews.phases },
        { key: "subcontracting", label: "CL", href: fallbackViews.subcontracting },
      ],
      sourceTable: material.sourceTable,
    });

    materialNodeIdByItemId.set(material.id, materialNodeId);
  });

  phases.timeline.forEach((event, index) => {
    let parentId = rootId;
    for (const phase of phases.phases) {
      const phaseCode = phase.phaseCode.trim();
      if (!phaseCode) {
        continue;
      }
      if (safeContains(event.title, phaseCode) || safeContains(event.detail, phaseCode)) {
        const mappedId = phaseNodeIdByCode.get(phaseCode.toLowerCase());
        if (mappedId) {
          parentId = mappedId;
        }
        break;
      }
      const mappedById = phaseNodeIdById.get(phase.id);
      if (
        mappedById &&
        (safeContains(event.title, phase.id) || safeContains(event.detail, phase.id))
      ) {
        parentId = mappedById;
        break;
      }
    }

    if (parentId !== rootId) {
      getPhaseNodeStats(parentId).missionEvents += 1;
    }

    addNode({
      id: `event:phase:${event.id}:${index + 1}`,
      parentId,
      kind: "event",
      label: event.title,
      secondaryLabel: event.detail,
      status: null,
      progressPct: null,
      signals: [],
      metrics: [{ label: "Quando", value: formatCockpitDate(event.at) }],
      detailLines: [
        `Evento: ${event.title}`,
        `Dettaglio: ${event.detail}`,
        `Data: ${formatCockpitDate(event.at)}`,
        `Sorgente: ${event.sourceTable}`,
      ],
      links: [
        { key: "phases", label: "F", href: fallbackViews.phases },
        { key: "detail", label: "D", href: fallbackViews.detail },
      ],
      sourceTable: event.sourceTable,
    });
  });

  materials.items.forEach((material, index) => {
    const hasMovementSignal =
      material.hasLots ||
      Boolean(material.subcontractingCode) ||
      Boolean(material.externalPhaseCode) ||
      material.hasManualChange ||
      material.hasSubstitution ||
      Boolean(material.note) ||
      ((material.differenceQty ?? 0) !== 0 && material.differenceQty !== null);

    if (!hasMovementSignal) {
      return;
    }
    const parentId = materialNodeIdByItemId.get(material.id) ?? rootId;
    const parentPhaseNodeId = materialPhaseNodeIdByItemId.get(material.id) ?? null;
    if (parentPhaseNodeId) {
      getPhaseNodeStats(parentPhaseNodeId).missionEvents += 1;
    }
    const movementLabel = material.lotCode
      ? `Movimento lotto ${material.lotCode}`
      : material.subcontractingCode
        ? `Movimento conto lavoro ${material.subcontractingCode}`
        : `Movimento ${material.materialCode}`;
    const movementSignals: OdpCockpitSignal[] = [];
    if (material.subcontractingCode || material.externalPhaseCode) {
      movementSignals.push("external");
    }
    if (materialIsCritical(material)) {
      movementSignals.push("critical_material");
    }

    addNode({
      id: `event:material:${material.id}:${index + 1}`,
      parentId,
      kind: "event",
      label: movementLabel,
      secondaryLabel: material.materialName,
      status: null,
      progressPct: null,
      signals: normalizeSignalList(movementSignals),
      metrics: [{ label: "Diff.", value: formatCockpitQty(material.differenceQty) }],
      detailLines: [
        `Materiale: ${material.materialCode} - ${material.materialName}`,
        `Lotto: ${material.lotCode ?? "N/D"}`,
        `Conto lavoro: ${material.subcontractingCode ?? "N/D"}`,
        `Fase esterna: ${material.externalPhaseCode ?? "N/D"}`,
      ],
      links: [
        { key: "materials", label: "M", href: fallbackViews.materials },
        { key: "subcontracting", label: "CL", href: fallbackViews.subcontracting },
      ],
      sourceTable: material.sourceTable,
    });
  });

  nodes.forEach((node) => {
    if (node.kind !== "phase") {
      return;
    }
    const stats = phaseNodeStatsById.get(node.id) ?? {
      materials: 0,
      criticalMaterials: 0,
      missionEvents: 0,
    };

    node.metrics = [
      ...node.metrics,
      { label: "Materiali", value: `${stats.materials}` },
      { label: "Critici", value: `${stats.criticalMaterials}` },
      { label: "Missioni/eventi", value: `${stats.missionEvents}` },
    ];

    node.detailLines = [
      `Materiali collegati: ${stats.materials}`,
      `Materiali critici: ${stats.criticalMaterials}`,
      `Missioni/eventi collegati: ${stats.missionEvents}`,
      ...node.detailLines,
    ];

    if (stats.criticalMaterials > 0 && !node.signals.includes("critical_material")) {
      node.signals = normalizeSignalList([...node.signals, "critical_material"]);
    }
  });

  return {
    rootId,
    nodes,
    counts: {
      phases: phases.phases.length,
      materials: materials.items.length,
      events: nodes.filter((node) => node.kind === "event").length,
    },
  };
};

export const getTenantOdpCockpit = async (
  tenantId: string,
  odpId: string,
): Promise<OdpCockpitResult> => {
  const fallbackViews = buildCockpitFallbackViews(null, odpId);
  if (!tenantId || !odpId) {
    return {
      order: null,
      rootNodeId: null,
      nodes: [],
      counts: { phases: 0, materials: 0, events: 0 },
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Parametri non validi.",
      fallbackViews,
    };
  }

  try {
    const [detail, phases, materials] = await Promise.all([
      getTenantOdpById(tenantId, odpId),
      getTenantOdpPhases(tenantId, odpId, {
        q: "",
        status: "all",
        delay: "all",
        blocked: "all",
        external: "all",
        quality: "all",
      }),
      getTenantOdpMaterials(tenantId, odpId, {
        q: "",
        status: "all",
        difference: "all",
        manual: "all",
        substitution: "all",
        lots: "all",
        externalLink: "all",
      }),
    ]);

    const resolvedFallbackViews = buildCockpitFallbackViews(detail.order, odpId);
    const sourceTables = new Set<string>();
    if (detail.sourceTable) {
      sourceTables.add(detail.sourceTable);
    }
    phases.sourceTables.forEach((table) => sourceTables.add(table));
    materials.sourceTables.forEach((table) => sourceTables.add(table));

    const warnings = dedupeWarnings([
      ...detail.warnings,
      ...phases.warnings,
      ...materials.warnings,
    ]);

    const firstError = detail.error ?? phases.error ?? materials.error;
    if (firstError) {
      return {
        order: detail.order,
        rootNodeId: null,
        nodes: [],
        counts: { phases: 0, materials: 0, events: 0 },
        sourceTables: [...sourceTables].sort((left, right) => left.localeCompare(right, "it")),
        warnings,
        emptyStateHint: null,
        error: firstError,
        fallbackViews: resolvedFallbackViews,
      };
    }

    if (!detail.order) {
      return {
        order: null,
        rootNodeId: null,
        nodes: [],
        counts: { phases: 0, materials: 0, events: 0 },
        sourceTables: [...sourceTables].sort((left, right) => left.localeCompare(right, "it")),
        warnings,
        emptyStateHint:
          detail.emptyStateHint ??
          "ODP non disponibile nel tenant corrente con il mapping dati attuale.",
        error: null,
        fallbackViews: resolvedFallbackViews,
      };
    }

    const built = buildCockpitNodes(detail.order, phases, materials, resolvedFallbackViews);
    const hasChildren = built.nodes.some((node) => node.parentId === built.rootId);
    const emptyStateHint =
      hasChildren
        ? null
        : phases.emptyStateHint ??
          materials.emptyStateHint ??
          "Cockpit disponibile ma senza nodi figli nel dataset corrente.";

    return {
      order: detail.order,
      rootNodeId: built.rootId,
      nodes: built.nodes,
      counts: built.counts,
      sourceTables: [...sourceTables].sort((left, right) => left.localeCompare(right, "it")),
      warnings,
      emptyStateHint,
      error: null,
      fallbackViews: resolvedFallbackViews,
    };
  } catch (caughtError) {
    return {
      order: null,
      rootNodeId: null,
      nodes: [],
      counts: { phases: 0, materials: 0, events: 0 },
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
      fallbackViews,
    };
  }
};
