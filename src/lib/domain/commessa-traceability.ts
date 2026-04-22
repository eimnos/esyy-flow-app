import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type CommessaTraceabilityAnomalyFilter = "all" | "with" | "without";

export type CommessaTraceabilityFilters = {
  q?: string;
  anomaly?: string;
};

export type CommessaTraceabilityTimelineItem = {
  id: string;
  tenantId: string;
  commessaId: string;
  occurredAt: string | null;
  eventType: string;
  lotCode: string | null;
  semiFinishedCode: string | null;
  phaseCode: string | null;
  isExternalPhase: boolean | null;
  status: string;
  hasAnomaly: boolean;
  anomalyLabel: string | null;
  sourceDocument: string | null;
  note: string | null;
  sourceTable: string;
};

export type CommessaTraceabilityGenealogyItem = {
  id: string;
  tenantId: string;
  commessaId: string;
  parentLotCode: string | null;
  childLotCode: string | null;
  semiFinishedCode: string | null;
  phaseCode: string | null;
  isExternalPhase: boolean | null;
  qty: number | null;
  unit: string | null;
  status: string;
  hasAnomaly: boolean;
  anomalyLabel: string | null;
  note: string | null;
  sourceDocument: string | null;
  sourceTable: string;
};

export type CommessaTraceabilitySummary = {
  timelineEventsTotal: number;
  genealogyLinksTotal: number;
  lotsTotal: number;
  semiFinishedTotal: number;
  externalPhasesTotal: number;
  openAnomalies: number;
  statusLabel: string;
  lastEventAt: string | null;
};

