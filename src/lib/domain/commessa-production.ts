import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RawRow = Record<string, unknown>;

type OrdersTableCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  commessaColumns: string[];
  codeColumns: string[];
  nameColumns: string[];
  statusColumns: string[];
  progressColumns: string[];
  delayColumns: string[];
  dueDateColumns: string[];
  blockedColumns: string[];
  externalColumns: string[];
  phaseCountColumns: string[];
  completedPhaseColumns: string[];
  openIssueColumns: string[];
  semiCriticalColumns: string[];
  startedAtColumns: string[];
  completedAtColumns: string[];
};

type PhaseTableCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  orderColumns: string[];
  commessaColumns: string[];
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
  semiCriticalColumns: string[];
};

export type CommessaProductionOrderItem = {
  id: string;
  tenantId: string;
  commessaId: string;
  code: string;
  name: string;
  status: string;
  progressPct: number | null;
  isDelayed: boolean;
  delayDays: number | null;
  isBlocked: boolean;
  isExternal: boolean | null;
  phaseCount: number | null;
  completedPhases: number | null;
  openIssues: number | null;
  semiCritical: number | null;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  sourceTable: string;
};

export type CommessaProductionPhaseItem = {
  id: string;
  tenantId: string;
  commessaId: string;
  orderId: string | null;
  orderCode: string | null;
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
  semiCritical: number | null;
  dueDate: string | null;
  sourceTable: string;
};

export type CommessaProductionSummary = {
  ordersTotal: number;
  phasesTotal: number;
  avgOrderProgress: number | null;
  avgPhaseProgress: number | null;
  delayedOrders: number;
  blockedOrders: number;
  externalPhases: number;
  openIssues: number | null;
  semiCritical: number | null;
};

