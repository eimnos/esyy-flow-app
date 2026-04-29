import "server-only";

import {
  CUSTOM_FIELD_OBJECT_TYPES,
  CUSTOM_FIELD_TARGET_LEVELS,
  getTenantCustomFieldValues,
  type CustomFieldObjectType,
  type CustomFieldTargetLevel,
  type CustomFieldValueSummary,
} from "@/lib/domain/custom-fields";
import {
  getTenantIntFieldBindingsCatalog,
  type IntFieldBindingDirectionMode,
  type IntFieldBindingSummary,
} from "@/lib/domain/custom-field-int-bindings";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RawRow = Record<string, unknown>;

type SourceTableCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  parentColumns?: string[];
};

const ERP_WRITE_DIRECTION_ALLOWLIST = new Set<IntFieldBindingDirectionMode>([
  "write",
  "bidirectional_candidate",
]);

const ERP_WRITE_SOURCE_SYSTEM_ALLOWLIST = new Set(["sap_b1"]);

const HEADER_TABLE_BY_OBJECT_TYPE: Record<CustomFieldObjectType, SourceTableCandidate> = {
  products: {
    table: "products",
    idColumns: ["id", "product_id", "item_id"],
    tenantColumns: ["tenant_id"],
  },
  projects: {
    table: "projects",
    idColumns: ["id", "project_id"],
    tenantColumns: ["tenant_id"],
  },
  production_orders: {
    table: "production_orders",
    idColumns: ["id", "production_order_id", "work_order_id"],
    tenantColumns: ["tenant_id"],
  },
  production_order_phases: {
    table: "production_order_phases",
    idColumns: ["id", "production_order_phase_id", "phase_id"],
    tenantColumns: ["tenant_id"],
  },
  bom_templates: {
    table: "bom_templates",
    idColumns: ["id", "bom_template_id"],
    tenantColumns: ["tenant_id"],
  },
  routing_templates: {
    table: "routing_templates",
    idColumns: ["id", "routing_template_id"],
    tenantColumns: ["tenant_id"],
  },
  production_models: {
    table: "production_models",
    idColumns: ["id", "production_model_id"],
    tenantColumns: ["tenant_id"],
  },
};