export type CommessaTraceabilityResult = {
  timeline: CommessaTraceabilityTimelineItem[];
  genealogy: CommessaTraceabilityGenealogyItem[];
  summary: CommessaTraceabilitySummary;
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

type RawRow = Record<string, unknown>;

type QueryRowsResult = {
  exists: boolean;
  rows: RawRow[];
  warning: string | null;
};

type TimelineCandidate = {
  table: string;
  tenantColumns: string[];
  parentColumns: string[];
  idColumns: string[];
  occurredAtColumns: string[];
  eventTypeColumns: string[];
  lotColumns: string[];
  semiFinishedColumns: string[];
  phaseColumns: string[];
  externalColumns: string[];
  statusColumns: string[];
  anomalyColumns: string[];
  anomalyLabelColumns: string[];
  documentColumns: string[];
  noteColumns: string[];
};

type GenealogyCandidate = {
  table: string;
  tenantColumns: string[];
  parentColumns: string[];
  idColumns: string[];
  parentLotColumns: string[];
  childLotColumns: string[];
  semiFinishedColumns: string[];
  phaseColumns: string[];
  externalColumns: string[];
  qtyColumns: string[];
  unitColumns: string[];
  statusColumns: string[];
  anomalyColumns: string[];
  anomalyLabelColumns: string[];
  documentColumns: string[];
  noteColumns: string[];
};

const SAFE_LIST_LIMIT = 1800;

const TIMELINE_CANDIDATES: TimelineCandidate[] = [
  {
    table: "project_traceability_events",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    idColumns: ["id", "traceability_event_id", "event_id"],
    occurredAtColumns: ["event_at", "occurred_at", "created_at", "event_date"],
    eventTypeColumns: ["event_type", "type", "event_name", "action"],
    lotColumns: ["lot_code", "lot_no", "batch_code", "batch_no"],
    semiFinishedColumns: ["semi_finished_code", "semi_code", "wip_code", "item_code"],
    phaseColumns: ["phase_code", "operation_code", "step_code", "routing_step_code"],
    externalColumns: ["is_external_phase", "is_external", "is_outsourced"],
    statusColumns: ["status", "state", "workflow_status"],
    anomalyColumns: ["has_anomaly", "is_anomaly", "has_issue", "is_non_conformity"],
    anomalyLabelColumns: ["anomaly_label", "issue_label", "non_conformity_code", "alert_code"],
    documentColumns: ["document_no", "reference_no", "source_document_no", "doc_no"],
    noteColumns: ["note", "notes", "description", "detail"],
  },
  {
    table: "traceability_events",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    idColumns: ["id", "traceability_event_id", "event_id"],
    occurredAtColumns: ["event_at", "occurred_at", "created_at", "event_date"],
    eventTypeColumns: ["event_type", "type", "event_name", "action"],
    lotColumns: ["lot_code", "lot_no", "batch_code", "batch_no"],
    semiFinishedColumns: ["semi_finished_code", "semi_code", "wip_code", "item_code"],
    phaseColumns: ["phase_code", "operation_code", "step_code", "routing_step_code"],
    externalColumns: ["is_external_phase", "is_external", "is_outsourced"],
    statusColumns: ["status", "state", "workflow_status"],
    anomalyColumns: ["has_anomaly", "is_anomaly", "has_issue", "is_non_conformity"],
    anomalyLabelColumns: ["anomaly_label", "issue_label", "non_conformity_code", "alert_code"],
    documentColumns: ["document_no", "reference_no", "source_document_no", "doc_no"],
    noteColumns: ["note", "notes", "description", "detail"],
  },
  {
    table: "lot_events",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    idColumns: ["id", "lot_event_id", "event_id"],
    occurredAtColumns: ["event_at", "occurred_at", "created_at", "event_date"],
    eventTypeColumns: ["event_type", "type", "event_name", "action"],
    lotColumns: ["lot_code", "lot_no", "batch_code", "batch_no"],
    semiFinishedColumns: ["semi_finished_code", "semi_code", "wip_code", "item_code"],
    phaseColumns: ["phase_code", "operation_code", "step_code", "routing_step_code"],
    externalColumns: ["is_external_phase", "is_external", "is_outsourced"],
    statusColumns: ["status", "state", "workflow_status"],
    anomalyColumns: ["has_anomaly", "is_anomaly", "has_issue", "is_non_conformity"],
    anomalyLabelColumns: ["anomaly_label", "issue_label", "non_conformity_code", "alert_code"],
    documentColumns: ["document_no", "reference_no", "source_document_no", "doc_no"],
    noteColumns: ["note", "notes", "description", "detail"],
  },
  {
    table: "project_events",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id", "id"],
    idColumns: ["id", "project_event_id", "event_id"],
    occurredAtColumns: ["event_at", "occurred_at", "created_at", "event_date"],
    eventTypeColumns: ["event_type", "type", "event_name", "title"],
    lotColumns: ["lot_code", "lot_no", "batch_code", "batch_no"],
    semiFinishedColumns: ["semi_finished_code", "semi_code", "wip_code", "item_code"],
    phaseColumns: ["phase_code", "operation_code", "step_code", "routing_step_code"],
    externalColumns: ["is_external_phase", "is_external", "is_outsourced"],
    statusColumns: ["status", "state", "severity"],
    anomalyColumns: ["has_anomaly", "is_anomaly", "has_issue", "is_non_conformity"],
    anomalyLabelColumns: ["anomaly_label", "issue_label", "non_conformity_code", "severity"],
    documentColumns: ["document_no", "reference_no", "source_document_no", "doc_no"],
    noteColumns: ["note", "notes", "description", "detail"],
  },
];

const GENEALOGY_CANDIDATES: GenealogyCandidate[] = [
  {
    table: "project_traceability_links",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    idColumns: ["id", "traceability_link_id", "link_id"],
    parentLotColumns: ["parent_lot_code", "from_lot_code", "input_lot_code", "source_lot_code"],
    childLotColumns: ["child_lot_code", "to_lot_code", "output_lot_code", "target_lot_code"],
    semiFinishedColumns: ["semi_finished_code", "semi_code", "wip_code", "item_code"],
    phaseColumns: ["phase_code", "operation_code", "step_code", "routing_step_code"],
    externalColumns: ["is_external_phase", "is_external", "is_outsourced"],
    qtyColumns: ["qty", "quantity", "processed_qty", "linked_qty"],
    unitColumns: ["uom", "unit", "um", "measure_unit"],
    statusColumns: ["status", "state", "workflow_status"],
    anomalyColumns: ["has_anomaly", "is_anomaly", "has_issue", "is_non_conformity"],
    anomalyLabelColumns: ["anomaly_label", "issue_label", "non_conformity_code", "alert_code"],
    documentColumns: ["document_no", "reference_no", "source_document_no", "doc_no"],
    noteColumns: ["note", "notes", "description", "detail"],
  },
  {
    table: "traceability_links",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    idColumns: ["id", "traceability_link_id", "link_id"],
    parentLotColumns: ["parent_lot_code", "from_lot_code", "input_lot_code", "source_lot_code"],
    childLotColumns: ["child_lot_code", "to_lot_code", "output_lot_code", "target_lot_code"],
    semiFinishedColumns: ["semi_finished_code", "semi_code", "wip_code", "item_code"],
    phaseColumns: ["phase_code", "operation_code", "step_code", "routing_step_code"],
    externalColumns: ["is_external_phase", "is_external", "is_outsourced"],
    qtyColumns: ["qty", "quantity", "processed_qty", "linked_qty"],
    unitColumns: ["uom", "unit", "um", "measure_unit"],
    statusColumns: ["status", "state", "workflow_status"],
    anomalyColumns: ["has_anomaly", "is_anomaly", "has_issue", "is_non_conformity"],
    anomalyLabelColumns: ["anomaly_label", "issue_label", "non_conformity_code", "alert_code"],
    documentColumns: ["document_no", "reference_no", "source_document_no", "doc_no"],
    noteColumns: ["note", "notes", "description", "detail"],
  },
  {
    table: "lot_genealogy",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    idColumns: ["id", "lot_genealogy_id", "link_id"],
    parentLotColumns: ["parent_lot_code", "from_lot_code", "input_lot_code", "source_lot_code"],
    childLotColumns: ["child_lot_code", "to_lot_code", "output_lot_code", "target_lot_code"],
    semiFinishedColumns: ["semi_finished_code", "semi_code", "wip_code", "item_code"],
    phaseColumns: ["phase_code", "operation_code", "step_code", "routing_step_code"],
    externalColumns: ["is_external_phase", "is_external", "is_outsourced"],
    qtyColumns: ["qty", "quantity", "processed_qty", "linked_qty"],
    unitColumns: ["uom", "unit", "um", "measure_unit"],
    statusColumns: ["status", "state", "workflow_status"],
    anomalyColumns: ["has_anomaly", "is_anomaly", "has_issue", "is_non_conformity"],
    anomalyLabelColumns: ["anomaly_label", "issue_label", "non_conformity_code", "alert_code"],
    documentColumns: ["document_no", "reference_no", "source_document_no", "doc_no"],
    noteColumns: ["note", "notes", "description", "detail"],
  },
  {
    table: "production_lot_links",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    idColumns: ["id", "production_lot_link_id", "link_id"],
    parentLotColumns: ["parent_lot_code", "from_lot_code", "input_lot_code", "source_lot_code"],
    childLotColumns: ["child_lot_code", "to_lot_code", "output_lot_code", "target_lot_code"],
    semiFinishedColumns: ["semi_finished_code", "semi_code", "wip_code", "item_code"],
    phaseColumns: ["phase_code", "operation_code", "step_code", "routing_step_code"],
    externalColumns: ["is_external_phase", "is_external", "is_outsourced"],
    qtyColumns: ["qty", "quantity", "processed_qty", "linked_qty"],
    unitColumns: ["uom", "unit", "um", "measure_unit"],
    statusColumns: ["status", "state", "workflow_status"],
    anomalyColumns: ["has_anomaly", "is_anomaly", "has_issue", "is_non_conformity"],
    anomalyLabelColumns: ["anomaly_label", "issue_label", "non_conformity_code", "alert_code"],
    documentColumns: ["document_no", "reference_no", "source_document_no", "doc_no"],
    noteColumns: ["note", "notes", "description", "detail"],
  },
];

const EMPTY_SUMMARY: CommessaTraceabilitySummary = {
  timelineEventsTotal: 0,
  genealogyLinksTotal: 0,
  lotsTotal: 0,
  semiFinishedTotal: 0,
  externalPhasesTotal: 0,
  openAnomalies: 0,
  statusLabel: "N/D",
  lastEventAt: null,
};

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
    const normalized = value.replace(/\s+/g, "").replace(",", ".");
    const parsed = Number(normalized);
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
    if (["true", "1", "yes", "y", "si", "on", "enabled", "active"].includes(normalized)) {
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
    const parsed = parseString(row[key]);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return "";
};

const readNumberFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const parsed = parseNumber(row[key]);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

const readBooleanFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const parsed = parseBoolean(row[key]);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

const readDateTextFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const parsed = toDateText(row[key]);
    if (parsed) {
      return parsed;
    }
  }
  return null;
};

