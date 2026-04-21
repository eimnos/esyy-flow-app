import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type SubcontractingDirection = "passivo" | "attivo" | "nd";
export type SubcontractingMovementType = "invio" | "rientro" | "movimento" | "nd";

export type CommessaSubcontractingFilters = {
  q?: string;
  direction?: string;
  anomaly?: string;
  status?: string;
};

export type CommessaSubcontractingPhaseItem = {
  id: string;
  tenantId: string;
  commessaId: string;
  orderCode: string | null;
  phaseCode: string;
  phaseName: string;
  status: string;
  direction: SubcontractingDirection;
  qtySent: number | null;
  qtyReturned: number | null;
  qtyResidual: number | null;
  materialsAtSupplier: number | null;
  isDelayed: boolean;
  delayDays: number | null;
  hasAnomaly: boolean;
  anomalyCount: number | null;
  dueDate: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  sourceTable: string;
};

export type CommessaSubcontractingMovementItem = {
  id: string;
  tenantId: string;
  commessaId: string;
  movementType: SubcontractingMovementType;
  documentCode: string | null;
  movementDate: string | null;
  status: string;
  direction: SubcontractingDirection;
  materialCode: string;
  materialName: string;
  qtySent: number | null;
  qtyReturned: number | null;
  qtyResidual: number | null;
  materialsAtSupplier: number | null;
  hasAnomaly: boolean;
  anomalyCount: number | null;
  orderCode: string | null;
  phaseCode: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  note: string | null;
  sourceTable: string;
};

export type CommessaSubcontractingSummary = {
  phasesTotal: number;
  movementsTotal: number;
  passiveItems: number;
  activeItems: number;
  unknownDirectionItems: number;
  delayedPhases: number;
  anomalousItems: number;
  qtySentTotal: number | null;
  qtyReturnedTotal: number | null;
  qtyResidualTotal: number | null;
  materialsAtSupplierTotal: number | null;
};

export type CommessaSubcontractingResult = {
  phases: CommessaSubcontractingPhaseItem[];
  movements: CommessaSubcontractingMovementItem[];
  statuses: string[];
  summary: CommessaSubcontractingSummary;
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

type RawRow = Record<string, unknown>;

type BaseCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  parentColumns: string[];
  statusColumns: string[];
  directionColumns: string[];
  externalColumns: string[];
  internalColumns: string[];
  supplierCodeColumns: string[];
  supplierNameColumns: string[];
  anomalyColumns: string[];
  anomalyCountColumns: string[];
  noteColumns: string[];
};

type PhaseTableCandidate = BaseCandidate & {
  orderCodeColumns: string[];
  phaseCodeColumns: string[];
  phaseNameColumns: string[];
  sentQtyColumns: string[];
  returnedQtyColumns: string[];
  residualQtyColumns: string[];
  materialsAtSupplierColumns: string[];
  delayColumns: string[];
  dueDateColumns: string[];
};

type MovementTableCandidate = BaseCandidate & {
  movementTypeColumns: string[];
  documentCodeColumns: string[];
  movementDateColumns: string[];
  materialCodeColumns: string[];
  materialNameColumns: string[];
  qtyColumns: string[];
  sentQtyColumns: string[];
  returnedQtyColumns: string[];
  residualQtyColumns: string[];
  materialsAtSupplierColumns: string[];
  orderCodeColumns: string[];
  phaseCodeColumns: string[];
};

type QueryRowsResult = {
  exists: boolean;
  rows: RawRow[];
  warning: string | null;
};

const SAFE_LIST_LIMIT = 1600;

