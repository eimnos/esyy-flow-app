import "server-only";

import { randomUUID } from "node:crypto";

import {
  CUSTOM_FIELD_OBJECT_TYPES,
  CUSTOM_FIELD_TARGET_LEVELS,
  getTenantCustomFieldCatalog,
} from "@/lib/domain/custom-fields";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RawRow = Record<string, unknown>;
type DbErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

const SAFE_LIST_LIMIT = 2000;

const TABLES = {
  intFieldBindings: "int_field_bindings",
  definitions: "cfg_custom_field_definitions",
} as const;

export const INT_FIELD_BINDING_DIRECTION_MODES = [
  "read",
  "write",
  "bidirectional_candidate",
] as const;

export type IntFieldBindingDirectionMode =
  (typeof INT_FIELD_BINDING_DIRECTION_MODES)[number];

export const INT_FIELD_BINDING_STATUSES = ["draft", "active", "disabled"] as const;
export type IntFieldBindingStatus = (typeof INT_FIELD_BINDING_STATUSES)[number];

export const INT_FIELD_BINDING_SYNC_MODES = [
  "bootstrap",
  "manual",
  "scheduled",
  "event_driven",
] as const;

export type IntFieldBindingSyncMode = (typeof INT_FIELD_BINDING_SYNC_MODES)[number];

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

const parseBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on", "y"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off", "n"].includes(normalized)) {
      return false;
    }
  }
  return null;
};

const normalizeCode = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

const looksLikeMissingTable = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes("column") && normalized.includes("schema cache")) {
    return false;
  }
  return normalized.includes("could not find the table");
};

const looksLikeSchemaColumnMismatch = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes("column") && normalized.includes("schema cache");
};

const formatDbError = (error: DbErrorLike) => {
  const chunks = [error.message, error.details, error.hint]
    .map((item) => `${item ?? ""}`.trim())
    .filter(Boolean);
  const fullMessage = chunks.length > 0 ? chunks.join(" | ") : "Unknown query error";
  return {
    fullMessage,
    code: `${error.code ?? ""}`.trim() || null,
  };
};

const normalizeDirectionMode = (
  value: string,
): IntFieldBindingDirectionMode | null => {
  const normalized = value.trim().toLowerCase();
  if (
    INT_FIELD_BINDING_DIRECTION_MODES.includes(
      normalized as IntFieldBindingDirectionMode,
    )
  ) {
    return normalized as IntFieldBindingDirectionMode;
  }
  if (normalized === "read_only") {
    return "read";
  }
  if (normalized === "write_only") {
    return "write";
  }
  if (normalized === "bidirectional") {
    return "bidirectional_candidate";
  }
  return null;
};

const toLegacyDirectionMode = (value: IntFieldBindingDirectionMode) => {
  if (value === "read") {
    return "read_only";
  }
  if (value === "write") {
    return "write_only";
  }
  return "bidirectional";
};

const normalizeStatus = (value: string): IntFieldBindingStatus | null => {
  const normalized = value.trim().toLowerCase();
  if (INT_FIELD_BINDING_STATUSES.includes(normalized as IntFieldBindingStatus)) {
    return normalized as IntFieldBindingStatus;
  }
  return null;
};

const normalizeSyncMode = (value: string): IntFieldBindingSyncMode | null => {
  const normalized = value.trim().toLowerCase();
  if (INT_FIELD_BINDING_SYNC_MODES.includes(normalized as IntFieldBindingSyncMode)) {
    return normalized as IntFieldBindingSyncMode;
  }
  return null;
};

const normalizeObjectType = (value: string) => {
  if (
    CUSTOM_FIELD_OBJECT_TYPES.includes(
      value as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number],
    )
  ) {
    return value as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number];
  }
  return null;
};

const normalizeTargetLevel = (value: string) => {
  if (
    CUSTOM_FIELD_TARGET_LEVELS.includes(
      value as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number],
    )
  ) {
    return value as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number];
  }
  return null;
};