export type CommessaProductionResult = {
  orders: CommessaProductionOrderItem[];
  phases: CommessaProductionPhaseItem[];
  summary: CommessaProductionSummary;
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

type QueryRowsResult = {
  exists: boolean;
  rows: RawRow[];
  warning: string | null;
};

const SAFE_LIST_LIMIT = 1500;

const ORDERS_TABLE_CANDIDATES: OrdersTableCandidate[] = [
  {
    table: "production_orders",
    idColumns: ["id", "production_order_id", "order_id", "odp_id"],
    tenantColumns: ["tenant_id"],
    commessaColumns: ["project_id", "commessa_id", "job_id"],
    codeColumns: ["document_no", "production_order_no", "order_no", "code"],
    nameColumns: ["title", "description", "name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    progressColumns: ["progress_pct", "completion_pct", "completion_percent", "progress_ratio", "progress"],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "target_date", "planned_end_date"],
    blockedColumns: ["is_blocked", "has_blocking_issue", "blocked_flag", "blocker_count"],
    externalColumns: ["is_external", "is_outsourced", "execution_mode", "process_type"],
    phaseCountColumns: ["phase_count", "steps_count", "operations_count"],
    completedPhaseColumns: ["completed_phase_count", "completed_steps_count", "completed_operations_count"],
    openIssueColumns: ["open_issue_count", "criticality_count", "open_alert_count"],
    semiCriticalColumns: ["semi_finished_critical_count", "wip_critical_count", "semi_alert_count"],
    startedAtColumns: ["started_at", "actual_start_at", "production_start_at"],
    completedAtColumns: ["completed_at", "actual_end_at", "production_end_at"],
  },
  {
    table: "work_orders",
    idColumns: ["id", "work_order_id", "order_id"],
    tenantColumns: ["tenant_id"],
    commessaColumns: ["project_id", "commessa_id", "job_id"],
    codeColumns: ["document_no", "work_order_no", "order_no", "code"],
    nameColumns: ["title", "description", "name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    progressColumns: ["progress_pct", "completion_pct", "completion_percent", "progress_ratio", "progress"],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "target_date", "planned_end_date"],
    blockedColumns: ["is_blocked", "has_blocking_issue", "blocked_flag", "blocker_count"],
    externalColumns: ["is_external", "is_outsourced", "execution_mode", "process_type"],
    phaseCountColumns: ["phase_count", "steps_count", "operations_count"],
    completedPhaseColumns: ["completed_phase_count", "completed_steps_count", "completed_operations_count"],
    openIssueColumns: ["open_issue_count", "criticality_count", "open_alert_count"],
    semiCriticalColumns: ["semi_finished_critical_count", "wip_critical_count", "semi_alert_count"],
    startedAtColumns: ["started_at", "actual_start_at", "production_start_at"],
    completedAtColumns: ["completed_at", "actual_end_at", "production_end_at"],
  },
];

const PHASE_TABLE_CANDIDATES: PhaseTableCandidate[] = [
  {
    table: "production_order_phases",
    idColumns: ["id", "production_order_phase_id", "phase_id"],
    tenantColumns: ["tenant_id"],
    orderColumns: ["production_order_id", "order_id", "odp_id"],
    commessaColumns: ["project_id", "commessa_id", "job_id"],
    phaseNoColumns: ["phase_no", "step_no", "sequence_no", "line_no"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code", "code"],
    phaseNameColumns: ["phase_name", "step_name", "operation_name", "name", "description"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    progressColumns: ["progress_pct", "completion_pct", "completion_percent", "progress_ratio", "progress"],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "target_date", "planned_end_date"],
    blockedColumns: ["is_blocked", "has_blocking_issue", "blocked_flag", "blocker_count"],
    externalColumns: ["is_external", "is_outsourced", "phase_type", "execution_type", "process_type"],
    qualityColumns: ["has_quality_check", "quality_required", "requires_quality", "quality_enabled"],
    openIssueColumns: ["open_issue_count", "criticality_count", "open_alert_count"],
    semiCriticalColumns: ["semi_finished_critical_count", "wip_critical_count", "semi_alert_count"],
  },
  {
    table: "production_order_steps",
    idColumns: ["id", "production_order_step_id", "phase_id", "step_id"],
    tenantColumns: ["tenant_id"],
    orderColumns: ["production_order_id", "order_id", "odp_id"],
    commessaColumns: ["project_id", "commessa_id", "job_id"],
    phaseNoColumns: ["phase_no", "step_no", "sequence_no", "line_no"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code", "code"],
    phaseNameColumns: ["phase_name", "step_name", "operation_name", "name", "description"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    progressColumns: ["progress_pct", "completion_pct", "completion_percent", "progress_ratio", "progress"],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "target_date", "planned_end_date"],
    blockedColumns: ["is_blocked", "has_blocking_issue", "blocked_flag", "blocker_count"],
    externalColumns: ["is_external", "is_outsourced", "phase_type", "execution_type", "process_type"],
    qualityColumns: ["has_quality_check", "quality_required", "requires_quality", "quality_enabled"],
    openIssueColumns: ["open_issue_count", "criticality_count", "open_alert_count"],
    semiCriticalColumns: ["semi_finished_critical_count", "wip_critical_count", "semi_alert_count"],
  },
  {
    table: "production_phase_instances",
    idColumns: ["id", "production_phase_instance_id", "phase_id"],
    tenantColumns: ["tenant_id"],
    orderColumns: ["production_order_id", "order_id", "odp_id"],
    commessaColumns: ["project_id", "commessa_id", "job_id"],
    phaseNoColumns: ["phase_no", "step_no", "sequence_no", "line_no"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code", "code"],
    phaseNameColumns: ["phase_name", "step_name", "operation_name", "name", "description"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    progressColumns: ["progress_pct", "completion_pct", "completion_percent", "progress_ratio", "progress"],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "target_date", "planned_end_date"],
    blockedColumns: ["is_blocked", "has_blocking_issue", "blocked_flag", "blocker_count"],
    externalColumns: ["is_external", "is_outsourced", "phase_type", "execution_type", "process_type"],
    qualityColumns: ["has_quality_check", "quality_required", "requires_quality", "quality_enabled"],
    openIssueColumns: ["open_issue_count", "criticality_count", "open_alert_count"],
    semiCriticalColumns: ["semi_finished_critical_count", "wip_critical_count", "semi_alert_count"],
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

const readDateTextFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = toDateText(row[key]);
    if (value) {
      return value;
    }
  }
  return null;
};

const resolveDelay = (row: RawRow, delayColumns: string[], dueDateColumns: string[]) => {
  const explicit = readNumberFromKeys(row, delayColumns);
  if (explicit !== null) {
    return {
      isDelayed: explicit > 0,
      delayDays: explicit > 0 ? Math.floor(explicit) : 0,
    };
  }

  const dueDateText = readDateTextFromKeys(row, dueDateColumns);
  if (!dueDateText) {
    return {
      isDelayed: false,
      delayDays: null as number | null,
    };
  }

  const parsed = new Date(dueDateText);
  if (Number.isNaN(parsed.getTime())) {
    return {
      isDelayed: false,
      delayDays: null as number | null,
    };
  }

  const millis = Date.now() - parsed.getTime();
  const days = Math.floor(millis / (1000 * 60 * 60 * 24));
  return {
    isDelayed: days > 0,
    delayDays: days > 0 ? days : 0,
  };
};

const parseProgressPct = (row: RawRow, progressColumns: string[]) => {
  const raw = readNumberFromKeys(row, progressColumns);
  if (raw === null) {
    return null;
  }

  if (raw <= 1) {
    return Math.round(Math.max(0, raw) * 10000) / 100;
  }

  return Math.round(Math.max(0, raw) * 100) / 100;
};

const queryRowsByTenantAndParent = async (
  table: string,
  tenantColumn: string,
  tenantId: string,
  parentColumn: string,
  parentId: string,
  limit: number,
): Promise<QueryRowsResult> => {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from(table)
    .select("*")
    .eq(tenantColumn, tenantId)
    .eq(parentColumn, parentId)
    .limit(limit);

  if (!error) {
    return {
      exists: true,
      rows: (data ?? []) as RawRow[],
      warning: null,
    };
  }

  const message = error.message ?? "Unknown query error";
  if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, tenantColumn) || looksLikeMissingColumn(message, parentColumn)) {
    return {
      exists: false,
      rows: [],
      warning: null,
    };
  }

  return {
    exists: true,
    rows: [],
    warning: `Errore su ${table}: ${message}`,
  };
};

const queryRowsByParentInTenant = async (
  table: string,
  tenantColumn: string,
  tenantId: string,
  parentColumn: string,
  parentIds: string[],
  limit: number,
): Promise<QueryRowsResult> => {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from(table)
    .select("*")
    .eq(tenantColumn, tenantId)
    .in(parentColumn, parentIds)
    .limit(limit);

  if (!error) {
    return {
      exists: true,
      rows: (data ?? []) as RawRow[],
      warning: null,
    };
  }

  const message = error.message ?? "Unknown query error";
  if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, tenantColumn) || looksLikeMissingColumn(message, parentColumn)) {
    return {
      exists: false,
      rows: [],
      warning: null,
    };
  }

  return {
    exists: true,
    rows: [],
    warning: `Errore su ${table}: ${message}`,
  };
};

const normalizeOrder = (
  row: RawRow,
  candidate: OrdersTableCandidate,
  tenantId: string,
  commessaId: string,
): CommessaProductionOrderItem | null => {
  const id = readStringFromKeys(row, candidate.idColumns);
  if (!id) {
    return null;
  }

  const code = readStringFromKeys(row, candidate.codeColumns) || id;
  const name = readStringFromKeys(row, candidate.nameColumns) || code;
  const status = readStringFromKeys(row, candidate.statusColumns) || "unknown";
  const progressPct = parseProgressPct(row, candidate.progressColumns);
  const delay = resolveDelay(row, candidate.delayColumns, candidate.dueDateColumns);
  const blocked =
    readBooleanFromKeys(row, candidate.blockedColumns) ??
    ((readNumberFromKeys(row, candidate.blockedColumns) ?? 0) > 0);
  const externalFlag = readBooleanFromKeys(row, candidate.externalColumns);
  const phaseCount = readNumberFromKeys(row, candidate.phaseCountColumns);
  const completedPhases = readNumberFromKeys(row, candidate.completedPhaseColumns);
  const openIssues = readNumberFromKeys(row, candidate.openIssueColumns);
  const semiCritical = readNumberFromKeys(row, candidate.semiCriticalColumns);

  return {
    id,
    tenantId: readStringFromKeys(row, candidate.tenantColumns) || tenantId,
    commessaId,
    code,
    name,
    status,
    progressPct,
    isDelayed: delay.isDelayed,
    delayDays: delay.delayDays,
    isBlocked: blocked,
    isExternal: externalFlag,
    phaseCount,
    completedPhases,
    openIssues,
    semiCritical,
    dueDate: readDateTextFromKeys(row, candidate.dueDateColumns),
    startedAt: readDateTextFromKeys(row, candidate.startedAtColumns),
    completedAt: readDateTextFromKeys(row, candidate.completedAtColumns),
    sourceTable: candidate.table,
  };
};

const normalizePhase = (
  row: RawRow,
  candidate: PhaseTableCandidate,
  tenantId: string,
  commessaId: string,
  rowIndex: number,
  orderCodeById: Map<string, string>,
): CommessaProductionPhaseItem | null => {
  const id = readStringFromKeys(row, candidate.idColumns) || `${candidate.table}-phase-${rowIndex + 1}`;
  const orderId = readStringFromKeys(row, candidate.orderColumns) || null;
  const phaseCode = readStringFromKeys(row, candidate.phaseCodeColumns) || `Fase-${rowIndex + 1}`;
  const phaseName = readStringFromKeys(row, candidate.phaseNameColumns) || phaseCode;
  const status = readStringFromKeys(row, candidate.statusColumns) || "unknown";
  const progressPct = parseProgressPct(row, candidate.progressColumns);
  const delay = resolveDelay(row, candidate.delayColumns, candidate.dueDateColumns);
  const blocked =
    readBooleanFromKeys(row, candidate.blockedColumns) ??
    ((readNumberFromKeys(row, candidate.blockedColumns) ?? 0) > 0);
  const external = readBooleanFromKeys(row, candidate.externalColumns);
  const quality = readBooleanFromKeys(row, candidate.qualityColumns);
  const openIssues = readNumberFromKeys(row, candidate.openIssueColumns);
  const semiCritical = readNumberFromKeys(row, candidate.semiCriticalColumns);
  const orderCodeFromRow = readStringFromKeys(row, ["production_order_no", "order_no", "order_code", "document_no", "code"]);
  const orderCode = orderCodeFromRow || (orderId ? (orderCodeById.get(orderId) ?? null) : null);

  return {
    id,
    tenantId: readStringFromKeys(row, candidate.tenantColumns) || tenantId,
    commessaId,
    orderId,
    orderCode,
    phaseNo: readNumberFromKeys(row, candidate.phaseNoColumns),
    phaseCode,
    phaseName,
    status,
    progressPct,
    isDelayed: delay.isDelayed,
    delayDays: delay.delayDays,
    isBlocked: blocked,
    isExternal: external,
    hasQuality: quality,
    openIssues,
    semiCritical,
    dueDate: readDateTextFromKeys(row, candidate.dueDateColumns),
    sourceTable: candidate.table,
  };
};

const sortOrders = (items: CommessaProductionOrderItem[]) =>
  [...items].sort((left, right) => {
    if (left.isBlocked !== right.isBlocked) {
      return left.isBlocked ? -1 : 1;
    }
    if (left.isDelayed !== right.isDelayed) {
      return left.isDelayed ? -1 : 1;
    }
    return left.code.localeCompare(right.code, "it");
  });

const sortPhases = (items: CommessaProductionPhaseItem[]) =>
  [...items].sort((left, right) => {
    const leftOrder = left.orderCode ?? left.orderId ?? "";
    const rightOrder = right.orderCode ?? right.orderId ?? "";
    const byOrder = leftOrder.localeCompare(rightOrder, "it");
    if (byOrder !== 0) {
      return byOrder;
    }

    const leftNo = left.phaseNo ?? Number.MAX_SAFE_INTEGER;
    const rightNo = right.phaseNo ?? Number.MAX_SAFE_INTEGER;
    if (leftNo !== rightNo) {
      return leftNo - rightNo;
    }

    return left.phaseCode.localeCompare(right.phaseCode, "it");
  });

const dedupeOrders = (items: CommessaProductionOrderItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const dedupePhases = (items: CommessaProductionPhaseItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.id}:${item.orderId ?? "nd"}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const avg = (values: Array<number | null>) => {
  const nums = values.filter((value): value is number => value !== null);
  if (nums.length === 0) {
    return null;
  }
  const total = nums.reduce((sum, value) => sum + value, 0);
  return Math.round((total / nums.length) * 100) / 100;
};

const sumOrNull = (values: Array<number | null>) => {
  const nums = values.filter((value): value is number => value !== null);
  if (nums.length === 0) {
    return null;
  }
  return nums.reduce((sum, value) => sum + value, 0);
};

const buildSummary = (
  orders: CommessaProductionOrderItem[],
  phases: CommessaProductionPhaseItem[],
): CommessaProductionSummary => {
  return {
    ordersTotal: orders.length,
    phasesTotal: phases.length,
    avgOrderProgress: avg(orders.map((item) => item.progressPct)),
    avgPhaseProgress: avg(phases.map((item) => item.progressPct)),
    delayedOrders: orders.filter((item) => item.isDelayed).length,
    blockedOrders: orders.filter((item) => item.isBlocked).length,
    externalPhases: phases.filter((item) => item.isExternal === true).length,
    openIssues: sumOrNull([...orders.map((item) => item.openIssues), ...phases.map((item) => item.openIssues)]),
    semiCritical: sumOrNull([
      ...orders.map((item) => item.semiCritical),
      ...phases.map((item) => item.semiCritical),
    ]),
  };
};

const loadOrders = async (
  tenantId: string,
  commessaId: string,
  warnings: string[],
  sourceTables: Set<string>,
) => {
  const normalized: CommessaProductionOrderItem[] = [];

  for (const candidate of ORDERS_TABLE_CANDIDATES) {
    let foundTable = false;

    for (const parentColumn of candidate.commessaColumns) {
      for (const tenantColumn of candidate.tenantColumns) {
        const result = await queryRowsByTenantAndParent(
          candidate.table,
          tenantColumn,
          tenantId,
          parentColumn,
          commessaId,
          SAFE_LIST_LIMIT,
        );

        if (result.warning) {
          warnings.push(result.warning);
        }

        if (!result.exists) {
          continue;
        }

        foundTable = true;
        sourceTables.add(candidate.table);
        result.rows.forEach((row) => {
          const item = normalizeOrder(row, candidate, tenantId, commessaId);
          if (item) {
            normalized.push(item);
          }
        });

        // Found a valid parent/tenant combination; skip alternative columns for same table.
        break;
      }

      if (foundTable) {
        break;
      }
    }
  }

  return sortOrders(dedupeOrders(normalized));
};

const loadPhases = async (
  tenantId: string,
  commessaId: string,
  orderIds: string[],
  orderCodeById: Map<string, string>,
  warnings: string[],
  sourceTables: Set<string>,
) => {
  const normalized: CommessaProductionPhaseItem[] = [];

  for (const candidate of PHASE_TABLE_CANDIDATES) {
    let foundTable = false;

    if (orderIds.length > 0) {
      for (const orderColumn of candidate.orderColumns) {
        for (const tenantColumn of candidate.tenantColumns) {
          const result = await queryRowsByParentInTenant(
            candidate.table,
            tenantColumn,
            tenantId,
            orderColumn,
            orderIds,
            SAFE_LIST_LIMIT,
          );

          if (result.warning) {
            warnings.push(result.warning);
          }

          if (!result.exists) {
            continue;
          }

          foundTable = true;
          sourceTables.add(candidate.table);
          result.rows.forEach((row, index) => {
            const item = normalizePhase(row, candidate, tenantId, commessaId, index, orderCodeById);
            if (item) {
              normalized.push(item);
            }
          });
          break;
        }
        if (foundTable) {
          break;
        }
      }
    }

    if (!foundTable) {
      for (const parentColumn of candidate.commessaColumns) {
        for (const tenantColumn of candidate.tenantColumns) {
          const result = await queryRowsByTenantAndParent(
            candidate.table,
            tenantColumn,
            tenantId,
            parentColumn,
            commessaId,
            SAFE_LIST_LIMIT,
          );

          if (result.warning) {
            warnings.push(result.warning);
          }

          if (!result.exists) {
            continue;
          }

          foundTable = true;
          sourceTables.add(candidate.table);
          result.rows.forEach((row, index) => {
            const item = normalizePhase(row, candidate, tenantId, commessaId, index, orderCodeById);
            if (item) {
              normalized.push(item);
            }
          });
          break;
        }

        if (foundTable) {
          break;
        }
      }
    }
  }

  return sortPhases(dedupePhases(normalized));
};

const buildProduction = async (
  tenantId: string,
  commessaId: string,
): Promise<CommessaProductionResult> => {
  const warnings: string[] = [];
  const sourceTables = new Set<string>();

  const orders = await loadOrders(tenantId, commessaId, warnings, sourceTables);
  const orderCodeById = new Map<string, string>(orders.map((item) => [item.id, item.code]));
  const orderIds = orders.map((item) => item.id);
  const phases = await loadPhases(
    tenantId,
    commessaId,
    orderIds,
    orderCodeById,
    warnings,
    sourceTables,
  );

  const summary = buildSummary(orders, phases);

  let emptyStateHint: string | null = null;
  if (orders.length === 0 && phases.length === 0) {
    if (sourceTables.size === 0) {
      emptyStateHint =
        "Nessuna sorgente produzione disponibile nel DB esposto per la commessa selezionata.";
    } else {
      emptyStateHint =
        "Nessun ODP o fase collegata disponibile per la commessa nel tenant selezionato.";
    }
  }

  return {
    orders,
    phases,
    summary,
    sourceTables: [...sourceTables].sort((left, right) => left.localeCompare(right, "it")),
    warnings,
    emptyStateHint,
    error: null,
  };
};

export const getTenantCommessaProduction = async (
  tenantId: string,
  commessaId: string,
): Promise<CommessaProductionResult> => {
  if (!tenantId || !commessaId) {
    return {
      orders: [],
      phases: [],
      summary: {
        ordersTotal: 0,
        phasesTotal: 0,
        avgOrderProgress: null,
        avgPhaseProgress: null,
        delayedOrders: 0,
        blockedOrders: 0,
        externalPhases: 0,
        openIssues: null,
        semiCritical: null,
      },
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Parametri non validi.",
    };
  }

  try {
    return await buildProduction(tenantId, commessaId);
  } catch (caughtError) {
    return {
      orders: [],
      phases: [],
      summary: {
        ordersTotal: 0,
        phasesTotal: 0,
        avgOrderProgress: null,
        avgPhaseProgress: null,
        delayedOrders: 0,
        blockedOrders: 0,
        externalPhases: 0,
        openIssues: null,
        semiCritical: null,
      },
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};
