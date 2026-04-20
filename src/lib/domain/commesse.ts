import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type BinaryFilter = "all" | "yes" | "no";
export type DelayFilter = "all" | "late" | "on-time";

export type CommessaCatalogFilters = {
  q?: string;
  status?: string;
  priority?: string;
  delay?: DelayFilter;
  multiActor?: BinaryFilter;
};

export type CommessaProgressiveSnapshot = {
  ordered: number | null;
  produced: number | null;
  shipped: number | null;
  purchased: number | null;
  invoiced: number | null;
};

export type CommessaListItem = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: string;
  priority: string;
  dueDate: string | null;
  isDelayed: boolean;
  delayDays: number | null;
  multiActor: boolean;
  actorCount: number | null;
  productId: string | null;
  salesOrderId: string | null;
  productionOrderId: string | null;
  customerCode: string | null;
  customerName: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  plannedStartAt: string | null;
  progressives: CommessaProgressiveSnapshot;
};

export type CommessaOverviewActor = {
  id: string;
  role: string;
  code: string | null;
  name: string | null;
  source: string;
};

export type CommessaOverviewIssue = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
};

export type CommessaTimelineEvent = {
  id: string;
  at: string | null;
  title: string;
  detail: string;
  source: string;
};

export type CommessaOperationalSummary = {
  productionCompletion: number | null;
  shippingCompletion: number | null;
  procurementCoverage: number | null;
  invoicingCoverage: number | null;
  dueDate: string | null;
  delayLabel: string;
  openIssues: number;
};