const boolFromRow = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = parseBoolean(row[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
};

const stringFromRow = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = parseString(row[key]);
    if (value) {
      return value;
    }
  }
  return "";
};

export type IntFieldBindingSummary = {
  id: string;
  code: string;
  status: IntFieldBindingStatus;
  isEnabled: boolean;
  customFieldDefinitionId: string;
  customFieldCode: string | null;
  customFieldLabel: string | null;
  objectTypeCode: string;
  targetLevel: "header" | "line";
  lineContextType: string | null;
  sourceSystemCode: string;
  erpEntitySet: string;
  erpObjectType: string;
  erpFieldName: string;
  erpIsUdf: boolean;
  directionMode: IntFieldBindingDirectionMode;
  syncMode: IntFieldBindingSyncMode;
  createdAt: string | null;
  updatedAt: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};

export type IntFieldBindingCatalogResult = {
  bindings: IntFieldBindingSummary[];
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

type DefinitionLookup = {
  code: string;
  label: string;
  targetLevel: "header" | "line";
};

const loadDefinitionLookup = async (tenantId: string) => {
  const warnings: string[] = [];
  const lookup = new Map<string, DefinitionLookup>();

  const catalog = await getTenantCustomFieldCatalog(tenantId);
  if (catalog.error) {
    warnings.push(`Catalogo definizioni non disponibile: ${catalog.error}`);
    return {
      lookup,
      warnings,
    };
  }

  catalog.definitions.forEach((definition) => {
    lookup.set(definition.definitionId, {
      code: definition.code,
      label: definition.label,
      targetLevel: definition.targetLevel,
    });
  });

  return {
    lookup,
    warnings,
  };
};

const mapBindingRow = (
  row: RawRow,
  definitionLookup: Map<string, DefinitionLookup>,
): IntFieldBindingSummary | null => {
  const id = parseString(row.id);
  if (!id) {
    return null;
  }

  const status =
    normalizeStatus(
      stringFromRow(row, ["status", "binding_status"]) || "draft",
    ) ?? "draft";

  const customFieldDefinitionId = stringFromRow(row, [
    "app_field_definition_id",
    "custom_field_definition_id",
  ]);
  if (!customFieldDefinitionId) {
    return null;
  }

  const objectTypeCode = stringFromRow(row, ["object_type_code"]);
  const targetLevel =
    normalizeTargetLevel(stringFromRow(row, ["target_level"])) ?? "header";
  const directionMode =
    normalizeDirectionMode(stringFromRow(row, ["direction_mode"])) ?? "read";
  const syncMode =
    normalizeSyncMode(stringFromRow(row, ["sync_mode"])) ?? "manual";

  const definition = definitionLookup.get(customFieldDefinitionId) ?? null;
  const externalIdentifier = stringFromRow(row, [
    "external_field_identifier",
    "erp_field_name",
  ]);

  return {
    id,
    code: parseString(row.code) || externalIdentifier || id,
    status,
    isEnabled:
      boolFromRow(row, ["is_enabled"]) ?? (status === "active" || status === "draft"),
    customFieldDefinitionId,
    customFieldCode: definition?.code ?? null,
    customFieldLabel: definition?.label ?? null,
    objectTypeCode: objectTypeCode || "unknown",
    targetLevel,
    lineContextType: parseString(row.line_context_type) || null,
    sourceSystemCode: stringFromRow(row, ["source_system_code"]) || "unknown",
    erpEntitySet: stringFromRow(row, ["erp_entity_set"]) || "unknown",
    erpObjectType: stringFromRow(row, ["erp_object_type"]) || "unknown",
    erpFieldName: externalIdentifier || "unknown",
    erpIsUdf: boolFromRow(row, ["erp_is_udf"]) ?? false,
    directionMode,
    syncMode,
    createdAt: parseString(row.created_at) || null,
    updatedAt: parseString(row.updated_at) || null,
    createdByUserId: parseString(row.created_by_user_id) || null,
    updatedByUserId: parseString(row.updated_by_user_id) || null,
  };
};

export const getTenantIntFieldBindingsCatalog = async (
  tenantId: string,
): Promise<IntFieldBindingCatalogResult> => {
  if (!tenantId) {
    return {
      bindings: [],
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Tenant non valido.",
    };
  }

  try {
    const admin = getSupabaseAdminClient();
    const { lookup, warnings } = await loadDefinitionLookup(tenantId);

    const queryResult = await admin
      .from(TABLES.intFieldBindings)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(SAFE_LIST_LIMIT);

    if (queryResult.error) {
      const message = queryResult.error.message ?? "Unknown query error";
      return {
        bindings: [],
        sourceTables: [TABLES.intFieldBindings],
        warnings,
        emptyStateHint: null,
        error: looksLikeMissingTable(message)
          ? "Tabella int_field_bindings non presente nel DB esposto. Applica la baseline DB-CF-02 prima della validazione."
          : `Errore su ${TABLES.intFieldBindings}: ${message}`,
      };
    }

    const mapped = ((queryResult.data ?? []) as RawRow[])
      .map((row) => mapBindingRow(row, lookup))
      .filter((row): row is IntFieldBindingSummary => Boolean(row))
      .sort((left, right) => left.code.localeCompare(right.code, "it"));

    const unknownDefinitionRefs = mapped.filter(
      (binding) => !binding.customFieldCode,
    );
    if (unknownDefinitionRefs.length > 0) {
      warnings.push(
        `${unknownDefinitionRefs.length} binding con definizione custom field non risolta nel catalogo corrente.`,
      );
    }

    return {
      bindings: mapped,
      sourceTables: [TABLES.intFieldBindings, TABLES.definitions],
      warnings,
      emptyStateHint:
        mapped.length === 0
          ? "Nessun binding tecnico disponibile per il tenant selezionato."
          : null,
      error: null,
    };
  } catch (caughtError) {
    return {
      bindings: [],
      sourceTables: [TABLES.intFieldBindings],
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

export type CreateIntFieldBindingInput = {
  status: IntFieldBindingStatus;
  customFieldDefinitionId: string;
  objectTypeCode: string;
  targetLevel: string;
  sourceSystemCode: string;
  externalFieldIdentifier: string;
  directionMode: IntFieldBindingDirectionMode;
};

export type CreateIntFieldBindingResult = {
  bindingId: string | null;
  warnings: string[];
  error: string | null;
};

const ensureDefinitionExists = async (
  tenantId: string,
  definitionId: string,
  targetLevel: "header" | "line",
) => {
  const catalog = await getTenantCustomFieldCatalog(tenantId);
  if (catalog.error) {
    return {
      error: catalog.error,
    };
  }

  const definition = catalog.definitions.find(
    (item) => item.definitionId === definitionId,
  );

  if (!definition) {
    return {
      error: "Definizione custom field non trovata per il tenant attivo.",
    };
  }

  if (definition.targetLevel !== targetLevel) {
    return {
      error: `Target level non coerente: il campo e definito come "${definition.targetLevel}" ma il binding usa "${targetLevel}".`,
    };
  }

  return { error: null };
};

const tryInsertBinding = async (payload: Record<string, unknown>) => {
  const admin = getSupabaseAdminClient();
  return admin.from(TABLES.intFieldBindings).insert(payload as never);
};

const buildInsertPayloadVariants = (
  basePayload: Record<string, unknown>,
  directionMode: IntFieldBindingDirectionMode,
) => {
  const variants: Record<string, unknown>[] = [
    {
      ...basePayload,
      direction_mode: directionMode,
    },
    {
      ...basePayload,
      direction_mode: toLegacyDirectionMode(directionMode),
    },
  ];
  return variants;
};

export const createTenantIntFieldBinding = async (
  tenantId: string,
  _userId: string | null,
  input: CreateIntFieldBindingInput,
): Promise<CreateIntFieldBindingResult> => {
  if (!tenantId) {
    return {
      bindingId: null,
      warnings: [],
      error: "Tenant non valido.",
    };
  }

  const status = normalizeStatus(input.status);
  const objectType = normalizeObjectType(input.objectTypeCode);
  const targetLevel = normalizeTargetLevel(input.targetLevel);
  const directionMode = normalizeDirectionMode(input.directionMode);

  if (!status) {
    return {
      bindingId: null,
      warnings: [],
      error: "status non supportato.",
    };
  }
  if (!objectType) {
    return {
      bindingId: null,
      warnings: [],
      error: "object_type_code non supportato.",
    };
  }
  if (!targetLevel) {
    return {
      bindingId: null,
      warnings: [],
      error: "target_level non supportato.",
    };
  }
  if (!directionMode) {
    return {
      bindingId: null,
      warnings: [],
      error: "direction_mode non supportato.",
    };
  }

  const customFieldDefinitionId = parseString(input.customFieldDefinitionId);
  const sourceSystemCode = normalizeCode(input.sourceSystemCode);
  const externalFieldIdentifier = parseString(input.externalFieldIdentifier);

  if (!customFieldDefinitionId) {
    return {
      bindingId: null,
      warnings: [],
      error: "custom_field_definition_id obbligatorio.",
    };
  }
  if (!sourceSystemCode) {
    return {
      bindingId: null,
      warnings: [],
      error: "source_system_code obbligatorio.",
    };
  }
  if (!externalFieldIdentifier) {
    return {
      bindingId: null,
      warnings: [],
      error: "external_field_identifier obbligatorio.",
    };
  }

  const definitionCheck = await ensureDefinitionExists(
    tenantId,
    customFieldDefinitionId,
    targetLevel,
  );
  if (definitionCheck.error) {
    return {
      bindingId: null,
      warnings: [],
      error: definitionCheck.error,
    };
  }

  try {
    const bindingId = randomUUID();
    const basePayload = {
      id: bindingId,
      tenant_id: tenantId,
      custom_field_definition_id: customFieldDefinitionId,
      object_type_code: objectType,
      target_level: targetLevel,
      source_system_code: sourceSystemCode,
      external_field_identifier: externalFieldIdentifier,
      status,
    } satisfies Record<string, unknown>;

    const payloadVariants = buildInsertPayloadVariants(basePayload, directionMode);
    const variantLabels = [
      "contract-columns+direction_mode(new)",
      "contract-columns+direction_mode(legacy)",
    ];

    const attemptErrors: string[] = [];
    const warnings: string[] = [];
    let inserted = false;

    for (let index = 0; index < payloadVariants.length; index += 1) {
      const variant = payloadVariants[index];
      const attempt = await tryInsertBinding(variant);
      if (!attempt.error) {
        inserted = true;
        if (index > 0) {
          warnings.push(
            `Inserimento completato con variante mapping #${index + 1}: ${variantLabels[index] ?? "alt-mapping"}.`,
          );
        }
        break;
      }

      const { fullMessage, code } = formatDbError(attempt.error);
      attemptErrors.push(
        `Attempt #${index + 1} (${variantLabels[index] ?? "alt-mapping"}): ${fullMessage}${code ? ` [code=${code}]` : ""}`,
      );
    }

    if (!inserted) {
      const lastErrorMessage = attemptErrors[attemptErrors.length - 1] ?? "Unknown query error";
      const firstDbMessage = lastErrorMessage.split(": ").slice(1).join(": ") || lastErrorMessage;
      return {
        bindingId: null,
        warnings: [],
        error: looksLikeMissingTable(firstDbMessage)
          ? "Tabella int_field_bindings non presente nel DB esposto."
          : looksLikeSchemaColumnMismatch(firstDbMessage)
            ? `Mismatch colonne int_field_bindings nel runtime POST: ${attemptErrors.join(" || ")}`
            : `Errore insert ${TABLES.intFieldBindings}: ${attemptErrors.join(" || ")}`,
      };
    }

    return {
      bindingId,
      warnings,
      error: null,
    };
  } catch (caughtError) {
    return {
      bindingId: null,
      warnings: [],
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};