const LINE_CONTEXT_TABLES: Record<string, SourceTableCandidate> = {
  production_order_lines: {
    table: "production_order_lines",
    idColumns: ["id", "production_order_line_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["production_order_id", "order_id"],
  },
  production_order_phases: {
    table: "production_order_phases",
    idColumns: ["id", "production_order_phase_id", "phase_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["production_order_id", "order_id"],
  },
  production_order_phase_materials: {
    table: "production_order_phase_materials",
    idColumns: ["id", "production_order_phase_material_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["production_order_phase_id", "phase_id", "parent_phase_id"],
  },
  bom_template_version_lines: {
    table: "bom_template_version_lines",
    idColumns: ["id", "bom_template_version_line_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["bom_template_id", "template_id", "parent_template_id"],
  },
  routing_template_version_steps: {
    table: "routing_template_version_steps",
    idColumns: ["id", "routing_template_version_step_id", "step_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["routing_template_id", "template_id", "parent_template_id"],
  },
  production_model_version_routing_links: {
    table: "production_model_version_routing_links",
    idColumns: ["id", "production_model_version_routing_link_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["production_model_id", "model_id", "parent_model_id"],
  },
  project_parties: {
    table: "project_parties",
    idColumns: ["id", "project_party_id", "line_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "parent_project_id"],
  },
};

const parseString = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return `${value}`;
  }
  return "";
};

const normalizeCode = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

const normalizeSourceSystemCode = (raw: string) => normalizeCode(raw);

const parseErrorMessage = (error: unknown) => {
  const fallback = "Unknown query error";
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const message = parseString((error as { message?: string }).message);
  const details = parseString((error as { details?: string }).details);
  const hint = parseString((error as { hint?: string }).hint);

  return [message, details, hint].filter(Boolean).join(" | ") || fallback;
};

const resolveLineContextCandidate = (lineContextType: string) => {
  const key = normalizeCode(lineContextType);
  return LINE_CONTEXT_TABLES[key] ?? null;
};

const isWritableDirectionMode = (directionMode: IntFieldBindingDirectionMode) =>
  ERP_WRITE_DIRECTION_ALLOWLIST.has(directionMode);

const isAllowedSourceSystem = (sourceSystemCode: string) =>
  ERP_WRITE_SOURCE_SYSTEM_ALLOWLIST.has(normalizeSourceSystemCode(sourceSystemCode));

const resolveCandidateForBinding = (
  binding: IntFieldBindingSummary,
): SourceTableCandidate | null => {
  if (binding.targetLevel === "header") {
    return HEADER_TABLE_BY_OBJECT_TYPE[binding.objectTypeCode as CustomFieldObjectType] ?? null;
  }

  const lineContextType = parseString(binding.lineContextType);
  if (!lineContextType) {
    return null;
  }

  return resolveLineContextCandidate(lineContextType);
};

const toWritableExternalValue = (value: CustomFieldValueSummary["value"]) => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return JSON.stringify(value);
};

const getValueType = (value: CustomFieldValueSummary["value"]) => {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return "string";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  return "unknown";
};

const filterWritableBindings = (
  bindings: IntFieldBindingSummary[],
  input: CustomFieldErpWriteInput,
) => {
  const requestedSourceSystem = normalizeSourceSystemCode(
    parseString(input.sourceSystemCode),
  );
  const requestedDefinitionId = parseString(input.customFieldDefinitionId);

  return bindings.filter((binding) => {
    if (binding.objectTypeCode !== input.objectTypeCode) {
      return false;
    }
    if (binding.targetLevel !== input.targetLevel) {
      return false;
    }
    if (binding.status !== "active") {
      return false;
    }
    if (!binding.isEnabled) {
      return false;
    }
    if (!isWritableDirectionMode(binding.directionMode)) {
      return false;
    }
    if (!isAllowedSourceSystem(binding.sourceSystemCode)) {
      return false;
    }
    if (
      requestedSourceSystem &&
      normalizeSourceSystemCode(binding.sourceSystemCode) !== requestedSourceSystem
    ) {
      return false;
    }
    if (requestedDefinitionId && binding.customFieldDefinitionId !== requestedDefinitionId) {
      return false;
    }
    return true;
  });
};

const findUpdatedRowId = (row: RawRow) => {
  const candidateKeys = [
    "id",
    "production_order_id",
    "project_id",
    "product_id",
    "bom_template_id",
    "routing_template_id",
    "production_model_id",
    "line_id",
  ];

  for (const key of candidateKeys) {
    const value = parseString(row[key]);
    if (value) {
      return value;
    }
  }

  return null;
};

type UpdateRowAttemptResult = {
  ok: boolean;
  sourceColumn: string | null;
  sourceTable: string;
  sourceRecordId: string;
  updatedRowId: string | null;
  message: string;
  warnings: string[];
};

const updateSourceRow = async (
  tenantId: string,
  candidate: SourceTableCandidate,
  recordId: string,
  parentRecordId: string | undefined,
  externalFieldIdentifier: string,
  value: string | number | boolean | null,
): Promise<UpdateRowAttemptResult> => {
  const admin = getSupabaseAdminClient();
  const warnings: string[] = [];

  const parentColumns =
    parentRecordId && candidate.parentColumns && candidate.parentColumns.length > 0
      ? candidate.parentColumns
      : [null];

  for (const tenantColumn of candidate.tenantColumns) {
    for (const idColumn of candidate.idColumns) {
      for (const parentColumn of parentColumns) {
        let query = admin
          .from(candidate.table)
          .update({ [externalFieldIdentifier]: value } as never)
          .eq(tenantColumn, tenantId)
          .eq(idColumn, recordId);

        if (parentColumn && parentRecordId) {
          query = query.eq(parentColumn, parentRecordId);
        }

        const result = await query.select("*").limit(1);
        if (result.error) {
          warnings.push(
            `Errore update ${candidate.table}.${externalFieldIdentifier} (tenant ${tenantColumn}, id ${idColumn}${
              parentColumn ? `, parent ${parentColumn}` : ""
            }): ${parseErrorMessage(result.error)}`,
          );
          continue;
        }

        const row = ((result.data ?? [])[0] ?? null) as RawRow | null;
        if (row) {
          return {
            ok: true,
            sourceColumn: externalFieldIdentifier,
            sourceTable: candidate.table,
            sourceRecordId: recordId,
            updatedRowId: findUpdatedRowId(row),
            message: "Scrittura completata.",
            warnings,
          };
        }
      }
    }
  }

  return {
    ok: false,
    sourceColumn: externalFieldIdentifier,
    sourceTable: candidate.table,
    sourceRecordId: recordId,
    updatedRowId: null,
    message: "Nessuna riga sorgente aggiornata con i filtri tenant/target applicati.",
    warnings,
  };
};

export type CustomFieldErpWriteInput = {
  objectTypeCode: CustomFieldObjectType;
  targetLevel: CustomFieldTargetLevel;
  targetRecordId: string;
  targetLineRecordId?: string;
  customFieldDefinitionId?: string;
  sourceSystemCode?: string;
  dryRun?: boolean;
};

export type CustomFieldErpWriteItem = {
  bindingId: string;
  customFieldDefinitionId: string;
  customFieldCode: string | null;
  customFieldLabel: string | null;
  objectTypeCode: string;
  targetLevel: CustomFieldTargetLevel;
  lineContextType: string | null;
  sourceSystemCode: string;
  directionMode: IntFieldBindingDirectionMode;
  status: string;
  externalFieldIdentifier: string;
  sourceTable: string;
  sourceRecordId: string;
  sourceColumn: string | null;
  appValue: string | number | boolean | null;
  appValueType: string;
  writeStatus:
    | "written"
    | "planned"
    | "skipped_no_value"
    | "skipped_unsupported_line_context"
    | "failed";
  updatedRowId: string | null;
  message: string;
};

export type CustomFieldErpWriteResult = {
  values: CustomFieldErpWriteItem[];
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
  dryRun: boolean;
  totals: {
    totalBindings: number;
    processed: number;
    written: number;
    planned: number;
    skipped: number;
    failed: number;
  };
};

export const executeTenantCustomFieldErpWrite = async (
  tenantId: string,
  input: CustomFieldErpWriteInput,
): Promise<CustomFieldErpWriteResult> => {
  const dryRun = input.dryRun === true;

  if (!tenantId) {
    return {
      values: [],
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Tenant non valido.",
      dryRun,
      totals: {
        totalBindings: 0,
        processed: 0,
        written: 0,
        planned: 0,
        skipped: 0,
        failed: 0,
      },
    };
  }

  const objectType = parseString(input.objectTypeCode);
  const targetLevel = parseString(input.targetLevel);
  const targetRecordId = parseString(input.targetRecordId);
  const targetLineRecordId = parseString(input.targetLineRecordId);

  if (
    !CUSTOM_FIELD_OBJECT_TYPES.includes(objectType as CustomFieldObjectType) ||
    !CUSTOM_FIELD_TARGET_LEVELS.includes(targetLevel as CustomFieldTargetLevel) ||
    !targetRecordId
  ) {
    return {
      values: [],
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error:
        "Parametri non validi: object_type_code / target_level / target_record_id obbligatori.",
      dryRun,
      totals: {
        totalBindings: 0,
        processed: 0,
        written: 0,
        planned: 0,
        skipped: 0,
        failed: 0,
      },
    };
  }

  if (targetLevel === "line" && !targetLineRecordId) {
    return {
      values: [],
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "target_line_record_id obbligatorio quando target_level = line.",
      dryRun,
      totals: {
        totalBindings: 0,
        processed: 0,
        written: 0,
        planned: 0,
        skipped: 0,
        failed: 0,
      },
    };
  }

  const bindingsCatalog = await getTenantIntFieldBindingsCatalog(tenantId);
  if (bindingsCatalog.error) {
    return {
      values: [],
      sourceTables: bindingsCatalog.sourceTables,
      warnings: bindingsCatalog.warnings,
      emptyStateHint: null,
      error: bindingsCatalog.error,
      dryRun,
      totals: {
        totalBindings: 0,
        processed: 0,
        written: 0,
        planned: 0,
        skipped: 0,
        failed: 0,
      },
    };
  }

  const filteredBindings = filterWritableBindings(bindingsCatalog.bindings, {
    ...input,
    objectTypeCode: objectType as CustomFieldObjectType,
    targetLevel: targetLevel as CustomFieldTargetLevel,
  });

  if (filteredBindings.length === 0) {
    return {
      values: [],
      sourceTables: bindingsCatalog.sourceTables,
      warnings: bindingsCatalog.warnings,
      emptyStateHint:
        "Nessun binding tecnico attivo/write disponibile per i filtri selezionati.",
      error: null,
      dryRun,
      totals: {
        totalBindings: 0,
        processed: 0,
        written: 0,
        planned: 0,
        skipped: 0,
        failed: 0,
      },
    };
  }

  const appValuesResult = await getTenantCustomFieldValues(tenantId, {
    objectTypeCode: objectType as CustomFieldObjectType,
    targetLevel: targetLevel as CustomFieldTargetLevel,
    targetRecordId,
    targetLineRecordId,
  });

  if (appValuesResult.error) {
    return {
      values: [],
      sourceTables: appValuesResult.sourceTables,
      warnings: appValuesResult.warnings,
      emptyStateHint: null,
      error: appValuesResult.error,
      dryRun,
      totals: {
        totalBindings: filteredBindings.length,
        processed: 0,
        written: 0,
        planned: 0,
        skipped: filteredBindings.length,
        failed: 0,
      },
    };
  }

  const valuesByDefinitionId = new Map<string, CustomFieldValueSummary>();
  for (const item of appValuesResult.values) {
    valuesByDefinitionId.set(item.customFieldDefinitionId, item);
  }

  const sourceTables = new Set<string>();
  const warnings: string[] = [...bindingsCatalog.warnings, ...appValuesResult.warnings];
  const values: CustomFieldErpWriteItem[] = [];

  let written = 0;
  let planned = 0;
  let skipped = 0;
  let failed = 0;

  for (const binding of filteredBindings) {
    const candidate = resolveCandidateForBinding(binding);
    const recordId =
      binding.targetLevel === "line" ? targetLineRecordId : targetRecordId;
    const parentRecordId =
      binding.targetLevel === "line" ? targetRecordId : undefined;

    if (!candidate || !recordId) {
      skipped += 1;
      values.push({
        bindingId: binding.id,
        customFieldDefinitionId: binding.customFieldDefinitionId,
        customFieldCode: binding.customFieldCode,
        customFieldLabel: binding.customFieldLabel,
        objectTypeCode: binding.objectTypeCode,
        targetLevel: binding.targetLevel,
        lineContextType: binding.lineContextType,
        sourceSystemCode: binding.sourceSystemCode,
        directionMode: binding.directionMode,
        status: binding.status,
        externalFieldIdentifier: binding.erpFieldName,
        sourceTable: "n/d",
        sourceRecordId: recordId || "n/d",
        sourceColumn: null,
        appValue: null,
        appValueType: "null",
        writeStatus: "skipped_unsupported_line_context",
        updatedRowId: null,
        message: "line_context_type non supportato nel resolver write V1.",
      });
      continue;
    }

    sourceTables.add(candidate.table);
    const appValue = valuesByDefinitionId.get(binding.customFieldDefinitionId);

    if (!appValue) {
      skipped += 1;
      values.push({
        bindingId: binding.id,
        customFieldDefinitionId: binding.customFieldDefinitionId,
        customFieldCode: binding.customFieldCode,
        customFieldLabel: binding.customFieldLabel,
        objectTypeCode: binding.objectTypeCode,
        targetLevel: binding.targetLevel,
        lineContextType: binding.lineContextType,
        sourceSystemCode: binding.sourceSystemCode,
        directionMode: binding.directionMode,
        status: binding.status,
        externalFieldIdentifier: binding.erpFieldName,
        sourceTable: candidate.table,
        sourceRecordId: recordId,
        sourceColumn: binding.erpFieldName,
        appValue: null,
        appValueType: "null",
        writeStatus: "skipped_no_value",
        updatedRowId: null,
        message: "Nessun valore app-native disponibile per la definizione custom field sul target.",
      });
      continue;
    }

    const appValueType = getValueType(appValue.value);
    const writableValue = toWritableExternalValue(appValue.value);

    if (dryRun) {
      planned += 1;
      values.push({
        bindingId: binding.id,
        customFieldDefinitionId: binding.customFieldDefinitionId,
        customFieldCode: binding.customFieldCode,
        customFieldLabel: binding.customFieldLabel,
        objectTypeCode: binding.objectTypeCode,
        targetLevel: binding.targetLevel,
        lineContextType: binding.lineContextType,
        sourceSystemCode: binding.sourceSystemCode,
        directionMode: binding.directionMode,
        status: binding.status,
        externalFieldIdentifier: binding.erpFieldName,
        sourceTable: candidate.table,
        sourceRecordId: recordId,
        sourceColumn: binding.erpFieldName,
        appValue: appValue.value,
        appValueType,
        writeStatus: "planned",
        updatedRowId: null,
        message: "Dry run: scrittura pianificata (nessuna modifica persistita).",
      });
      continue;
    }

    const updateResult = await updateSourceRow(
      tenantId,
      candidate,
      recordId,
      parentRecordId,
      binding.erpFieldName,
      writableValue,
    );

    warnings.push(...updateResult.warnings);

    if (updateResult.ok) {
      written += 1;
      values.push({
        bindingId: binding.id,
        customFieldDefinitionId: binding.customFieldDefinitionId,
        customFieldCode: binding.customFieldCode,
        customFieldLabel: binding.customFieldLabel,
        objectTypeCode: binding.objectTypeCode,
        targetLevel: binding.targetLevel,
        lineContextType: binding.lineContextType,
        sourceSystemCode: binding.sourceSystemCode,
        directionMode: binding.directionMode,
        status: binding.status,
        externalFieldIdentifier: binding.erpFieldName,
        sourceTable: updateResult.sourceTable,
        sourceRecordId: updateResult.sourceRecordId,
        sourceColumn: updateResult.sourceColumn,
        appValue: appValue.value,
        appValueType,
        writeStatus: "written",
        updatedRowId: updateResult.updatedRowId,
        message: updateResult.message,
      });
    } else {
      failed += 1;
      values.push({
        bindingId: binding.id,
        customFieldDefinitionId: binding.customFieldDefinitionId,
        customFieldCode: binding.customFieldCode,
        customFieldLabel: binding.customFieldLabel,
        objectTypeCode: binding.objectTypeCode,
        targetLevel: binding.targetLevel,
        lineContextType: binding.lineContextType,
        sourceSystemCode: binding.sourceSystemCode,
        directionMode: binding.directionMode,
        status: binding.status,
        externalFieldIdentifier: binding.erpFieldName,
        sourceTable: updateResult.sourceTable,
        sourceRecordId: updateResult.sourceRecordId,
        sourceColumn: updateResult.sourceColumn,
        appValue: appValue.value,
        appValueType,
        writeStatus: "failed",
        updatedRowId: null,
        message: updateResult.message,
      });
    }
  }

  const processed = filteredBindings.length;

  return {
    values,
    sourceTables: [...sourceTables].sort((a, b) => a.localeCompare(b, "it")),
    warnings: [...new Set(warnings.filter(Boolean))],
    emptyStateHint:
      values.length === 0
        ? "Nessun valore scritto sul target ERP simulato per i binding selezionati."
        : null,
    error: null,
    dryRun,
    totals: {
      totalBindings: filteredBindings.length,
      processed,
      written,
      planned,
      skipped,
      failed,
    },
  };
};