const normalizeExternalFlag = (explicit: boolean | null, context: string[]) => {
  if (explicit !== null) {
    return explicit;
  }

  const text = context.join(" ").toLowerCase();
  if (
    text.includes("external") ||
    text.includes("estern") ||
    text.includes("outsour") ||
    text.includes("terz") ||
    text.includes("conto_lavoro")
  ) {
    return true;
  }
  if (text.includes("internal") || text.includes("intern")) {
    return false;
  }
  return null;
};

const normalizeAnomalyFlag = (
  explicit: boolean | null,
  contextValues: string[],
  anomalyLabel: string,
) => {
  if (explicit !== null) {
    return explicit;
  }

  const text = `${contextValues.join(" ")} ${anomalyLabel}`.toLowerCase();
  if (
    text.includes("anomaly") ||
    text.includes("anomalia") ||
    text.includes("issue") ||
    text.includes("non_conform") ||
    text.includes("nc") ||
    text.includes("critical")
  ) {
    return true;
  }
  return false;
};

const normalizeAnomalyLabel = (value: string, hasAnomaly: boolean) => {
  if (!hasAnomaly) {
    return null;
  }
  if (!value.trim()) {
    return "Anomalia tracciabilita";
  }
  return value;
};

const normalizeAnomalyFilter = (value: string | undefined): CommessaTraceabilityAnomalyFilter => {
  if (value === "with" || value === "without") {
    return value;
  }
  return "all";
};

