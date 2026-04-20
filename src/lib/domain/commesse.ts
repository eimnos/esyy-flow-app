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
  progressives: CommessaProgressiveSnapshot;
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

const buildCatalogFromCandidate = async (
  tenantId: string,
  filters: CommessaCatalogFilters,
): Promise<CommessaCatalogResult> => {
  const warnings: string[] = [];
  const availableCandidates: Array<{ candidate: CommesseTableCandidate; rows: RawRow[] }> = [];

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

  availableCandidates.sort((left, right) => right.rows.length - left.rows.length);
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

export const getTenantCommessaById = async (tenantId: string, commessaId: string) => {
  if (!tenantId || !commessaId) {
    return {
      commessa: null as CommessaListItem | null,
      sourceTable: null as string | null,
      warnings: [] as string[],
      error: "Parametri non validi.",
      emptyStateHint: null as string | null,
    };
  }

  const catalog = await getTenantCommesseCatalog(tenantId, {});
  return {
    commessa: catalog.commesse.find((item) => item.id === commessaId) ?? null,
    sourceTable: catalog.sourceTable,
    warnings: catalog.warnings,
    error: catalog.error,
    emptyStateHint: catalog.emptyStateHint,
  };
};
