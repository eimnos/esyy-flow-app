import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type CommessaDocumentsFilters = {
  q?: string;
  documentType?: string;
  status?: string;
  origin?: string;
};

export type CommessaDocumentItem = {
  id: string;
  tenantId: string;
  commessaId: string;
  title: string;
  code: string | null;
  documentType: string;
  status: string;
  origin: string;
  isStructured: boolean;
  hasAttachment: boolean;
  attachmentName: string | null;
  fileUrl: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  relatedEntityCode: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  sourceTable: string;
};

export type CommessaDocumentsResult = {
  documents: CommessaDocumentItem[];
  documentTypes: string[];
  statuses: string[];
  origins: string[];
  sourceTables: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

type RawRow = Record<string, unknown>;

type DocumentTableCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  parentColumns: string[];
  titleColumns: string[];
  codeColumns: string[];
  typeColumns: string[];
  statusColumns: string[];
  originColumns: string[];
  structuredColumns: string[];
  attachmentColumns: string[];
  attachmentNameColumns: string[];
  fileUrlColumns: string[];
  relatedTypeColumns: string[];
  relatedIdColumns: string[];
  relatedCodeColumns: string[];
  createdAtColumns: string[];
  updatedAtColumns: string[];
  defaultType: string;
  defaultOrigin: string;
};

type QueryRowsResult = {
  exists: boolean;
  rows: RawRow[];
  warning: string | null;
};

const SAFE_LIST_LIMIT = 1200;