const queryCandidateRows = async (
  candidate: { table: string; tenantColumns: string[]; parentColumns: string[] },
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
        return { exists: true, rows: (data ?? []) as RawRow[], warning: null };
      }

      const message = error.message ?? "Unknown query error";
      if (
        looksLikeMissingTable(message) ||
        looksLikeMissingColumn(message, parentColumn) ||
        looksLikeMissingColumn(message, tenantColumn)
      ) {
        continue;
      }

      return { exists: true, rows: [], warning: `Errore su ${candidate.table}: ${message}` };
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
      return { exists: true, rows: scopedRows, warning: null };
    }

    const message = error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, parentColumn)) {
      continue;
    }
    return { exists: true, rows: [], warning: `Errore su ${candidate.table}: ${message}` };
  }

  const fallback = await admin.from(candidate.table).select("*").limit(limit);
  if (fallback.error) {
    const message = fallback.error.message ?? "Unknown query error";
    if (looksLikeMissingTable(message)) {
      return { exists: false, rows: [], warning: null };
    }
    return { exists: true, rows: [], warning: `Errore su ${candidate.table}: ${message}` };
  }

  const scopedRows = ((fallback.data ?? []) as RawRow[]).filter((row) => {
    const rowTenant = readStringFromKeys(row, candidate.tenantColumns);
    const rowParent = readStringFromKeys(row, candidate.parentColumns);
    return rowTenant === tenantId && rowParent === commessaId;
  });
  return { exists: true, rows: scopedRows, warning: null };
};