export type CommessaOverviewResult = {
  commessa: CommessaListItem | null;
  actors: CommessaOverviewActor[];
  issues: CommessaOverviewIssue[];
  timeline: CommessaTimelineEvent[];
  operational: CommessaOperationalSummary | null;
  sourceTable: string | null;
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

export type CommessaCatalogResult = {
  commesse: CommessaListItem[];
  statuses: string[];
  priorities: string[];
  sourceTable: string | null;
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

type RawRow = Record<string, unknown>;

type CommesseTableCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  codeColumns: string[];
  nameColumns: string[];
  statusColumns: string[];
  priorityColumns: string[];
  dueDateColumns: string[];
  delayColumns: string[];
  multiActorColumns: string[];
  actorCountColumns: string[];
  customerColumns: string[];
  supplierColumns: string[];
  orderedColumns: string[];
  producedColumns: string[];
  shippedColumns: string[];
  purchasedColumns: string[];
  invoicedColumns: string[];
};

type TimelineTableCandidate = {
  table: string;
  parentColumns: string[];
  tenantColumns: string[];
  atColumns: string[];
  titleColumns: string[];
  detailColumns: string[];
};

type CandidateRowsBundle = {
  candidate: CommesseTableCandidate;
  rows: RawRow[];
};

const SAFE_LIST_LIMIT = 1200;

const TABLE_CANDIDATES: CommesseTableCandidate[] = [
  {
    table: "commesse",
    idColumns: ["id", "commessa_id", "job_id", "project_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["code", "commessa_code", "job_code", "project_code", "document_no"],
    nameColumns: ["name", "title", "description", "project_name", "customer_name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status", "is_active"],
    priorityColumns: ["priority", "priority_level", "priority_code", "urgency"],
    dueDateColumns: ["due_date", "delivery_due_date", "planned_end_date", "target_date"],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    multiActorColumns: ["is_multi_actor", "multi_actor", "has_multiple_actors"],
    actorCountColumns: ["actor_count", "stakeholder_count", "participant_count"],
    customerColumns: ["customer_id", "customer_code"],
    supplierColumns: ["supplier_id", "vendor_id", "subcontractor_id"],
    orderedColumns: ["ordered_qty", "ordered_amount", "qty_ordered", "amount_ordered"],
    producedColumns: ["produced_qty", "produced_amount", "qty_produced", "amount_produced"],
    shippedColumns: ["shipped_qty", "shipped_amount", "qty_shipped", "amount_shipped"],
    purchasedColumns: ["purchased_qty", "purchased_amount", "qty_purchased", "amount_purchased"],
    invoicedColumns: ["invoiced_qty", "invoiced_amount", "qty_invoiced", "amount_invoiced"],
  },
  {
    table: "jobs",
    idColumns: ["id", "job_id", "project_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["code", "job_code", "project_code", "document_no"],
    nameColumns: ["name", "title", "description", "customer_name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status", "is_active"],
    priorityColumns: ["priority", "priority_level", "priority_code", "urgency"],
    dueDateColumns: ["due_date", "delivery_due_date", "planned_end_date", "target_date"],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    multiActorColumns: ["is_multi_actor", "multi_actor", "has_multiple_actors"],
    actorCountColumns: ["actor_count", "stakeholder_count", "participant_count"],
    customerColumns: ["customer_id", "customer_code"],
    supplierColumns: ["supplier_id", "vendor_id", "subcontractor_id"],
    orderedColumns: ["ordered_qty", "ordered_amount", "qty_ordered", "amount_ordered"],
    producedColumns: ["produced_qty", "produced_amount", "qty_produced", "amount_produced"],
    shippedColumns: ["shipped_qty", "shipped_amount", "qty_shipped", "amount_shipped"],
    purchasedColumns: ["purchased_qty", "purchased_amount", "qty_purchased", "amount_purchased"],
    invoicedColumns: ["invoiced_qty", "invoiced_amount", "qty_invoiced", "amount_invoiced"],
  },
  {
    table: "production_orders",
    idColumns: ["id", "production_order_id", "job_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["document_no", "code", "order_no", "production_order_no"],
    nameColumns: ["title", "description", "name", "customer_name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status", "is_active"],
    priorityColumns: ["priority", "priority_level", "priority_code", "urgency"],
    dueDateColumns: ["due_date", "delivery_due_date", "planned_end_date", "target_date"],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    multiActorColumns: ["is_multi_actor", "multi_actor", "has_multiple_actors"],
    actorCountColumns: ["actor_count", "stakeholder_count", "participant_count"],
    customerColumns: ["customer_id", "customer_code", "sales_order_id"],
    supplierColumns: ["supplier_id", "vendor_id", "subcontractor_id"],
    orderedColumns: ["ordered_qty", "ordered_amount", "qty_ordered", "amount_ordered"],
    producedColumns: ["produced_qty", "produced_amount", "qty_produced", "amount_produced"],
    shippedColumns: ["shipped_qty", "shipped_amount", "qty_shipped", "amount_shipped"],
    purchasedColumns: ["purchased_qty", "purchased_amount", "qty_purchased", "amount_purchased"],
    invoicedColumns: ["invoiced_qty", "invoiced_amount", "qty_invoiced", "amount_invoiced"],
  },
  {
    table: "sales_orders",
    idColumns: ["id", "sales_order_id", "job_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["document_no", "order_no", "code", "sales_order_no"],
    nameColumns: ["title", "description", "name", "customer_name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status", "is_active"],
    priorityColumns: ["priority", "priority_level", "priority_code", "urgency"],
    dueDateColumns: ["due_date", "delivery_due_date", "requested_delivery_date", "target_date"],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    multiActorColumns: ["is_multi_actor", "multi_actor", "has_multiple_actors"],
    actorCountColumns: ["actor_count", "stakeholder_count", "participant_count"],
    customerColumns: ["customer_id", "customer_code"],
    supplierColumns: ["supplier_id", "vendor_id", "subcontractor_id"],
    orderedColumns: ["ordered_qty", "ordered_amount", "qty_ordered", "amount_ordered"],
    producedColumns: ["produced_qty", "produced_amount", "qty_produced", "amount_produced"],
    shippedColumns: ["shipped_qty", "shipped_amount", "qty_shipped", "amount_shipped"],
    purchasedColumns: ["purchased_qty", "purchased_amount", "qty_purchased", "amount_purchased"],
    invoicedColumns: ["invoiced_qty", "invoiced_amount", "qty_invoiced", "amount_invoiced"],
  },
  {
    table: "projects",
    idColumns: ["id", "project_id", "job_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["code", "project_code", "job_code", "document_no"],
    nameColumns: ["name", "title", "description", "customer_name"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status", "is_active"],
    priorityColumns: ["priority", "priority_level", "priority_code", "urgency"],
    dueDateColumns: ["due_date", "target_date", "planned_end_date"],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    multiActorColumns: ["is_multi_actor", "multi_actor", "has_multiple_actors"],
    actorCountColumns: ["actor_count", "stakeholder_count", "participant_count"],
    customerColumns: ["customer_id", "customer_code"],
    supplierColumns: ["supplier_id", "vendor_id", "subcontractor_id"],
    orderedColumns: ["ordered_qty", "ordered_amount", "qty_ordered", "amount_ordered"],
    producedColumns: ["produced_qty", "produced_amount", "qty_produced", "amount_produced"],
    shippedColumns: ["shipped_qty", "shipped_amount", "qty_shipped", "amount_shipped"],
    purchasedColumns: ["purchased_qty", "purchased_amount", "qty_purchased", "amount_purchased"],
    invoicedColumns: ["invoiced_qty", "invoiced_amount", "qty_invoiced", "amount_invoiced"],
  },
];

const PRODUCT_ID_COLUMNS = ["product_id", "item_id", "product_item_id"];
const SALES_ORDER_ID_COLUMNS = ["sales_order_id", "origin_sales_order_id"];
const PRODUCTION_ORDER_ID_COLUMNS = [
  "production_order_id",
  "origin_production_order_id",
  "odp_id",
];
const CUSTOMER_CODE_COLUMNS = ["customer_code", "customer_id"];
const CUSTOMER_NAME_COLUMNS = ["customer_name", "customer_display_name"];
const SUPPLIER_CODE_COLUMNS = [
  "supplier_code",
  "vendor_code",
  "subcontractor_code",
  "supplier_id",
  "vendor_id",
  "subcontractor_id",
];
const SUPPLIER_NAME_COLUMNS = ["supplier_name", "vendor_name", "subcontractor_name"];
const RESPONSIBLE_CODE_COLUMNS = ["responsible_user_id", "owner_user_id", "project_manager_id"];
const RESPONSIBLE_NAME_COLUMNS = [
  "responsible_name",
  "owner_name",
  "project_manager_name",
];
const PLANNER_CODE_COLUMNS = ["planner_user_id", "planning_user_id", "scheduler_user_id"];
const PLANNER_NAME_COLUMNS = ["planner_name", "planning_user_name", "scheduler_name"];

const CREATED_AT_COLUMNS = ["created_at"];
const UPDATED_AT_COLUMNS = ["updated_at", "last_updated_at"];
const PLANNED_START_COLUMNS = ["planned_start_at", "planned_start_date", "start_date"];

const OPEN_ISSUES_COLUMNS = ["open_issue_count", "criticality_count", "open_alert_count"];
const BLOCKING_ISSUES_COLUMNS = ["has_blocking_issue", "has_blockers"];
const EVENT_ID_COLUMNS = ["id", "event_id", "history_id"];

const TIMELINE_TABLE_CANDIDATES: TimelineTableCandidate[] = [
  {
    table: "commessa_events",
    parentColumns: ["commessa_id", "job_id", "project_id"],
    tenantColumns: ["tenant_id"],
    atColumns: ["event_at", "occurred_at", "created_at"],
    titleColumns: ["event_type", "type", "status"],
    detailColumns: ["description", "message", "note"],
  },
  {
    table: "job_events",
    parentColumns: ["job_id", "project_id"],
    tenantColumns: ["tenant_id"],
    atColumns: ["event_at", "occurred_at", "created_at"],
    titleColumns: ["event_type", "type", "status"],
    detailColumns: ["description", "message", "note"],
  },
  {
    table: "project_events",
    parentColumns: ["project_id", "job_id"],
    tenantColumns: ["tenant_id"],
    atColumns: ["event_at", "occurred_at", "created_at"],
    titleColumns: ["event_type", "type", "status"],
    detailColumns: ["description", "message", "note"],
  },
  {
    table: "production_order_events",
    parentColumns: ["production_order_id", "job_id"],
    tenantColumns: ["tenant_id"],
    atColumns: ["event_at", "occurred_at", "created_at"],
    titleColumns: ["event_type", "type", "status"],
    detailColumns: ["description", "message", "note"],
  },
  {
    table: "production_order_status_history",
    parentColumns: ["production_order_id", "job_id"],
    tenantColumns: ["tenant_id"],
    atColumns: ["changed_at", "created_at", "event_at"],
    titleColumns: ["status", "new_status"],
    detailColumns: ["reason", "note", "description"],
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
    if (["true", "1", "yes", "y", "on", "enabled", "active"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "off", "disabled", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return null;
};

const parseDate = (value: unknown): Date | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
};

const toDateText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

const readStringValuesFromKeys = (row: RawRow, keys: string[]) => {
  return [...new Set(keys.map((key) => parseString(row[key])).filter((value) => value.length > 0))];
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
    const value = toDateText(row[key]);
    if (value) {
      return value;
    }
  }
  return null;
};

const normalizeStatus = (row: RawRow, candidate: CommesseTableCandidate) => {
  const rawStatus = row[candidate.statusColumns[0] ?? ""];
  if (typeof rawStatus === "string") {
    const normalized = rawStatus.trim();
    return normalized.length > 0 ? normalized : "unknown";
  }

  const booleanStatus = readBooleanFromKeys(row, candidate.statusColumns);
  if (booleanStatus !== null) {
    return booleanStatus ? "active" : "inactive";
  }

  return "unknown";
};

const normalizePriority = (row: RawRow, candidate: CommesseTableCandidate) => {
  const rawPriority = readStringFromKeys(row, candidate.priorityColumns);
  if (!rawPriority) {
    return "normal";
  }

  const normalized = rawPriority.toLowerCase();
  if (["critical", "urgent", "high", "alta"].includes(normalized)) {
    return "high";
  }
  if (["medium", "media", "normal"].includes(normalized)) {
    return "normal";
  }
  if (["low", "bassa"].includes(normalized)) {
    return "low";
  }
  return rawPriority;
};

const closedStatuses = ["closed", "completed", "done", "cancelled", "canceled"];

const buildDelayInfo = (row: RawRow, candidate: CommesseTableCandidate, status: string) => {
  const explicitDelay = readNumberFromKeys(row, candidate.delayColumns);
  if (explicitDelay !== null) {
    return {
      isDelayed: explicitDelay > 0,
      delayDays: explicitDelay > 0 ? Math.floor(explicitDelay) : 0,
      dueDate: readDateTextFromKeys(row, candidate.dueDateColumns),
    };
  }

  const dueDateValue = readDateFromKeys(row, candidate.dueDateColumns);
  const dueDateText = readDateTextFromKeys(row, candidate.dueDateColumns);
  if (!dueDateValue) {
    return {
      isDelayed: false,
      delayDays: null as number | null,
      dueDate: dueDateText,
    };
  }

  const statusNormalized = status.toLowerCase();
  if (closedStatuses.includes(statusNormalized)) {
    return {
      isDelayed: false,
      delayDays: 0,
      dueDate: dueDateText,
    };
  }

  const now = new Date();
  const millis = now.getTime() - dueDateValue.getTime();
  const daysLate = Math.floor(millis / (1000 * 60 * 60 * 24));
  return {
    isDelayed: daysLate > 0,
    delayDays: daysLate > 0 ? daysLate : 0,
    dueDate: dueDateText,
  };
};

const normalizeProgressiveSnapshot = (row: RawRow, candidate: CommesseTableCandidate) => ({
  ordered: readNumberFromKeys(row, candidate.orderedColumns),
  produced: readNumberFromKeys(row, candidate.producedColumns),
  shipped: readNumberFromKeys(row, candidate.shippedColumns),
  purchased: readNumberFromKeys(row, candidate.purchasedColumns),
  invoiced: readNumberFromKeys(row, candidate.invoicedColumns),
});

const normalizeMultiActor = (row: RawRow, candidate: CommesseTableCandidate) => {
  const explicit = readBooleanFromKeys(row, candidate.multiActorColumns);
  const actorCount = readNumberFromKeys(row, candidate.actorCountColumns);
  const hasCustomer = readStringFromKeys(row, candidate.customerColumns).length > 0;
  const hasSupplier = readStringFromKeys(row, candidate.supplierColumns).length > 0;

  if (explicit !== null) {
    return {
      multiActor: explicit || (actorCount !== null && actorCount > 1),
      actorCount,
    };
  }

  if (actorCount !== null) {
    return {
      multiActor: actorCount > 1,
      actorCount,
    };
  }

  return {
    multiActor: hasCustomer && hasSupplier,
    actorCount: null as number | null,
  };
};

const normalizeRow = (
  row: RawRow,
  candidate: CommesseTableCandidate,
  tenantId: string,
): CommessaListItem | null => {
  const id = readStringFromKeys(row, candidate.idColumns);
  if (!id) {
    return null;
  }

  const rowTenantId = readStringFromKeys(row, candidate.tenantColumns) || tenantId;
  const status = normalizeStatus(row, candidate);
  const priority = normalizePriority(row, candidate);
  const delay = buildDelayInfo(row, candidate, status);
  const multiActor = normalizeMultiActor(row, candidate);

  return {
    id,
    tenantId: rowTenantId,
    code: readStringFromKeys(row, candidate.codeColumns) || id,
    name: readStringFromKeys(row, candidate.nameColumns) || id,
    status,
    priority,
    dueDate: delay.dueDate,
    isDelayed: delay.isDelayed,
    delayDays: delay.delayDays,
    multiActor: multiActor.multiActor,
    actorCount: multiActor.actorCount,
    productId: readStringFromKeys(row, PRODUCT_ID_COLUMNS) || null,
    salesOrderId: readStringFromKeys(row, SALES_ORDER_ID_COLUMNS) || null,
    productionOrderId: readStringFromKeys(row, PRODUCTION_ORDER_ID_COLUMNS) || null,
    customerCode: readStringFromKeys(row, CUSTOMER_CODE_COLUMNS) || null,
    customerName: readStringFromKeys(row, CUSTOMER_NAME_COLUMNS) || null,
    supplierCode: readStringFromKeys(row, SUPPLIER_CODE_COLUMNS) || null,
    supplierName: readStringFromKeys(row, SUPPLIER_NAME_COLUMNS) || null,
    createdAt: readDateTextFromKeys(row, CREATED_AT_COLUMNS),
    updatedAt: readDateTextFromKeys(row, UPDATED_AT_COLUMNS),
    plannedStartAt: readDateTextFromKeys(row, PLANNED_START_COLUMNS),
    progressives: normalizeProgressiveSnapshot(row, candidate),
  };
};

const queryCandidateRows = async (
  candidate: CommesseTableCandidate,
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

const findRowById = (rows: RawRow[], idColumns: string[], rowId: string) => {
  return (
    rows.find((row) => {
      const id = readStringFromKeys(row, idColumns);
      return id === rowId;
    }) ?? null
  );
};

const queryTimelineRows = async (
  candidate: TimelineTableCandidate,
  tenantId: string,
  parentId: string,
): Promise<{ rows: RawRow[]; warning: string | null }> => {
  const admin = getSupabaseAdminClient();

  for (const parentColumn of candidate.parentColumns) {
    for (const tenantColumn of candidate.tenantColumns) {
      const { data, error } = await admin
        .from(candidate.table)
        .select("*")
        .eq(parentColumn, parentId)
        .eq(tenantColumn, tenantId)
        .limit(120);

      if (!error) {
        return {
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
        rows: [],
        warning: `Errore su ${candidate.table}: ${message}`,
      };
    }
  }

  for (const parentColumn of candidate.parentColumns) {
    const { data, error } = await admin
      .from(candidate.table)
      .select("*")
      .eq(parentColumn, parentId)
      .limit(120);

    if (!error) {
      const rows = ((data ?? []) as RawRow[]).filter((row) => {
        const rowTenantId = readStringFromKeys(row, candidate.tenantColumns);
        return !rowTenantId || rowTenantId === tenantId;
      });

      return {
        rows,
        warning: null,
      };
    }

    const message = error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, parentColumn)) {
      continue;
    }

    return {
      rows: [],
      warning: `Errore su ${candidate.table}: ${message}`,
    };
  }

  return {
    rows: [],
    warning: null,
  };
};

const normalizeBinaryFilter = (value: string | undefined): BinaryFilter => {
  if (value === "yes" || value === "no") {
    return value;
  }
  return "all";
};

const normalizeDelayFilter = (value: string | undefined): DelayFilter => {
  if (value === "late" || value === "on-time") {
    return value;
  }
  return "all";
};

const matchesBinaryFilter = (value: boolean, filter: BinaryFilter) => {
  if (filter === "all") {
    return true;
  }
  return filter === "yes" ? value : !value;
};

const matchesDelayFilter = (value: boolean, filter: DelayFilter) => {
  if (filter === "all") {
    return true;
  }
  return filter === "late" ? value : !value;
};

const applyFilters = (commesse: CommessaListItem[], filters: CommessaCatalogFilters) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const selectedStatus = (filters.status ?? "all").trim().toLowerCase();
  const selectedPriority = (filters.priority ?? "all").trim().toLowerCase();
  const delayFilter = normalizeDelayFilter(filters.delay);
  const multiActorFilter = normalizeBinaryFilter(filters.multiActor);

  return commesse.filter((commessa) => {
    if (query) {
      const haystack =
        `${commessa.code} ${commessa.name} ${commessa.status} ${commessa.priority}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (selectedStatus !== "all" && commessa.status.toLowerCase() !== selectedStatus) {
      return false;
    }

    if (selectedPriority !== "all" && commessa.priority.toLowerCase() !== selectedPriority) {
      return false;
    }

    if (!matchesDelayFilter(commessa.isDelayed, delayFilter)) {
      return false;
    }

    if (!matchesBinaryFilter(commessa.multiActor, multiActorFilter)) {
      return false;
    }

    return true;
  });
};

const priorityRank = (value: string) => {
  const normalized = value.toLowerCase();
  if (["critical", "urgent", "high", "alta"].includes(normalized)) {
    return 3;
  }
  if (["normal", "medium", "media"].includes(normalized)) {
    return 2;
  }
  if (["low", "bassa"].includes(normalized)) {
    return 1;
  }
  return 0;
};

const sortCommesse = (commesse: CommessaListItem[]) => {
  return [...commesse].sort((left, right) => {
    if (left.isDelayed !== right.isDelayed) {
      return left.isDelayed ? -1 : 1;
    }

    const byPriority = priorityRank(right.priority) - priorityRank(left.priority);
    if (byPriority !== 0) {
      return byPriority;
    }

    if (left.delayDays !== right.delayDays) {
      return (right.delayDays ?? 0) - (left.delayDays ?? 0);
    }

    return left.code.localeCompare(right.code, "it");
  });
};

const collectStatuses = (commesse: CommessaListItem[]) => {
  return [...new Set(commesse.map((commessa) => commessa.status))].sort((left, right) =>
    left.localeCompare(right, "it"),
  );
};

const collectPriorities = (commesse: CommessaListItem[]) => {
  return [...new Set(commesse.map((commessa) => commessa.priority))].sort((left, right) =>
    right.localeCompare(left, "it"),
  );
};

const buildCommessaActors = (row: RawRow): CommessaOverviewActor[] => {
  const actors: CommessaOverviewActor[] = [];

  const customerCode = readStringFromKeys(row, CUSTOMER_CODE_COLUMNS) || null;
  const customerName = readStringFromKeys(row, CUSTOMER_NAME_COLUMNS) || null;
  if (customerCode || customerName) {
    actors.push({
      id: "actor-customer",
      role: "Cliente",
      code: customerCode,
      name: customerName,
      source: "commessa",
    });
  }

  const supplierCode = readStringFromKeys(row, SUPPLIER_CODE_COLUMNS) || null;
  const supplierName = readStringFromKeys(row, SUPPLIER_NAME_COLUMNS) || null;
  if (supplierCode || supplierName) {
    actors.push({
      id: "actor-supplier",
      role: "Fornitore/Terzista",
      code: supplierCode,
      name: supplierName,
      source: "commessa",
    });
  }

  const ownerCode = readStringFromKeys(row, RESPONSIBLE_CODE_COLUMNS) || null;
  const ownerName = readStringFromKeys(row, RESPONSIBLE_NAME_COLUMNS) || null;
  if (ownerCode || ownerName) {
    actors.push({
      id: "actor-owner",
      role: "Responsabile",
      code: ownerCode,
      name: ownerName,
      source: "commessa",
    });
  }

  const plannerCode = readStringFromKeys(row, PLANNER_CODE_COLUMNS) || null;
  const plannerName = readStringFromKeys(row, PLANNER_NAME_COLUMNS) || null;
  if (plannerCode || plannerName) {
    actors.push({
      id: "actor-planner",
      role: "Pianificazione",
      code: plannerCode,
      name: plannerName,
      source: "commessa",
    });
  }

  return actors;
};

const buildCommessaIssues = (commessa: CommessaListItem, row: RawRow): CommessaOverviewIssue[] => {
  const issues: CommessaOverviewIssue[] = [];

  if (commessa.isDelayed) {
    issues.push({
      id: "delay",
      severity: "high",
      title: "Ritardo attivo",
      detail:
        commessa.delayDays !== null
          ? `La commessa risulta in ritardo di ${commessa.delayDays} giorni.`
          : "La commessa risulta in ritardo rispetto alla data prevista.",
    });
  }

  if (!commessa.dueDate) {
    issues.push({
      id: "missing-due-date",
      severity: "medium",
      title: "Scadenza non valorizzata",
      detail: "La data di scadenza non e disponibile nel dataset corrente.",
    });
  }

  if (commessa.status.toLowerCase() === "unknown") {
    issues.push({
      id: "unknown-status",
      severity: "medium",
      title: "Stato non determinato",
      detail: "Lo stato della commessa non risulta mappato nel dominio esposto.",
    });
  }

  const ordered = commessa.progressives.ordered;
  const produced = commessa.progressives.produced;
  const shipped = commessa.progressives.shipped;
  const purchased = commessa.progressives.purchased;
  const invoiced = commessa.progressives.invoiced;

  if (ordered !== null && produced !== null && produced < ordered) {
    issues.push({
      id: "production-gap",
      severity: "medium",
      title: "Produzione sotto ordinato",
      detail: `Prodotto ${produced} su ordinato ${ordered}.`,
    });
  }

  if (produced !== null && shipped !== null && shipped < produced) {
    issues.push({
      id: "shipping-gap",
      severity: "low",
      title: "Spedizione sotto prodotto",
      detail: `Spedito ${shipped} su prodotto ${produced}.`,
    });
  }

  if (ordered !== null && purchased !== null && purchased < ordered) {
    issues.push({
      id: "procurement-gap",
      severity: "low",
      title: "Acquisti sotto ordinato",
      detail: `Acquistato ${purchased} su ordinato ${ordered}.`,
    });
  }

  if (ordered !== null && invoiced !== null && invoiced < ordered) {
    issues.push({
      id: "invoicing-gap",
      severity: "low",
      title: "Fatturazione incompleta",
      detail: `Fatturato ${invoiced} su ordinato ${ordered}.`,
    });
  }

  const explicitOpenIssues = readNumberFromKeys(row, OPEN_ISSUES_COLUMNS);
  if (explicitOpenIssues !== null && explicitOpenIssues > 0) {
    issues.push({
      id: "open-issues-count",
      severity: explicitOpenIssues > 3 ? "high" : "medium",
      title: "Criticita aperte rilevate",
      detail: `Il dataset riporta ${explicitOpenIssues} criticita aperte.`,
    });
  }

  const hasBlockingIssues = readBooleanFromKeys(row, BLOCKING_ISSUES_COLUMNS);
  if (hasBlockingIssues === true) {
    issues.push({
      id: "blocking-issue",
      severity: "high",
      title: "Blocco operativo",
      detail: "E presente almeno una criticita bloccante.",
    });
  }

  return issues;
};

const ratio = (numerator: number | null, denominator: number | null) => {
  if (numerator === null || denominator === null || denominator <= 0) {
    return null;
  }
  return Math.min(1, Math.max(0, numerator / denominator));
};

const toDelayLabel = (commessa: CommessaListItem) => {
  if (!commessa.isDelayed) {
    return "In linea";
  }
  if (commessa.delayDays === null) {
    return "In ritardo";
  }
  return `In ritardo di ${commessa.delayDays} gg`;
};

const buildOperationalSummary = (
  commessa: CommessaListItem,
  openIssues: number,
): CommessaOperationalSummary => {
  const ordered = commessa.progressives.ordered;
  return {
    productionCompletion: ratio(commessa.progressives.produced, ordered),
    shippingCompletion: ratio(commessa.progressives.shipped, ordered),
    procurementCoverage: ratio(commessa.progressives.purchased, ordered),
    invoicingCoverage: ratio(commessa.progressives.invoiced, ordered),
    dueDate: commessa.dueDate,
    delayLabel: toDelayLabel(commessa),
    openIssues,
  };
};

const pushTimelineEvent = (
  bucket: CommessaTimelineEvent[],
  event: CommessaTimelineEvent | null,
) => {
  if (event) {
    bucket.push(event);
  }
};

const makeTimelineEvent = (
  id: string,
  at: string | null,
  title: string,
  detail: string,
  source: string,
): CommessaTimelineEvent | null => {
  if (!title.trim()) {
    return null;
  }
  return { id, at, title, detail, source };
};

const sortTimeline = (events: CommessaTimelineEvent[]) => {
  const safeDate = (value: string | null) => {
    if (!value) {
      return -1;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return -1;
    }
    return parsed.getTime();
  };

  return [...events].sort((left, right) => safeDate(right.at) - safeDate(left.at));
};

const buildBaseTimeline = (commessa: CommessaListItem): CommessaTimelineEvent[] => {
  const events: CommessaTimelineEvent[] = [];

  pushTimelineEvent(
    events,
    makeTimelineEvent(
      "timeline-created",
      commessa.createdAt,
      "Creazione commessa",
      "Record iniziale registrato nel dominio commessa.",
      "commessa",
    ),
  );

  pushTimelineEvent(
    events,
    makeTimelineEvent(
      "timeline-planned-start",
      commessa.plannedStartAt,
      "Avvio pianificato",
      "Data di avvio pianificata.",
      "commessa",
    ),
  );

  pushTimelineEvent(
    events,
    makeTimelineEvent(
      "timeline-due-date",
      commessa.dueDate,
      "Scadenza prevista",
      "Data obiettivo di completamento commessa.",
      "commessa",
    ),
  );

  pushTimelineEvent(
    events,
    makeTimelineEvent(
      "timeline-updated",
      commessa.updatedAt,
      "Ultimo aggiornamento",
      "Ultimo aggiornamento disponibile a livello testata.",
      "commessa",
    ),
  );

  return events;
};

const loadCandidateRows = async (tenantId: string, limit: number) => {
  const warnings: string[] = [];
  const availableCandidates: CandidateRowsBundle[] = [];

  for (const candidate of TABLE_CANDIDATES) {
    const result = await queryCandidateRows(candidate, tenantId, limit);
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

  availableCandidates.sort((left, right) => right.rows.length - left.rows.length);

  return {
    warnings,
    availableCandidates,
  };
};

const resolveCommessaSource = (
  tenantId: string,
  commessaId: string,
  candidateRows: CandidateRowsBundle[],
) => {
  for (const candidateSet of candidateRows) {
    const sourceRow = findRowById(candidateSet.rows, candidateSet.candidate.idColumns, commessaId);
    if (!sourceRow) {
      continue;
    }

    const commessa = normalizeRow(sourceRow, candidateSet.candidate, tenantId);
    if (!commessa) {
      continue;
    }

    return {
      candidate: candidateSet.candidate,
      row: sourceRow,
      commessa,
    };
  }

  return null;
};

const addWarning = (warnings: string[], warning: string | null) => {
  if (warning && !warnings.includes(warning)) {
    warnings.push(warning);
  }
};

const buildTimelineFromDatabase = async (
  tenantId: string,
  sourceRow: RawRow,
  sourceCandidate: CommesseTableCandidate,
  commessa: CommessaListItem,
  warnings: string[],
) => {
  const parentIds = new Set<string>([commessa.id]);
  for (const value of readStringValuesFromKeys(sourceRow, sourceCandidate.idColumns)) {
    parentIds.add(value);
  }
  for (const value of readStringValuesFromKeys(sourceRow, SALES_ORDER_ID_COLUMNS)) {
    parentIds.add(value);
  }
  for (const value of readStringValuesFromKeys(sourceRow, PRODUCTION_ORDER_ID_COLUMNS)) {
    parentIds.add(value);
  }
  if (commessa.salesOrderId) {
    parentIds.add(commessa.salesOrderId);
  }
  if (commessa.productionOrderId) {
    parentIds.add(commessa.productionOrderId);
  }

  const events: CommessaTimelineEvent[] = [];
  const eventKeys = new Set<string>();

  for (const timelineCandidate of TIMELINE_TABLE_CANDIDATES) {
    for (const parentId of parentIds) {
      const result = await queryTimelineRows(timelineCandidate, tenantId, parentId);
      addWarning(warnings, result.warning);

      result.rows.forEach((row, index) => {
        const at = readDateTextFromKeys(row, timelineCandidate.atColumns);
        const rawTitle = readStringFromKeys(row, timelineCandidate.titleColumns);
        const title = rawTitle ? rawTitle.replace(/_/g, " ") : "Aggiornamento";
        const detail =
          readStringFromKeys(row, timelineCandidate.detailColumns) ||
          `Evento registrato su ${timelineCandidate.table}.`;
        const eventId =
          readStringFromKeys(row, EVENT_ID_COLUMNS) ||
          `${timelineCandidate.table}-${parentId}-${index}-${at ?? "nd"}-${title}`;

        const eventKey = `${timelineCandidate.table}:${eventId}`;
        if (eventKeys.has(eventKey)) {
          return;
        }

        eventKeys.add(eventKey);
        pushTimelineEvent(
          events,
          makeTimelineEvent(eventKey, at, title, detail, timelineCandidate.table),
        );
      });
    }
  }

  return sortTimeline(events).slice(0, 24);
};

const buildCatalogFromCandidate = async (
  tenantId: string,
  filters: CommessaCatalogFilters,
): Promise<CommessaCatalogResult> => {
  const { warnings, availableCandidates } = await loadCandidateRows(tenantId, SAFE_LIST_LIMIT);

  if (availableCandidates.length === 0) {
    return {
      commesse: [],
      statuses: [],
      priorities: [],
      sourceTable: null,
      warnings,
      emptyStateHint:
        "Nessuna sorgente commesse disponibile nel DB esposto. La vista resta pronta in attesa del dominio.",
      error: null,
    };
  }

  const winner = availableCandidates[0];

  const normalizedRows = winner.rows
    .map((row) => normalizeRow(row, winner.candidate, tenantId))
    .filter((row): row is CommessaListItem => Boolean(row));

  const sorted = sortCommesse(normalizedRows);
  const filtered = applyFilters(sorted, filters);
  const statuses = collectStatuses(sorted);
  const priorities = collectPriorities(sorted);

  let emptyStateHint: string | null = null;
  if (sorted.length === 0) {
    emptyStateHint = "Nessuna commessa disponibile per il tenant selezionato.";
  } else if (filtered.length === 0) {
    emptyStateHint = "Nessuna commessa trovata con i filtri correnti.";
  }

  return {
    commesse: filtered,
    statuses,
    priorities,
    sourceTable: winner.candidate.table,
    warnings,
    emptyStateHint,
    error: null,
  };
};

const buildOverviewFromCandidate = async (
  tenantId: string,
  commessaId: string,
): Promise<CommessaOverviewResult> => {
  const { warnings, availableCandidates } = await loadCandidateRows(tenantId, SAFE_LIST_LIMIT);

  if (availableCandidates.length === 0) {
    return {
      commessa: null,
      actors: [],
      issues: [],
      timeline: [],
      operational: null,
      sourceTable: null,
      warnings,
      emptyStateHint:
        "Nessuna sorgente commesse disponibile nel DB esposto. La vista overview resta pronta in attesa del dominio.",
      error: null,
    };
  }

  const source = resolveCommessaSource(tenantId, commessaId, availableCandidates);
  if (!source) {
    return {
      commessa: null,
      actors: [],
      issues: [],
      timeline: [],
      operational: null,
      sourceTable: availableCandidates[0].candidate.table,
      warnings,
      emptyStateHint: "Commessa non trovata per il tenant selezionato.",
      error: null,
    };
  }

  const actors = buildCommessaActors(source.row);
  const issues = buildCommessaIssues(source.commessa, source.row);
  const explicitOpenIssues = readNumberFromKeys(source.row, OPEN_ISSUES_COLUMNS);
  const openIssues =
    explicitOpenIssues !== null ? Math.max(0, Math.floor(explicitOpenIssues)) : issues.length;
  const operational = buildOperationalSummary(source.commessa, openIssues);

  const baseTimeline = buildBaseTimeline(source.commessa);
  const runtimeTimeline = await buildTimelineFromDatabase(
    tenantId,
    source.row,
    source.candidate,
    source.commessa,
    warnings,
  );
  const timeline = sortTimeline([...baseTimeline, ...runtimeTimeline]).slice(0, 24);

  return {
    commessa: source.commessa,
    actors,
    issues,
    timeline,
    operational,
    sourceTable: source.candidate.table,
    warnings,
    emptyStateHint: null,
    error: null,
  };
};

export const getTenantCommesseCatalog = async (
  tenantId: string,
  filters: CommessaCatalogFilters,
): Promise<CommessaCatalogResult> => {
  if (!tenantId) {
    return {
      commesse: [],
      statuses: [],
      priorities: [],
      sourceTable: null,
      warnings: [],
      emptyStateHint: null,
      error: "Tenant non valido.",
    };
  }

  try {
    return await buildCatalogFromCandidate(tenantId, filters);
  } catch (caughtError) {
    return {
      commesse: [],
      statuses: [],
      priorities: [],
      sourceTable: null,
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

export const getTenantCommessaOverviewById = async (
  tenantId: string,
  commessaId: string,
): Promise<CommessaOverviewResult> => {
  if (!tenantId || !commessaId) {
    return {
      commessa: null,
      actors: [],
      issues: [],
      timeline: [],
      operational: null,
      sourceTable: null,
      warnings: [],
      emptyStateHint: null,
      error: "Parametri non validi.",
    };
  }

  try {
    return await buildOverviewFromCandidate(tenantId, commessaId);
  } catch (caughtError) {
    return {
      commessa: null,
      actors: [],
      issues: [],
      timeline: [],
      operational: null,
      sourceTable: null,
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

export const getTenantCommessaById = async (tenantId: string, commessaId: string) => {
  const overview = await getTenantCommessaOverviewById(tenantId, commessaId);
  return {
    commessa: overview.commessa,
    sourceTable: overview.sourceTable,
    warnings: overview.warnings,
    error: overview.error,
    emptyStateHint: overview.emptyStateHint,
  };
};