const TABLE_CANDIDATES: DocumentTableCandidate[] = [
  {
    table: "project_documents",
    idColumns: ["id", "project_document_id", "document_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    titleColumns: ["title", "name", "document_name", "subject", "description"],
    codeColumns: ["document_no", "code", "reference_no", "doc_no"],
    typeColumns: ["document_type", "type", "doc_type", "category"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    originColumns: ["origin", "source", "source_system", "created_from"],
    structuredColumns: ["is_structured", "structured_document", "has_payload", "is_document"],
    attachmentColumns: ["has_attachment", "has_file", "attachment_count", "file_count"],
    attachmentNameColumns: ["attachment_name", "file_name", "original_file_name", "storage_file_name"],
    fileUrlColumns: ["file_url", "storage_url", "download_url", "public_url", "storage_path", "path"],
    relatedTypeColumns: ["related_object_type", "entity_type", "linked_object_type", "source_type"],
    relatedIdColumns: [
      "related_object_id",
      "entity_id",
      "linked_object_id",
      "source_id",
      "production_order_id",
      "sales_order_id",
    ],
    relatedCodeColumns: [
      "related_object_code",
      "entity_code",
      "linked_object_code",
      "source_code",
      "production_order_no",
      "sales_order_no",
    ],
    createdAtColumns: ["created_at", "issued_at", "document_date"],
    updatedAtColumns: ["updated_at", "last_updated_at", "modified_at"],
    defaultType: "documento",
    defaultOrigin: "project_documents",
  },
  {
    table: "project_attachments",
    idColumns: ["id", "project_attachment_id", "attachment_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    titleColumns: ["title", "name", "description", "note", "file_name"],
    codeColumns: ["code", "document_no", "reference_no"],
    typeColumns: ["attachment_type", "document_type", "type", "category"],
    statusColumns: ["status", "state", "workflow_status"],
    originColumns: ["origin", "source", "source_system"],
    structuredColumns: ["is_structured", "structured_document"],
    attachmentColumns: ["has_attachment", "has_file", "is_attachment", "file_count"],
    attachmentNameColumns: ["file_name", "attachment_name", "original_file_name", "storage_file_name"],
    fileUrlColumns: ["file_url", "storage_url", "download_url", "public_url", "storage_path", "path"],
    relatedTypeColumns: ["related_object_type", "entity_type", "linked_object_type"],
    relatedIdColumns: [
      "related_object_id",
      "entity_id",
      "linked_object_id",
      "source_id",
      "production_order_id",
      "sales_order_id",
    ],
    relatedCodeColumns: [
      "related_object_code",
      "entity_code",
      "linked_object_code",
      "source_code",
      "production_order_no",
      "sales_order_no",
    ],
    createdAtColumns: ["created_at", "uploaded_at"],
    updatedAtColumns: ["updated_at", "modified_at"],
    defaultType: "allegato",
    defaultOrigin: "project_attachments",
  },
  {
    table: "project_events",
    idColumns: ["id", "project_event_id", "event_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    titleColumns: ["title", "event_title", "description", "message", "note"],
    codeColumns: ["document_no", "code", "reference_no"],
    typeColumns: ["document_type", "event_type", "type", "category"],
    statusColumns: ["status", "state", "severity"],
    originColumns: ["origin", "source", "source_system"],
    structuredColumns: ["is_structured_document", "is_document_event"],
    attachmentColumns: ["has_attachment", "attachment_count", "file_count"],
    attachmentNameColumns: ["attachment_name", "file_name", "original_file_name"],
    fileUrlColumns: ["file_url", "download_url", "public_url", "storage_url", "storage_path"],
    relatedTypeColumns: ["related_object_type", "entity_type", "linked_object_type"],
    relatedIdColumns: [
      "related_object_id",
      "entity_id",
      "linked_object_id",
      "source_id",
      "production_order_id",
      "sales_order_id",
    ],
    relatedCodeColumns: [
      "related_object_code",
      "entity_code",
      "linked_object_code",
      "source_code",
      "production_order_no",
      "sales_order_no",
    ],
    createdAtColumns: ["event_at", "created_at", "occurred_at"],
    updatedAtColumns: ["updated_at"],
    defaultType: "evento",
    defaultOrigin: "project_events",
  },
  {
    table: "project_overviews",
    idColumns: ["id", "project_overview_id", "project_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    titleColumns: ["title", "name", "project_name", "description"],
    codeColumns: ["code", "project_code", "document_no"],
    typeColumns: ["document_type", "type", "category"],
    statusColumns: ["status", "state", "workflow_status"],
    originColumns: ["origin", "source", "source_system"],
    structuredColumns: ["is_structured", "structured_document"],
    attachmentColumns: ["has_attachment", "attachment_count", "file_count"],
    attachmentNameColumns: ["attachment_name", "file_name", "original_file_name"],
    fileUrlColumns: ["file_url", "download_url", "public_url", "storage_url"],
    relatedTypeColumns: ["related_object_type", "entity_type", "linked_object_type"],
    relatedIdColumns: [
      "related_object_id",
      "entity_id",
      "linked_object_id",
      "source_id",
      "production_order_id",
      "sales_order_id",
    ],
    relatedCodeColumns: [
      "related_object_code",
      "entity_code",
      "linked_object_code",
      "source_code",
      "production_order_no",
      "sales_order_no",
    ],
    createdAtColumns: ["created_at", "event_at", "updated_at"],
    updatedAtColumns: ["updated_at", "last_updated_at"],
    defaultType: "overview",
    defaultOrigin: "project_overviews",
  },
  {
    table: "documents",
    idColumns: ["id", "document_id"],
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id", "entity_id", "source_id"],
    titleColumns: ["title", "name", "document_name", "subject", "description"],
    codeColumns: ["document_no", "code", "reference_no", "doc_no"],
    typeColumns: ["document_type", "type", "doc_type", "category"],
    statusColumns: ["status", "state", "workflow_status", "lifecycle_status"],
    originColumns: ["origin", "source", "source_system", "created_from"],
    structuredColumns: ["is_structured", "structured_document", "has_payload", "is_document"],
    attachmentColumns: ["has_attachment", "has_file", "attachment_count", "file_count"],
    attachmentNameColumns: ["attachment_name", "file_name", "original_file_name", "storage_file_name"],
    fileUrlColumns: ["file_url", "storage_url", "download_url", "public_url", "storage_path", "path"],
    relatedTypeColumns: ["related_object_type", "entity_type", "linked_object_type", "source_type"],
    relatedIdColumns: [
      "related_object_id",
      "entity_id",
      "linked_object_id",
      "source_id",
      "production_order_id",
      "sales_order_id",
      "project_id",
    ],
    relatedCodeColumns: [
      "related_object_code",
      "entity_code",
      "linked_object_code",
      "source_code",
      "production_order_no",
      "sales_order_no",
      "project_code",
    ],
    createdAtColumns: ["created_at", "issued_at", "document_date"],
    updatedAtColumns: ["updated_at", "last_updated_at", "modified_at"],
    defaultType: "documento",
    defaultOrigin: "documents",
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
    if (["true", "1", "yes", "y", "enabled", "active", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "disabled", "inactive", "off"].includes(normalized)) {
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

const readBooleanFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = parseBoolean(row[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
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

const queryCandidateRows = async (
  candidate: DocumentTableCandidate,
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
    const rowProject = readStringFromKeys(row, candidate.parentColumns);
    return rowTenant === tenantId && rowProject === commessaId;
  });

  return {
    exists: true,
    rows: scopedRows,
    warning: null,
  };
};

const normalizeTextToken = (value: string | null, fallback: string) => {
  if (!value || value.trim().length === 0) {
    return fallback;
  }
  return value.trim();
};

const normalizeDocument = (
  row: RawRow,
  candidate: DocumentTableCandidate,
  tenantId: string,
  commessaId: string,
  rowIndex: number,
): CommessaDocumentItem | null => {
  const normalizedId = readStringFromKeys(row, candidate.idColumns);
  const id = normalizedId || `${candidate.table}-${commessaId}-${rowIndex}`;
  if (!id) {
    return null;
  }

  const rowTenant = readStringFromKeys(row, candidate.tenantColumns) || tenantId;
  const title =
    readStringFromKeys(row, candidate.titleColumns) ||
    readStringFromKeys(row, candidate.codeColumns) ||
    `Documento ${rowIndex + 1}`;

  const code = readStringFromKeys(row, candidate.codeColumns) || null;
  const documentType = normalizeTextToken(
    readStringFromKeys(row, candidate.typeColumns) || null,
    candidate.defaultType,
  );
  const status = normalizeTextToken(readStringFromKeys(row, candidate.statusColumns) || null, "unknown");
  const origin = normalizeTextToken(
    readStringFromKeys(row, candidate.originColumns) || null,
    candidate.defaultOrigin,
  );

  const structuredFlag = readBooleanFromKeys(row, candidate.structuredColumns);
  const attachmentFlag = readBooleanFromKeys(row, candidate.attachmentColumns);
  const attachmentCount = readNumberFromKeys(row, candidate.attachmentColumns);
  const attachmentName = readStringFromKeys(row, candidate.attachmentNameColumns) || null;
  const fileUrl = readStringFromKeys(row, candidate.fileUrlColumns) || null;
  const hasAttachmentEvidence =
    attachmentFlag === true ||
    (attachmentCount !== null && attachmentCount > 0) ||
    Boolean(attachmentName) ||
    Boolean(fileUrl);
  const hasAttachment = attachmentFlag === null ? hasAttachmentEvidence : attachmentFlag || hasAttachmentEvidence;
  const isStructured =
    structuredFlag === null ? !hasAttachmentEvidence || candidate.table === "project_documents" : structuredFlag;

  const relatedEntityType = readStringFromKeys(row, candidate.relatedTypeColumns) || null;
  const relatedEntityId = readStringFromKeys(row, candidate.relatedIdColumns) || null;
  const relatedEntityCode = readStringFromKeys(row, candidate.relatedCodeColumns) || null;

  return {
    id,
    tenantId: rowTenant,
    commessaId,
    title,
    code,
    documentType,
    status,
    origin,
    isStructured,
    hasAttachment,
    attachmentName,
    fileUrl,
    relatedEntityType,
    relatedEntityId,
    relatedEntityCode,
    createdAt: readDateTextFromKeys(row, candidate.createdAtColumns),
    updatedAt: readDateTextFromKeys(row, candidate.updatedAtColumns),
    sourceTable: candidate.table,
  };
};

const applyFilters = (documents: CommessaDocumentItem[], filters: CommessaDocumentsFilters) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const type = (filters.documentType ?? "all").trim().toLowerCase();
  const status = (filters.status ?? "all").trim().toLowerCase();
  const origin = (filters.origin ?? "all").trim().toLowerCase();

  return documents.filter((document) => {
    if (query) {
      const haystack = [
        document.title,
        document.code ?? "",
        document.documentType,
        document.status,
        document.origin,
        document.relatedEntityCode ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (type !== "all" && document.documentType.toLowerCase() !== type) {
      return false;
    }

    if (status !== "all" && document.status.toLowerCase() !== status) {
      return false;
    }

    if (origin !== "all" && document.origin.toLowerCase() !== origin) {
      return false;
    }

    return true;
  });
};

const uniqueValues = (items: string[]) =>
  [...new Set(items.map((item) => item.trim()).filter((item) => item.length > 0))].sort((left, right) =>
    left.localeCompare(right, "it"),
  );

const safeDateValue = (value: string | null) => {
  if (!value) {
    return -1;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return -1;
  }
  return parsed.getTime();
};

const sortDocuments = (documents: CommessaDocumentItem[]) =>
  [...documents].sort((left, right) => {
    const leftDate = safeDateValue(left.updatedAt ?? left.createdAt);
    const rightDate = safeDateValue(right.updatedAt ?? right.createdAt);
    if (leftDate !== rightDate) {
      return rightDate - leftDate;
    }

    const byType = left.documentType.localeCompare(right.documentType, "it");
    if (byType !== 0) {
      return byType;
    }

    return left.title.localeCompare(right.title, "it");
  });

const dedupeDocuments = (documents: CommessaDocumentItem[]) => {
  const seen = new Set<string>();
  return documents.filter((document) => {
    const key = `${document.sourceTable}:${document.id}:${document.documentType}:${document.title}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const buildDocuments = async (
  tenantId: string,
  commessaId: string,
  filters: CommessaDocumentsFilters,
): Promise<CommessaDocumentsResult> => {
  const warnings: string[] = [];
  const sourceTables = new Set<string>();
  const allDocuments: CommessaDocumentItem[] = [];

  for (const candidate of TABLE_CANDIDATES) {
    const queryResult = await queryCandidateRows(candidate, tenantId, commessaId, SAFE_LIST_LIMIT);
    if (queryResult.warning) {
      warnings.push(queryResult.warning);
    }
    if (!queryResult.exists) {
      continue;
    }

    sourceTables.add(candidate.table);
    queryResult.rows.forEach((row, index) => {
      const normalized = normalizeDocument(row, candidate, tenantId, commessaId, index);
      if (normalized) {
        allDocuments.push(normalized);
      }
    });
  }

  if (sourceTables.size === 0) {
    return {
      documents: [],
      documentTypes: [],
      statuses: [],
      origins: [],
      sourceTables: [],
      warnings,
      emptyStateHint:
        "Nessuna sorgente documentale disponibile nel DB esposto per la commessa selezionata.",
      error: null,
    };
  }

  const deduped = dedupeDocuments(allDocuments);
  const sorted = sortDocuments(deduped);
  const filtered = applyFilters(sorted, filters);
  const documentTypes = uniqueValues(sorted.map((document) => document.documentType));
  const statuses = uniqueValues(sorted.map((document) => document.status));
  const origins = uniqueValues(sorted.map((document) => document.origin));

  let emptyStateHint: string | null = null;
  if (sorted.length === 0) {
    emptyStateHint = "Nessun documento collegato alla commessa nel tenant selezionato.";
  } else if (filtered.length === 0) {
    emptyStateHint = "Nessun documento trovato con i filtri correnti.";
  }

  return {
    documents: filtered,
    documentTypes,
    statuses,
    origins,
    sourceTables: [...sourceTables].sort((left, right) => left.localeCompare(right, "it")),
    warnings,
    emptyStateHint,
    error: null,
  };
};

export const getTenantCommessaDocuments = async (
  tenantId: string,
  commessaId: string,
  filters: CommessaDocumentsFilters,
): Promise<CommessaDocumentsResult> => {
  if (!tenantId || !commessaId) {
    return {
      documents: [],
      documentTypes: [],
      statuses: [],
      origins: [],
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: "Parametri non validi.",
    };
  }

  try {
    return await buildDocuments(tenantId, commessaId, filters);
  } catch (caughtError) {
    return {
      documents: [],
      documentTypes: [],
      statuses: [],
      origins: [],
      sourceTables: [],
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};