const normalizeTimelineRow = (
  row: RawRow,
  candidate: TimelineCandidate,
  tenantId: string,
  commessaId: string,
  index: number,
): CommessaTraceabilityTimelineItem | null => {
  const id = readStringFromKeys(row, candidate.idColumns) || `${candidate.table}-${commessaId}-${index + 1}`;
  const lotCode = readStringFromKeys(row, candidate.lotColumns) || null;
  const semiFinishedCode = readStringFromKeys(row, candidate.semiFinishedColumns) || null;
  const phaseCode = readStringFromKeys(row, candidate.phaseColumns) || null;
  const status = readStringFromKeys(row, candidate.statusColumns) || "N/D";
  const eventType = readStringFromKeys(row, candidate.eventTypeColumns) || "Evento tracciabilita";
  const note = readStringFromKeys(row, candidate.noteColumns) || null;
  const sourceDocument = readStringFromKeys(row, candidate.documentColumns) || null;
  const explicitExternal = readBooleanFromKeys(row, candidate.externalColumns);
  const isExternalPhase = normalizeExternalFlag(explicitExternal, [eventType, status, phaseCode ?? ""]);
  const anomalyLabelRaw = readStringFromKeys(row, candidate.anomalyLabelColumns);
  const explicitAnomaly = readBooleanFromKeys(row, candidate.anomalyColumns);
  const hasAnomaly = normalizeAnomalyFlag(explicitAnomaly, [status, note ?? "", eventType], anomalyLabelRaw);
  const anomalyLabel = normalizeAnomalyLabel(anomalyLabelRaw, hasAnomaly);

  const hasMinimumEvidence =
    Boolean(lotCode) ||
    Boolean(semiFinishedCode) ||
    Boolean(phaseCode) ||
    Boolean(note) ||
    Boolean(sourceDocument) ||
    Boolean(eventType);

  if (!hasMinimumEvidence) {
    return null;
  }

  return {
    id,
    tenantId: readStringFromKeys(row, candidate.tenantColumns) || tenantId,
    commessaId,
    occurredAt: readDateTextFromKeys(row, candidate.occurredAtColumns),
    eventType,
    lotCode,
    semiFinishedCode,
    phaseCode,
    isExternalPhase,
    status,
    hasAnomaly,
    anomalyLabel,
    sourceDocument,
    note,
    sourceTable: candidate.table,
  };
};

const normalizeGenealogyRow = (
  row: RawRow,
  candidate: GenealogyCandidate,
  tenantId: string,
  commessaId: string,
  index: number,
): CommessaTraceabilityGenealogyItem | null => {
  const id = readStringFromKeys(row, candidate.idColumns) || `${candidate.table}-${commessaId}-${index + 1}`;
  const parentLotCode = readStringFromKeys(row, candidate.parentLotColumns) || null;
  const childLotCode = readStringFromKeys(row, candidate.childLotColumns) || null;
  const semiFinishedCode = readStringFromKeys(row, candidate.semiFinishedColumns) || null;
  const phaseCode = readStringFromKeys(row, candidate.phaseColumns) || null;
  const status = readStringFromKeys(row, candidate.statusColumns) || "N/D";
  const note = readStringFromKeys(row, candidate.noteColumns) || null;
  const sourceDocument = readStringFromKeys(row, candidate.documentColumns) || null;
  const qty = readNumberFromKeys(row, candidate.qtyColumns);
  const unit = readStringFromKeys(row, candidate.unitColumns) || null;
  const explicitExternal = readBooleanFromKeys(row, candidate.externalColumns);
  const isExternalPhase = normalizeExternalFlag(explicitExternal, [status, phaseCode ?? ""]);
  const anomalyLabelRaw = readStringFromKeys(row, candidate.anomalyLabelColumns);
  const explicitAnomaly = readBooleanFromKeys(row, candidate.anomalyColumns);
  const hasAnomaly = normalizeAnomalyFlag(explicitAnomaly, [status, note ?? ""], anomalyLabelRaw);
  const anomalyLabel = normalizeAnomalyLabel(anomalyLabelRaw, hasAnomaly);

  const hasMinimumEvidence =
    Boolean(parentLotCode) ||
    Boolean(childLotCode) ||
    Boolean(semiFinishedCode) ||
    Boolean(phaseCode) ||
    qty !== null ||
    Boolean(note);
  if (!hasMinimumEvidence) {
    return null;
  }

  return {
    id,
    tenantId: readStringFromKeys(row, candidate.tenantColumns) || tenantId,
    commessaId,
    parentLotCode,
    childLotCode,
    semiFinishedCode,
    phaseCode,
    isExternalPhase,
    qty,
    unit,
    status,
    hasAnomaly,
    anomalyLabel,
    note,
    sourceDocument,
    sourceTable: candidate.table,
  };
};

