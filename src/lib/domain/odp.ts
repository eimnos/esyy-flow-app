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