const PHASE_TABLE_CANDIDATES: PhaseTableCandidate[] = [
  {
    table: "subcontracting_phases",
    idColumns: ["id", "subcontracting_phase_id", "phase_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    directionColumns: ["flow_type", "direction", "subcontracting_type", "passive_active_type"],
    externalColumns: ["is_external", "is_outsourced", "external_phase"],
    internalColumns: ["is_internal", "in_house"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    anomalyColumns: ["has_anomaly", "is_anomalous", "is_blocked", "has_blocking_issue"],
    anomalyCountColumns: ["anomaly_count", "open_issue_count", "criticality_count", "blocker_count"],
    noteColumns: ["note", "notes", "description", "remark"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "order_code"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code", "code"],
    phaseNameColumns: ["phase_name", "step_name", "operation_name", "name", "description"],
    sentQtyColumns: ["qty_sent", "sent_qty", "outsourced_qty", "delivered_qty", "inviata_qty"],
    returnedQtyColumns: ["qty_returned", "returned_qty", "received_qty", "rientrata_qty"],
    residualQtyColumns: ["qty_residual", "residual_qty", "open_qty", "remaining_qty"],
    materialsAtSupplierColumns: [
      "materials_at_subcontractor_qty",
      "at_subcontractor_qty",
      "third_party_stock_qty",
      "qty_at_supplier",
    ],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "planned_end_date", "target_date"],
  },
  {
    table: "production_order_subcontracting_phases",
    idColumns: ["id", "production_order_subcontracting_phase_id", "phase_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    directionColumns: ["flow_type", "direction", "subcontracting_type", "passive_active_type"],
    externalColumns: ["is_external", "is_outsourced", "external_phase"],
    internalColumns: ["is_internal", "in_house"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    anomalyColumns: ["has_anomaly", "is_anomalous", "is_blocked", "has_blocking_issue"],
    anomalyCountColumns: ["anomaly_count", "open_issue_count", "criticality_count", "blocker_count"],
    noteColumns: ["note", "notes", "description", "remark"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "order_code"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code", "code"],
    phaseNameColumns: ["phase_name", "step_name", "operation_name", "name", "description"],
    sentQtyColumns: ["qty_sent", "sent_qty", "outsourced_qty", "delivered_qty", "inviata_qty"],
    returnedQtyColumns: ["qty_returned", "returned_qty", "received_qty", "rientrata_qty"],
    residualQtyColumns: ["qty_residual", "residual_qty", "open_qty", "remaining_qty"],
    materialsAtSupplierColumns: [
      "materials_at_subcontractor_qty",
      "at_subcontractor_qty",
      "third_party_stock_qty",
      "qty_at_supplier",
    ],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "planned_end_date", "target_date"],
  },
  {
    table: "external_phase_instances",
    idColumns: ["id", "external_phase_instance_id", "phase_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    directionColumns: ["flow_type", "direction", "subcontracting_type", "passive_active_type"],
    externalColumns: ["is_external", "is_outsourced", "external_phase"],
    internalColumns: ["is_internal", "in_house"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    anomalyColumns: ["has_anomaly", "is_anomalous", "is_blocked", "has_blocking_issue"],
    anomalyCountColumns: ["anomaly_count", "open_issue_count", "criticality_count", "blocker_count"],
    noteColumns: ["note", "notes", "description", "remark"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "order_code"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code", "code"],
    phaseNameColumns: ["phase_name", "step_name", "operation_name", "name", "description"],
    sentQtyColumns: ["qty_sent", "sent_qty", "outsourced_qty", "delivered_qty", "inviata_qty"],
    returnedQtyColumns: ["qty_returned", "returned_qty", "received_qty", "rientrata_qty"],
    residualQtyColumns: ["qty_residual", "residual_qty", "open_qty", "remaining_qty"],
    materialsAtSupplierColumns: [
      "materials_at_subcontractor_qty",
      "at_subcontractor_qty",
      "third_party_stock_qty",
      "qty_at_supplier",
    ],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "planned_end_date", "target_date"],
  },
  {
    table: "production_order_phases",
    idColumns: ["id", "production_order_phase_id", "phase_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    directionColumns: ["flow_type", "direction", "subcontracting_type", "passive_active_type"],
    externalColumns: ["is_external", "is_outsourced", "external_phase", "phase_type", "execution_type"],
    internalColumns: ["is_internal", "in_house"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    anomalyColumns: ["has_anomaly", "is_anomalous", "is_blocked", "has_blocking_issue"],
    anomalyCountColumns: ["anomaly_count", "open_issue_count", "criticality_count", "blocker_count"],
    noteColumns: ["note", "notes", "description", "remark"],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "order_code", "document_no"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code", "code"],
    phaseNameColumns: ["phase_name", "step_name", "operation_name", "name", "description"],
    sentQtyColumns: ["qty_sent", "sent_qty", "outsourced_qty", "delivered_qty", "inviata_qty"],
    returnedQtyColumns: ["qty_returned", "returned_qty", "received_qty", "rientrata_qty"],
    residualQtyColumns: ["qty_residual", "residual_qty", "open_qty", "remaining_qty"],
    materialsAtSupplierColumns: [
      "materials_at_subcontractor_qty",
      "at_subcontractor_qty",
      "third_party_stock_qty",
      "qty_at_supplier",
    ],
    delayColumns: ["delay_days", "days_late", "lateness_days"],
    dueDateColumns: ["due_date", "planned_end_date", "target_date"],
  },
];

const MOVEMENT_TABLE_CANDIDATES: MovementTableCandidate[] = [
  {
    table: "subcontracting_movements",
    idColumns: ["id", "subcontracting_movement_id", "movement_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    directionColumns: ["flow_type", "direction", "subcontracting_type", "passive_active_type"],
    externalColumns: ["is_external", "is_outsourced"],
    internalColumns: ["is_internal", "in_house"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    anomalyColumns: ["has_anomaly", "is_anomalous", "is_blocked", "has_blocking_issue"],
    anomalyCountColumns: ["anomaly_count", "open_issue_count", "criticality_count", "blocker_count"],
    noteColumns: ["note", "notes", "description", "remark"],
    movementTypeColumns: ["movement_type", "type", "event_type", "direction_type"],
    documentCodeColumns: ["document_no", "movement_no", "delivery_no", "return_no", "code"],
    movementDateColumns: ["movement_date", "event_at", "occurred_at", "created_at"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    qtyColumns: ["qty", "quantity", "movement_qty", "delta_qty"],
    sentQtyColumns: ["qty_sent", "sent_qty", "delivered_qty", "inviata_qty"],
    returnedQtyColumns: ["qty_returned", "returned_qty", "received_qty", "rientrata_qty"],
    residualQtyColumns: ["qty_residual", "residual_qty", "remaining_qty", "open_qty"],
    materialsAtSupplierColumns: [
      "materials_at_subcontractor_qty",
      "at_subcontractor_qty",
      "third_party_stock_qty",
      "qty_at_supplier",
    ],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "order_code"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code"],
  },
  {
    table: "conto_lavoro_movements",
    idColumns: ["id", "conto_lavoro_movement_id", "movement_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    directionColumns: ["flow_type", "direction", "subcontracting_type", "passive_active_type"],
    externalColumns: ["is_external", "is_outsourced"],
    internalColumns: ["is_internal", "in_house"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    anomalyColumns: ["has_anomaly", "is_anomalous", "is_blocked", "has_blocking_issue"],
    anomalyCountColumns: ["anomaly_count", "open_issue_count", "criticality_count", "blocker_count"],
    noteColumns: ["note", "notes", "description", "remark"],
    movementTypeColumns: ["movement_type", "type", "event_type", "direction_type"],
    documentCodeColumns: ["document_no", "movement_no", "delivery_no", "return_no", "code"],
    movementDateColumns: ["movement_date", "event_at", "occurred_at", "created_at"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    qtyColumns: ["qty", "quantity", "movement_qty", "delta_qty"],
    sentQtyColumns: ["qty_sent", "sent_qty", "delivered_qty", "inviata_qty"],
    returnedQtyColumns: ["qty_returned", "returned_qty", "received_qty", "rientrata_qty"],
    residualQtyColumns: ["qty_residual", "residual_qty", "remaining_qty", "open_qty"],
    materialsAtSupplierColumns: [
      "materials_at_subcontractor_qty",
      "at_subcontractor_qty",
      "third_party_stock_qty",
      "qty_at_supplier",
    ],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "order_code"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code"],
  },
  {
    table: "subcontracting_deliveries",
    idColumns: ["id", "subcontracting_delivery_id", "delivery_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    directionColumns: ["flow_type", "direction", "subcontracting_type", "passive_active_type"],
    externalColumns: ["is_external", "is_outsourced"],
    internalColumns: ["is_internal", "in_house"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    anomalyColumns: ["has_anomaly", "is_anomalous", "is_blocked", "has_blocking_issue"],
    anomalyCountColumns: ["anomaly_count", "open_issue_count", "criticality_count", "blocker_count"],
    noteColumns: ["note", "notes", "description", "remark"],
    movementTypeColumns: ["movement_type", "type", "event_type", "direction_type"],
    documentCodeColumns: ["document_no", "movement_no", "delivery_no", "return_no", "code"],
    movementDateColumns: ["movement_date", "event_at", "occurred_at", "created_at"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    qtyColumns: ["qty", "quantity", "movement_qty", "delta_qty"],
    sentQtyColumns: ["qty_sent", "sent_qty", "delivered_qty", "inviata_qty"],
    returnedQtyColumns: ["qty_returned", "returned_qty", "received_qty", "rientrata_qty"],
    residualQtyColumns: ["qty_residual", "residual_qty", "remaining_qty", "open_qty"],
    materialsAtSupplierColumns: [
      "materials_at_subcontractor_qty",
      "at_subcontractor_qty",
      "third_party_stock_qty",
      "qty_at_supplier",
    ],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "order_code"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code"],
  },
  {
    table: "subcontracting_returns",
    idColumns: ["id", "subcontracting_return_id", "return_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    directionColumns: ["flow_type", "direction", "subcontracting_type", "passive_active_type"],
    externalColumns: ["is_external", "is_outsourced"],
    internalColumns: ["is_internal", "in_house"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    anomalyColumns: ["has_anomaly", "is_anomalous", "is_blocked", "has_blocking_issue"],
    anomalyCountColumns: ["anomaly_count", "open_issue_count", "criticality_count", "blocker_count"],
    noteColumns: ["note", "notes", "description", "remark"],
    movementTypeColumns: ["movement_type", "type", "event_type", "direction_type"],
    documentCodeColumns: ["document_no", "movement_no", "delivery_no", "return_no", "code"],
    movementDateColumns: ["movement_date", "event_at", "occurred_at", "created_at"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    qtyColumns: ["qty", "quantity", "movement_qty", "delta_qty"],
    sentQtyColumns: ["qty_sent", "sent_qty", "delivered_qty", "inviata_qty"],
    returnedQtyColumns: ["qty_returned", "returned_qty", "received_qty", "rientrata_qty"],
    residualQtyColumns: ["qty_residual", "residual_qty", "remaining_qty", "open_qty"],
    materialsAtSupplierColumns: [
      "materials_at_subcontractor_qty",
      "at_subcontractor_qty",
      "third_party_stock_qty",
      "qty_at_supplier",
    ],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "order_code"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code"],
  },
  {
    table: "material_movements",
    idColumns: ["id", "material_movement_id", "movement_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    directionColumns: ["flow_type", "direction", "subcontracting_type", "passive_active_type"],
    externalColumns: ["is_external", "is_outsourced"],
    internalColumns: ["is_internal", "in_house"],
    supplierCodeColumns: ["supplier_code", "vendor_code", "subcontractor_code", "supplier_id"],
    supplierNameColumns: ["supplier_name", "vendor_name", "subcontractor_name"],
    anomalyColumns: ["has_anomaly", "is_anomalous", "is_blocked", "has_blocking_issue"],
    anomalyCountColumns: ["anomaly_count", "open_issue_count", "criticality_count", "blocker_count"],
    noteColumns: ["note", "notes", "description", "remark"],
    movementTypeColumns: ["movement_type", "type", "event_type", "direction_type"],
    documentCodeColumns: ["document_no", "movement_no", "delivery_no", "return_no", "code"],
    movementDateColumns: ["movement_date", "event_at", "occurred_at", "created_at"],
    materialCodeColumns: ["material_code", "item_code", "product_code", "code", "sku"],
    materialNameColumns: ["material_name", "item_name", "description", "name"],
    qtyColumns: ["qty", "quantity", "movement_qty", "delta_qty"],
    sentQtyColumns: ["qty_sent", "sent_qty", "delivered_qty", "inviata_qty"],
    returnedQtyColumns: ["qty_returned", "returned_qty", "received_qty", "rientrata_qty"],
    residualQtyColumns: ["qty_residual", "residual_qty", "remaining_qty", "open_qty"],
    materialsAtSupplierColumns: [
      "materials_at_subcontractor_qty",
      "at_subcontractor_qty",
      "third_party_stock_qty",
      "qty_at_supplier",
    ],
    orderCodeColumns: ["production_order_no", "order_no", "odp_no", "order_code"],
    phaseCodeColumns: ["phase_code", "step_code", "operation_code"],
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

const normalizeDirectionLabel = (value: string): SubcontractingDirection | null => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("passivo") ||
    normalized.includes("supplier") ||
    normalized.includes("subcontract") ||
    normalized.includes("outsour")
  ) {
    return "passivo";
  }

  if (normalized.includes("attivo") || normalized.includes("customer") || normalized.includes("active")) {
    return "attivo";
  }

  return null;
};

const resolveDirection = (row: RawRow, candidate: BaseCandidate): SubcontractingDirection => {
  const explicitDirection = normalizeDirectionLabel(readStringFromKeys(row, candidate.directionColumns));
  if (explicitDirection) {
    return explicitDirection;
  }

  const external = readBooleanFromKeys(row, candidate.externalColumns);
  const internal = readBooleanFromKeys(row, candidate.internalColumns);

  if (external === true) {
    return "passivo";
  }

  if (internal === true) {
    return "attivo";
  }

  const supplierEvidence =
    readStringFromKeys(row, candidate.supplierCodeColumns).length > 0 ||
    readStringFromKeys(row, candidate.supplierNameColumns).length > 0;
  if (supplierEvidence) {
    return "passivo";
  }

  return "nd";
};

const resolveDelay = (row: RawRow, delayColumns: string[], dueDateColumns: string[]) => {
  const explicitDelay = readNumberFromKeys(row, delayColumns);
  if (explicitDelay !== null) {
    return {
      isDelayed: explicitDelay > 0,
      delayDays: explicitDelay > 0 ? Math.floor(explicitDelay) : 0,
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

  const delta = Date.now() - parsed.getTime();
  const days = Math.floor(delta / (1000 * 60 * 60 * 24));
  return {
    isDelayed: days > 0,
    delayDays: days > 0 ? days : 0,
  };
};

const resolveAnomaly = (row: RawRow, candidate: BaseCandidate, status: string) => {
  const explicitFlag = readBooleanFromKeys(row, candidate.anomalyColumns);
  const anomalyCount = readNumberFromKeys(row, candidate.anomalyCountColumns);

  if (explicitFlag === true) {
    return {
      hasAnomaly: true,
      anomalyCount,
    };
  }

  if (anomalyCount !== null && anomalyCount > 0) {
    return {
      hasAnomaly: true,
      anomalyCount,
    };
  }

  const normalizedStatus = status.toLowerCase();
  const hasStatusSignal =
    normalizedStatus.includes("anom") ||
    normalizedStatus.includes("ritard") ||
    normalizedStatus.includes("late") ||
    normalizedStatus.includes("blocc") ||
    normalizedStatus.includes("issue") ||
    normalizedStatus.includes("critical");

  return {
    hasAnomaly: hasStatusSignal,
    anomalyCount,
  };
};

const normalizeMovementTypeFromText = (value: string): SubcontractingMovementType | null => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("invio") ||
    normalized.includes("send") ||
    normalized.includes("delivery") ||
    normalized.includes("uscita")
  ) {
    return "invio";
  }

  if (
    normalized.includes("rientro") ||
    normalized.includes("return") ||
    normalized.includes("ingresso")
  ) {
    return "rientro";
  }

  if (normalized.includes("move") || normalized.includes("mov")) {
    return "movimento";
  }

  return null;
};

const normalizeQty = (value: number | null) => (value === null ? null : Math.round(value * 1000) / 1000);

const resolvePhaseQty = (row: RawRow, candidate: PhaseTableCandidate) => {
  const sentRaw = readNumberFromKeys(row, candidate.sentQtyColumns);
  const returnedRaw = readNumberFromKeys(row, candidate.returnedQtyColumns);
  const residualRaw = readNumberFromKeys(row, candidate.residualQtyColumns);
  const materialsRaw = readNumberFromKeys(row, candidate.materialsAtSupplierColumns);

  const sent = normalizeQty(sentRaw === null ? null : Math.max(0, sentRaw));
  const returned = normalizeQty(returnedRaw === null ? null : Math.max(0, returnedRaw));

  let residual = normalizeQty(residualRaw === null ? null : Math.max(0, residualRaw));
  if (residual === null && sent !== null && returned !== null) {
    residual = normalizeQty(Math.max(0, sent - returned));
  }

  let materialsAtSupplier = normalizeQty(materialsRaw === null ? null : Math.max(0, materialsRaw));
  if (materialsAtSupplier === null) {
    materialsAtSupplier = residual;
  }

  return {
    qtySent: sent,
    qtyReturned: returned,
    qtyResidual: residual,
    materialsAtSupplier,
  };
};

const resolveMovementQty = (row: RawRow, candidate: MovementTableCandidate) => {
  const explicitType = normalizeMovementTypeFromText(
    readStringFromKeys(row, candidate.movementTypeColumns),
  );

  const qtyRaw = readNumberFromKeys(row, candidate.qtyColumns);
  const sentRaw = readNumberFromKeys(row, candidate.sentQtyColumns);
  const returnedRaw = readNumberFromKeys(row, candidate.returnedQtyColumns);
  const residualRaw = readNumberFromKeys(row, candidate.residualQtyColumns);
  const materialsRaw = readNumberFromKeys(row, candidate.materialsAtSupplierColumns);

  let movementType: SubcontractingMovementType = explicitType ?? "movimento";
  let qtySent = sentRaw;
  let qtyReturned = returnedRaw;

  if (qtySent === null && qtyReturned === null && qtyRaw !== null) {
    if (movementType === "rientro") {
      qtyReturned = Math.abs(qtyRaw);
    } else if (movementType === "invio") {
      qtySent = Math.abs(qtyRaw);
    } else if (qtyRaw < 0) {
      movementType = "rientro";
      qtyReturned = Math.abs(qtyRaw);
    } else if (qtyRaw > 0) {
      movementType = "invio";
      qtySent = Math.abs(qtyRaw);
    }
  }

  const sent = normalizeQty(qtySent === null ? null : Math.max(0, qtySent));
  const returned = normalizeQty(qtyReturned === null ? null : Math.max(0, qtyReturned));

  let residual = normalizeQty(residualRaw === null ? null : Math.max(0, residualRaw));
  if (residual === null && sent !== null && returned !== null) {
    residual = normalizeQty(Math.max(0, sent - returned));
  }

  let materialsAtSupplier = normalizeQty(materialsRaw === null ? null : Math.max(0, materialsRaw));
  if (materialsAtSupplier === null) {
    materialsAtSupplier = residual;
  }

  if (!explicitType && movementType === "movimento" && sent === null && returned === null) {
    movementType = "nd";
  }

  return {
    movementType,
    qtySent: sent,
    qtyReturned: returned,
    qtyResidual: residual,
    materialsAtSupplier,
  };
};

const queryCandidateRows = async (
  candidate: BaseCandidate,
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
    const rowParent = readStringFromKeys(row, candidate.parentColumns);
    return rowTenant === tenantId && rowParent === commessaId;
  });

  return {
    exists: true,
    rows: scopedRows,
    warning: null,
  };
};

const normalizePhase = (
  row: RawRow,
  candidate: PhaseTableCandidate,
  tenantId: string,
  commessaId: string,
  index: number,
): CommessaSubcontractingPhaseItem | null => {
  const id = readStringFromKeys(row, candidate.idColumns) || `${candidate.table}-phase-${index + 1}`;
  if (!id) {
    return null;
  }

  const phaseCode = readStringFromKeys(row, candidate.phaseCodeColumns) || `Fase-${index + 1}`;
  const phaseName = readStringFromKeys(row, candidate.phaseNameColumns) || phaseCode;
  const status = readStringFromKeys(row, candidate.statusColumns) || "unknown";
  const direction = resolveDirection(row, candidate);
  const qty = resolvePhaseQty(row, candidate);
  const delay = resolveDelay(row, candidate.delayColumns, candidate.dueDateColumns);
  const anomaly = resolveAnomaly(row, candidate, status);
  const supplierCode = readStringFromKeys(row, candidate.supplierCodeColumns) || null;
  const supplierName = readStringFromKeys(row, candidate.supplierNameColumns) || null;
  const externalFlag = readBooleanFromKeys(row, candidate.externalColumns);

  const hasSubcontractingEvidence =
    direction !== "nd" ||
    externalFlag === true ||
    supplierCode !== null ||
    supplierName !== null ||
    qty.qtySent !== null ||
    qty.qtyReturned !== null ||
    qty.qtyResidual !== null ||
    qty.materialsAtSupplier !== null ||
    candidate.table.includes("subcontract") ||
    candidate.table.includes("conto_lavoro") ||
    candidate.table.includes("external");

  if (!hasSubcontractingEvidence) {
    return null;
  }

  return {
    id,
    tenantId: readStringFromKeys(row, candidate.tenantColumns) || tenantId,
    commessaId,
    orderCode: readStringFromKeys(row, candidate.orderCodeColumns) || null,
    phaseCode,
    phaseName,
    status,
    direction,
    qtySent: qty.qtySent,
    qtyReturned: qty.qtyReturned,
    qtyResidual: qty.qtyResidual,
    materialsAtSupplier: qty.materialsAtSupplier,
    isDelayed: delay.isDelayed,
    delayDays: delay.delayDays,
    hasAnomaly: anomaly.hasAnomaly,
    anomalyCount: anomaly.anomalyCount,
    dueDate: readDateTextFromKeys(row, candidate.dueDateColumns),
    supplierCode,
    supplierName,
    sourceTable: candidate.table,
  };
};

const normalizeMovement = (
  row: RawRow,
  candidate: MovementTableCandidate,
  tenantId: string,
  commessaId: string,
  index: number,
): CommessaSubcontractingMovementItem | null => {
  const id =
    readStringFromKeys(row, candidate.idColumns) || `${candidate.table}-movement-${index + 1}`;
  if (!id) {
    return null;
  }

  const status = readStringFromKeys(row, candidate.statusColumns) || "unknown";
  const direction = resolveDirection(row, candidate);
  const qty = resolveMovementQty(row, candidate);
  const anomaly = resolveAnomaly(row, candidate, status);
  const materialCode =
    readStringFromKeys(row, candidate.materialCodeColumns) ||
    readStringFromKeys(row, candidate.documentCodeColumns) ||
    `MAT-${index + 1}`;
  const materialName =
    readStringFromKeys(row, candidate.materialNameColumns) ||
    readStringFromKeys(row, candidate.noteColumns) ||
    materialCode;
  const supplierCode = readStringFromKeys(row, candidate.supplierCodeColumns) || null;
  const supplierName = readStringFromKeys(row, candidate.supplierNameColumns) || null;

  const hasSubcontractingEvidence =
    direction !== "nd" ||
    supplierCode !== null ||
    supplierName !== null ||
    qty.movementType !== "nd" ||
    qty.qtySent !== null ||
    qty.qtyReturned !== null ||
    qty.qtyResidual !== null ||
    qty.materialsAtSupplier !== null ||
    candidate.table.includes("subcontract") ||
    candidate.table.includes("conto_lavoro");

  if (!hasSubcontractingEvidence) {
    return null;
  }

  return {
    id,
    tenantId: readStringFromKeys(row, candidate.tenantColumns) || tenantId,
    commessaId,
    movementType: qty.movementType,
    documentCode: readStringFromKeys(row, candidate.documentCodeColumns) || null,
    movementDate: readDateTextFromKeys(row, candidate.movementDateColumns),
    status,
    direction,
    materialCode,
    materialName,
    qtySent: qty.qtySent,
    qtyReturned: qty.qtyReturned,
    qtyResidual: qty.qtyResidual,
    materialsAtSupplier: qty.materialsAtSupplier,
    hasAnomaly: anomaly.hasAnomaly,
    anomalyCount: anomaly.anomalyCount,
    orderCode: readStringFromKeys(row, candidate.orderCodeColumns) || null,
    phaseCode: readStringFromKeys(row, candidate.phaseCodeColumns) || null,
    supplierCode,
    supplierName,
    note: readStringFromKeys(row, candidate.noteColumns) || null,
    sourceTable: candidate.table,
  };
};

const dedupePhases = (items: CommessaSubcontractingPhaseItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.sourceTable}:${item.id}:${item.phaseCode}:${item.orderCode ?? "nd"}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const dedupeMovements = (items: CommessaSubcontractingMovementItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.sourceTable}:${item.id}:${item.documentCode ?? "nd"}:${item.materialCode}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
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

const movementDateValue = (value: string | null) => {
  if (!value) {
    return -1;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return -1;
  }
  return parsed.getTime();
};

const sortPhases = (items: CommessaSubcontractingPhaseItem[]) =>
  [...items].sort((left, right) => {
    if (left.hasAnomaly !== right.hasAnomaly) {
      return left.hasAnomaly ? -1 : 1;
    }
    if (left.isDelayed !== right.isDelayed) {
      return left.isDelayed ? -1 : 1;
    }

    const byDueDate = safeDateValue(left.dueDate) - safeDateValue(right.dueDate);
    if (byDueDate !== 0) {
      return byDueDate;
    }

    const leftOrder = left.orderCode ?? "";
    const rightOrder = right.orderCode ?? "";
    const byOrder = leftOrder.localeCompare(rightOrder, "it");
    if (byOrder !== 0) {
      return byOrder;
    }

    return left.phaseCode.localeCompare(right.phaseCode, "it");
  });

const movementTypeRank = (value: SubcontractingMovementType) => {
  if (value === "invio") {
    return 0;
  }
  if (value === "rientro") {
    return 1;
  }
  if (value === "movimento") {
    return 2;
  }
  return 3;
};

const sortMovements = (items: CommessaSubcontractingMovementItem[]) =>
  [...items].sort((left, right) => {
    if (left.hasAnomaly !== right.hasAnomaly) {
      return left.hasAnomaly ? -1 : 1;
    }

    const byDate = movementDateValue(right.movementDate) - movementDateValue(left.movementDate);
    if (byDate !== 0) {
      return byDate;
    }

    const byType = movementTypeRank(left.movementType) - movementTypeRank(right.movementType);
    if (byType !== 0) {
      return byType;
    }

    return left.materialCode.localeCompare(right.materialCode, "it");
  });

type DirectionFilter = "all" | "passivo" | "attivo" | "nd";
type AnomalyFilter = "all" | "with" | "without";

const normalizeDirectionFilter = (value: string | undefined): DirectionFilter => {
  if (value === "passivo" || value === "attivo" || value === "nd") {
    return value;
  }
  return "all";
};

const normalizeAnomalyFilter = (value: string | undefined): AnomalyFilter => {
  if (value === "with" || value === "without") {
    return value;
  }
  return "all";
};

const matchesDirection = (direction: SubcontractingDirection, filter: DirectionFilter) => {
  if (filter === "all") {
    return true;
  }
  return direction === filter;
};

const matchesAnomaly = (hasAnomaly: boolean, filter: AnomalyFilter) => {
  if (filter === "all") {
    return true;
  }
  return filter === "with" ? hasAnomaly : !hasAnomaly;
};

const applyPhaseFilters = (
  items: CommessaSubcontractingPhaseItem[],
  filters: CommessaSubcontractingFilters,
) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const directionFilter = normalizeDirectionFilter(filters.direction);
  const anomalyFilter = normalizeAnomalyFilter(filters.anomaly);
  const statusFilter = (filters.status ?? "all").trim().toLowerCase();

  return items.filter((item) => {
    if (query) {
      const haystack = [
        item.orderCode ?? "",
        item.phaseCode,
        item.phaseName,
        item.status,
        item.supplierCode ?? "",
        item.supplierName ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (!matchesDirection(item.direction, directionFilter)) {
      return false;
    }
    if (!matchesAnomaly(item.hasAnomaly, anomalyFilter)) {
      return false;
    }
    if (statusFilter !== "all" && item.status.toLowerCase() !== statusFilter) {
      return false;
    }

    return true;
  });
};

const applyMovementFilters = (
  items: CommessaSubcontractingMovementItem[],
  filters: CommessaSubcontractingFilters,
) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const directionFilter = normalizeDirectionFilter(filters.direction);
  const anomalyFilter = normalizeAnomalyFilter(filters.anomaly);
  const statusFilter = (filters.status ?? "all").trim().toLowerCase();

  return items.filter((item) => {
    if (query) {
      const haystack = [
        item.documentCode ?? "",
        item.materialCode,
        item.materialName,
        item.status,
        item.phaseCode ?? "",
        item.orderCode ?? "",
        item.supplierCode ?? "",
        item.supplierName ?? "",
        item.note ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (!matchesDirection(item.direction, directionFilter)) {
      return false;
    }
    if (!matchesAnomaly(item.hasAnomaly, anomalyFilter)) {
      return false;
    }
    if (statusFilter !== "all" && item.status.toLowerCase() !== statusFilter) {
      return false;
    }

    return true;
  });
};

const uniqueValues = (items: string[]) =>
  [...new Set(items.map((item) => item.trim()).filter((item) => item.length > 0))].sort(
    (left, right) => left.localeCompare(right, "it"),
  );

const sumOrNull = (values: Array<number | null>) => {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length === 0) {
    return null;
  }
  return Math.round(numbers.reduce((sum, value) => sum + value, 0) * 1000) / 1000;
};

const buildSummary = (
  phases: CommessaSubcontractingPhaseItem[],
  movements: CommessaSubcontractingMovementItem[],
): CommessaSubcontractingSummary => {
  const allDirections = [...phases.map((item) => item.direction), ...movements.map((item) => item.direction)];
  const allAnomalies = [
    ...phases.map((item) => item.hasAnomaly),
    ...movements.map((item) => item.hasAnomaly),
  ];

  return {
    phasesTotal: phases.length,
    movementsTotal: movements.length,
    passiveItems: allDirections.filter((value) => value === "passivo").length,
    activeItems: allDirections.filter((value) => value === "attivo").length,
    unknownDirectionItems: allDirections.filter((value) => value === "nd").length,
    delayedPhases: phases.filter((item) => item.isDelayed).length,
    anomalousItems: allAnomalies.filter((value) => value).length,
    qtySentTotal: sumOrNull([
      ...phases.map((item) => item.qtySent),
      ...movements.map((item) => item.qtySent),
    ]),
    qtyReturnedTotal: sumOrNull([
      ...phases.map((item) => item.qtyReturned),
      ...movements.map((item) => item.qtyReturned),
    ]),
    qtyResidualTotal: sumOrNull([
      ...phases.map((item) => item.qtyResidual),
      ...movements.map((item) => item.qtyResidual),
    ]),
    materialsAtSupplierTotal: sumOrNull([
      ...phases.map((item) => item.materialsAtSupplier),
      ...movements.map((item) => item.materialsAtSupplier),
    ]),
  };
};

const loadPhases = async (
  tenantId: string,
  commessaId: string,
  warnings: string[],
  sourceTables: Set<string>,
) => {
  const rows: CommessaSubcontractingPhaseItem[] = [];

  for (const candidate of PHASE_TABLE_CANDIDATES) {
    const result = await queryCandidateRows(candidate, tenantId, commessaId, SAFE_LIST_LIMIT);
    if (result.warning) {
      warnings.push(result.warning);
    }
    if (!result.exists) {
      continue;
    }

    sourceTables.add(candidate.table);
    result.rows.forEach((row, index) => {
      const normalized = normalizePhase(row, candidate, tenantId, commessaId, index);
      if (normalized) {
        rows.push(normalized);
      }
    });
  }

  return sortPhases(dedupePhases(rows));
};

const loadMovements = async (
  tenantId: string,
  commessaId: string,
  warnings: string[],
  sourceTables: Set<string>,
) => {
  const rows: CommessaSubcontractingMovementItem[] = [];

  for (const candidate of MOVEMENT_TABLE_CANDIDATES) {
    const result = await queryCandidateRows(candidate, tenantId, commessaId, SAFE_LIST_LIMIT);
    if (result.warning) {
      warnings.push(result.warning);
    }
    if (!result.exists) {
      continue;
    }

    sourceTables.add(candidate.table);
    result.rows.forEach((row, index) => {
      const normalized = normalizeMovement(row, candidate, tenantId, commessaId, index);
      if (normalized) {
        rows.push(normalized);
      }
    });
  }

  return sortMovements(dedupeMovements(rows));
};

const buildSubcontracting = async (
  tenantId: string,
  commessaId: string,
  filters: CommessaSubcontractingFilters,
): Promise<CommessaSubcontractingResult> => {
  const warnings: string[] = [];
  const sourceTables = new Set<string>();

  const phases = await loadPhases(tenantId, commessaId, warnings, sourceTables);
  const movements = await loadMovements(tenantId, commessaId, warnings, sourceTables);

  if (sourceTables.size === 0) {
    return {
      phases: [],
      movements: [],
      statuses: [],
      summary: buildSummary([], []),
      sourceTables: [],
      warnings,
      emptyStateHint:
        "Nessuna sorgente conto lavoro disponibile nel DB esposto per la commessa selezionata.",
      error: null,
    };
  }

  const filteredPhases = applyPhaseFilters(phases, filters);
  const filteredMovements = applyMovementFilters(movements, filters);
  const statuses = uniqueValues([
    ...phases.map((item) => item.status),
    ...movements.map((item) => item.status),
  ]);

  let emptyStateHint: string | null = null;
  if (phases.length === 0 && movements.length === 0) {
    emptyStateHint =
      "Nessuna fase esterna o movimento conto lavoro collegato alla commessa nel tenant selezionato.";
  } else if (filteredPhases.length === 0 && filteredMovements.length === 0) {
    emptyStateHint = "Nessun dato conto lavoro trovato con i filtri correnti.";
  }

  return {
    phases: filteredPhases,
    movements: filteredMovements,
    statuses,
    summary: buildSummary(filteredPhases, filteredMovements),
    sourceTables: [...sourceTables].sort((left, right) => left.localeCompare(right, "it")),
    warnings,
    emptyStateHint,
    error: null,
  };
};

export const getTenantCommessaSubcontracting = async (
  tenantId: string,
  commessaId: string,
  filters: CommessaSubcontractingFilters,
): Promise<CommessaSubcontractingResult> => {
  if (!tenantId || !commessaId) {
    return {
      phases: [],
      movements: [],
      statuses: [],
      summary: buildSummary([], []),
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Parametri non validi.",
    };
  }

  try {
    return await buildSubcontracting(tenantId, commessaId, filters);
  } catch (caughtError) {
    return {
      phases: [],
      movements: [],
      statuses: [],
      summary: buildSummary([], []),
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};