const applyTimelineFilters = (
  items: CommessaTraceabilityTimelineItem[],
  filters: CommessaTraceabilityFilters,
) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const anomalyFilter = normalizeAnomalyFilter(filters.anomaly);

  return items.filter((item) => {
    if (query) {
      const haystack = [
        item.eventType,
        item.lotCode ?? "",
        item.semiFinishedCode ?? "",
        item.phaseCode ?? "",
        item.status,
        item.note ?? "",
        item.sourceDocument ?? "",
        item.anomalyLabel ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (anomalyFilter === "with" && !item.hasAnomaly) {
      return false;
    }
    if (anomalyFilter === "without" && item.hasAnomaly) {
      return false;
    }

    return true;
  });
};

const applyGenealogyFilters = (
  items: CommessaTraceabilityGenealogyItem[],
  filters: CommessaTraceabilityFilters,
) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const anomalyFilter = normalizeAnomalyFilter(filters.anomaly);

  return items.filter((item) => {
    if (query) {
      const haystack = [
        item.parentLotCode ?? "",
        item.childLotCode ?? "",
        item.semiFinishedCode ?? "",
        item.phaseCode ?? "",
        item.status,
        item.note ?? "",
        item.sourceDocument ?? "",
        item.anomalyLabel ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (anomalyFilter === "with" && !item.hasAnomaly) {
      return false;
    }
    if (anomalyFilter === "without" && item.hasAnomaly) {
      return false;
    }

    return true;
  });
};

const safeDateOrder = (value: string | null) => {
  if (!value) {
    return 0;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }
  return parsed.getTime();
};

const sortTimeline = (items: CommessaTraceabilityTimelineItem[]) =>
  [...items].sort((left, right) => {
    const byDate = safeDateOrder(right.occurredAt) - safeDateOrder(left.occurredAt);
    if (byDate !== 0) {
      return byDate;
    }
    if (left.hasAnomaly !== right.hasAnomaly) {
      return left.hasAnomaly ? -1 : 1;
    }
    return left.id.localeCompare(right.id, "it");
  });

const sortGenealogy = (items: CommessaTraceabilityGenealogyItem[]) =>
  [...items].sort((left, right) => {
    if (left.hasAnomaly !== right.hasAnomaly) {
      return left.hasAnomaly ? -1 : 1;
    }

    const leftPrimary = left.parentLotCode ?? left.childLotCode ?? left.semiFinishedCode ?? "";
    const rightPrimary = right.parentLotCode ?? right.childLotCode ?? right.semiFinishedCode ?? "";
    const byPrimary = leftPrimary.localeCompare(rightPrimary, "it");
    if (byPrimary !== 0) {
      return byPrimary;
    }

    return left.id.localeCompare(right.id, "it");
  });

const dedupeTimeline = (items: CommessaTraceabilityTimelineItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.sourceTable}:${item.id}:${item.occurredAt ?? "nd"}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const dedupeGenealogy = (items: CommessaTraceabilityGenealogyItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.sourceTable}:${item.id}:${item.parentLotCode ?? "nd"}:${item.childLotCode ?? "nd"}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const buildSummary = (
  timeline: CommessaTraceabilityTimelineItem[],
  genealogy: CommessaTraceabilityGenealogyItem[],
): CommessaTraceabilitySummary => {
  const lots = new Set<string>();
  const semiFinished = new Set<string>();
  const allExternalFlags: Array<boolean | null> = [];
  const allAnomalies = [
    ...timeline.map((item) => item.hasAnomaly),
    ...genealogy.map((item) => item.hasAnomaly),
  ];

  for (const row of timeline) {
    if (row.lotCode) {
      lots.add(row.lotCode);
    }
    if (row.semiFinishedCode) {
      semiFinished.add(row.semiFinishedCode);
    }
    allExternalFlags.push(row.isExternalPhase);
  }

  for (const row of genealogy) {
    if (row.parentLotCode) {
      lots.add(row.parentLotCode);
    }
    if (row.childLotCode) {
      lots.add(row.childLotCode);
    }
    if (row.semiFinishedCode) {
      semiFinished.add(row.semiFinishedCode);
    }
    allExternalFlags.push(row.isExternalPhase);
  }

  const externalPhasesTotal = allExternalFlags.filter((value) => value === true).length;
  const openAnomalies = allAnomalies.filter((value) => value).length;
  const lastEventAt = [...timeline]
    .sort((left, right) => safeDateOrder(right.occurredAt) - safeDateOrder(left.occurredAt))[0]?.occurredAt ?? null;

  let statusLabel = "N/D";
  if (openAnomalies > 0) {
    statusLabel = "Con anomalie aperte";
  } else if (timeline.length > 0 || genealogy.length > 0) {
    statusLabel = "Monitorata";
  }

  return {
    timelineEventsTotal: timeline.length,
    genealogyLinksTotal: genealogy.length,
    lotsTotal: lots.size,
    semiFinishedTotal: semiFinished.size,
    externalPhasesTotal,
    openAnomalies,
    statusLabel,
    lastEventAt,
  };
};

const buildTraceability = async (
  tenantId: string,
  commessaId: string,
  filters: CommessaTraceabilityFilters,
): Promise<CommessaTraceabilityResult> => {
  const warnings: string[] = [];
  const sourceTables = new Set<string>();
  const timelineRows: CommessaTraceabilityTimelineItem[] = [];
  const genealogyRows: CommessaTraceabilityGenealogyItem[] = [];

  for (const candidate of TIMELINE_CANDIDATES) {
    const result = await queryCandidateRows(candidate, tenantId, commessaId, SAFE_LIST_LIMIT);
    if (result.warning) {
      warnings.push(result.warning);
    }
    if (!result.exists) {
      continue;
    }

    sourceTables.add(candidate.table);
    result.rows.forEach((row, index) => {
      const normalized = normalizeTimelineRow(row, candidate, tenantId, commessaId, index);
      if (normalized) {
        timelineRows.push(normalized);
      }
    });
  }

  for (const candidate of GENEALOGY_CANDIDATES) {
    const result = await queryCandidateRows(candidate, tenantId, commessaId, SAFE_LIST_LIMIT);
    if (result.warning) {
      warnings.push(result.warning);
    }
    if (!result.exists) {
      continue;
    }

    sourceTables.add(candidate.table);
    result.rows.forEach((row, index) => {
      const normalized = normalizeGenealogyRow(row, candidate, tenantId, commessaId, index);
      if (normalized) {
        genealogyRows.push(normalized);
      }
    });
  }

  const timeline = applyTimelineFilters(sortTimeline(dedupeTimeline(timelineRows)), filters);
  const genealogy = applyGenealogyFilters(sortGenealogy(dedupeGenealogy(genealogyRows)), filters);
  const summary = buildSummary(timeline, genealogy);

  let emptyStateHint: string | null = null;
  if (sourceTables.size === 0) {
    emptyStateHint =
      "Nessuna sorgente tracciabilita disponibile nel DB esposto per la commessa selezionata.";
  } else if (timelineRows.length === 0 && genealogyRows.length === 0) {
    emptyStateHint =
      "Nessun dato di tracciabilita disponibile per la commessa nel tenant selezionato.";
  } else if (timeline.length === 0 && genealogy.length === 0) {
    emptyStateHint = "Nessun elemento di tracciabilita trovato con i filtri correnti.";
  }

  return {
    timeline,
    genealogy,
    summary,
    sourceTables: [...sourceTables].sort((left, right) => left.localeCompare(right, "it")),
    warnings,
    emptyStateHint,
    error: null,
  };
};

export const getTenantCommessaTraceability = async (
  tenantId: string,
  commessaId: string,
  filters: CommessaTraceabilityFilters,
): Promise<CommessaTraceabilityResult> => {
  if (!tenantId || !commessaId) {
    return {
      timeline: [],
      genealogy: [],
      summary: EMPTY_SUMMARY,
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Parametri non validi.",
    };
  }

  try {
    return await buildTraceability(tenantId, commessaId, filters);
  } catch (caughtError) {
    return {
      timeline: [],
      genealogy: [],
      summary: EMPTY_SUMMARY,
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};
