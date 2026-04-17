import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type BinaryFilter = "all" | "yes" | "no";
export type VersionFilter = "all" | "versioned" | "no-version";

export type DibaCatalogFilters = {
  q?: string;
  status?: string;
  version?: VersionFilter;
  productLink?: BinaryFilter;
  modelLink?: BinaryFilter;
  alternatives?: BinaryFilter;
};

export type DibaListItem = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: string;
  versionNo: number | null;
  versionLabel: string;
  productId: string | null;
  productCode: string | null;
  productName: string | null;
  productionModelId: string | null;
  productionModelCode: string | null;
  productionModelName: string | null;
  optionalLines: number | null;
  alternativeLines: number | null;
  hasAlternatives: boolean;
  usageEvidence: string;
  alternativesEvidence: string;
};

export type DibaCatalogResult = {
  dibas: DibaListItem[];
  statuses: string[];
  sourceTable: string | null;
  warnings: string[];
  error: string | null;
};

type RawRow = Record<string, unknown>;

type FamilyCandidate = {
  table: string;
  idColumns: string[];
  tenantColumns: string[];
  codeColumns: string[];
  nameColumns: string[];
  statusColumns: string[];
  productColumns: string[];
  modelColumns: string[];
  currentVersionColumns: string[];
  versions: VersionCandidate[];
};

type VersionCandidate = {
  table: string;
  idColumns: string[];
  parentColumns: string[];
  tenantColumns: string[];
  versionColumns: string[];
  statusColumns: string[];
  isCurrentColumns: string[];
  modelColumns: string[];
  lines: LineCandidate[];
};

type LineCandidate = {
  table: string;
  parentColumns: string[];
  tenantColumns: string[];
  optionalColumns: string[];
  alternativeColumns: string[];
  alternativeGroupColumns: string[];
};

type VersionSelection = {
  versionId: string | null;
  versionNo: number | null;
  status: string | null;
  modelId: string | null;
};

type LineEvidence = {
  optionalLines: number;
  alternativeLines: number;
};

const SAFE_LIST_LIMIT = 800;

const VERSIONED_FAMILIES: FamilyCandidate[] = [
  {
    table: "bom_templates",
    idColumns: ["id", "bom_template_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["code", "bom_code", "template_code"],
    nameColumns: ["name", "description", "title"],
    statusColumns: ["status", "state", "lifecycle_status", "is_active"],
    productColumns: ["product_id", "item_id", "product_item_id"],
    modelColumns: ["production_model_id", "model_id"],
    currentVersionColumns: ["current_version_no"],
    versions: [
      {
        table: "bom_template_versions",
        idColumns: ["id", "bom_template_version_id"],
        parentColumns: ["bom_template_id", "template_id"],
        tenantColumns: ["tenant_id"],
        versionColumns: ["version_no", "revision_no", "version"],
        statusColumns: ["status", "state", "lifecycle_status", "is_active"],
        isCurrentColumns: ["is_current", "current_flag"],
        modelColumns: ["production_model_id", "model_id"],
        lines: [
          {
            table: "bom_template_version_lines",
            parentColumns: ["bom_template_version_id", "version_id"],
            tenantColumns: ["tenant_id"],
            optionalColumns: ["is_optional", "optional_flag", "is_option"],
            alternativeColumns: [
              "is_alternative",
              "has_alternative",
              "is_substitute",
              "allow_substitute",
            ],
            alternativeGroupColumns: [
              "alternative_group_code",
              "alternative_group",
              "substitute_group_code",
            ],
          },
        ],
      },
    ],
  },
  {
    table: "diba_templates",
    idColumns: ["id", "diba_template_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["code", "diba_code", "template_code"],
    nameColumns: ["name", "description", "title"],
    statusColumns: ["status", "state", "lifecycle_status", "is_active"],
    productColumns: ["product_id", "item_id", "product_item_id"],
    modelColumns: ["production_model_id", "model_id"],
    currentVersionColumns: ["current_version_no"],
    versions: [
      {
        table: "diba_template_versions",
        idColumns: ["id", "diba_template_version_id"],
        parentColumns: ["diba_template_id", "template_id"],
        tenantColumns: ["tenant_id"],
        versionColumns: ["version_no", "revision_no", "version"],
        statusColumns: ["status", "state", "lifecycle_status", "is_active"],
        isCurrentColumns: ["is_current", "current_flag"],
        modelColumns: ["production_model_id", "model_id"],
        lines: [
          {
            table: "diba_template_version_lines",
            parentColumns: ["diba_template_version_id", "version_id"],
            tenantColumns: ["tenant_id"],
            optionalColumns: ["is_optional", "optional_flag", "is_option"],
            alternativeColumns: [
              "is_alternative",
              "has_alternative",
              "is_substitute",
              "allow_substitute",
            ],
            alternativeGroupColumns: [
              "alternative_group_code",
              "alternative_group",
              "substitute_group_code",
            ],
          },
        ],
      },
    ],
  },
  {
    table: "product_boms",
    idColumns: ["id", "product_bom_id", "bom_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["code", "bom_code"],
    nameColumns: ["name", "description", "title"],
    statusColumns: ["status", "state", "lifecycle_status", "is_active"],
    productColumns: ["product_id", "item_id", "product_item_id"],
    modelColumns: ["production_model_id", "model_id"],
    currentVersionColumns: ["current_version_no"],
    versions: [
      {
        table: "product_bom_versions",
        idColumns: ["id", "product_bom_version_id", "bom_version_id"],
        parentColumns: ["product_bom_id", "bom_id"],
        tenantColumns: ["tenant_id"],
        versionColumns: ["version_no", "revision_no", "version"],
        statusColumns: ["status", "state", "lifecycle_status", "is_active"],
        isCurrentColumns: ["is_current", "current_flag"],
        modelColumns: ["production_model_id", "model_id"],
        lines: [
          {
            table: "product_bom_version_lines",
            parentColumns: ["product_bom_version_id", "bom_version_id", "version_id"],
            tenantColumns: ["tenant_id"],
            optionalColumns: ["is_optional", "optional_flag", "is_option"],
            alternativeColumns: [
              "is_alternative",
              "has_alternative",
              "is_substitute",
              "allow_substitute",
            ],
            alternativeGroupColumns: [
              "alternative_group_code",
              "alternative_group",
              "substitute_group_code",
            ],
          },
        ],
      },
    ],
  },
  {
    table: "boms",
    idColumns: ["id", "bom_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["code", "bom_code"],
    nameColumns: ["name", "description", "title"],
    statusColumns: ["status", "state", "lifecycle_status", "is_active"],
    productColumns: ["product_id", "item_id", "product_item_id"],
    modelColumns: ["production_model_id", "model_id"],
    currentVersionColumns: ["current_version_no"],
    versions: [
      {
        table: "bom_versions",
        idColumns: ["id", "bom_version_id"],
        parentColumns: ["bom_id"],
        tenantColumns: ["tenant_id"],
        versionColumns: ["version_no", "revision_no", "version"],
        statusColumns: ["status", "state", "lifecycle_status", "is_active"],
        isCurrentColumns: ["is_current", "current_flag"],
        modelColumns: ["production_model_id", "model_id"],
        lines: [
          {
            table: "bom_version_lines",
            parentColumns: ["bom_version_id", "version_id"],
            tenantColumns: ["tenant_id"],
            optionalColumns: ["is_optional", "optional_flag", "is_option"],
            alternativeColumns: [
              "is_alternative",
              "has_alternative",
              "is_substitute",
              "allow_substitute",
            ],
            alternativeGroupColumns: [
              "alternative_group_code",
              "alternative_group",
              "substitute_group_code",
            ],
          },
        ],
      },
    ],
  },
];

const MODEL_TABLE_CANDIDATES = [
  {
    table: "production_models",
    idColumns: ["id", "production_model_id", "model_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["code", "model_code"],
    nameColumns: ["name", "description", "title"],
  },
  {
    table: "production_model_versions",
    idColumns: ["id", "production_model_id", "model_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["code", "model_code"],
    nameColumns: ["name", "description", "title"],
  },
];

const parseString = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "";
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
    if (["true", "1", "yes", "y", "enabled", "active"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "disabled", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return null;
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

const readFromKeys = (row: RawRow, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return null;
};

const readStringFromKeys = (row: RawRow, keys: string[]) => {
  const value = readFromKeys(row, keys);
  return parseString(value);
};

const normalizeStatus = (row: RawRow, keys: string[]) => {
  const value = readFromKeys(row, keys);

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : "unknown";
  }

  if (typeof value === "boolean") {
    return value ? "active" : "inactive";
  }

  if (typeof value === "number") {
    return value > 0 ? "active" : "inactive";
  }

  return "unknown";
};

const normalizeBinaryFilter = (value: string | undefined): BinaryFilter => {
  if (value === "yes" || value === "no") {
    return value;
  }
  return "all";
};

const normalizeVersionFilter = (value: string | undefined): VersionFilter => {
  if (value === "versioned" || value === "no-version") {
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

const buildUsageEvidence = (
  productCode: string | null,
  productName: string | null,
  productId: string | null,
) => {
  if (productCode) {
    return productName ? `${productCode} · ${productName}` : productCode;
  }

  if (productId) {
    return productId;
  }

  return "N/D";
};

const buildAlternativesEvidence = (
  optionalLines: number | null,
  alternativeLines: number | null,
) => {
  if (optionalLines === null || alternativeLines === null) {
    return "N/D";
  }

  return `opzionali ${optionalLines} · alternative ${alternativeLines}`;
};

const pickBestVersion = (rows: RawRow[], candidate: VersionCandidate): RawRow | null => {
  if (rows.length === 0) {
    return null;
  }

  const current = rows.find((row) => parseBoolean(readFromKeys(row, candidate.isCurrentColumns)));
  if (current) {
    return current;
  }

  const byVersion = [...rows]
    .map((row) => ({ row, versionNo: parseNumber(readFromKeys(row, candidate.versionColumns)) }))
    .sort((a, b) => (b.versionNo ?? -1) - (a.versionNo ?? -1));

  if (byVersion[0]?.row) {
    return byVersion[0].row;
  }

  return rows[0];
};

const fetchFamilyRows = async (candidate: FamilyCandidate, tenantId: string) => {
  const admin = getSupabaseAdminClient();

  for (const tenantColumn of candidate.tenantColumns) {
    const { data, error } = await admin
      .from(candidate.table)
      .select("*")
      .eq(tenantColumn, tenantId)
      .limit(SAFE_LIST_LIMIT);

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

  const fallback = await admin.from(candidate.table).select("*").limit(SAFE_LIST_LIMIT);
  if (fallback.error) {
    const message = fallback.error.message ?? "Unknown query error";
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

  const rows = ((fallback.data ?? []) as RawRow[]).filter((row) => {
    const scopedTenant = readStringFromKeys(row, candidate.tenantColumns);
    return scopedTenant === tenantId;
  });

  return {
    exists: true,
    rows,
    warning: null as string | null,
  };
};

const resolveFamilySnapshot = async (tenantId: string) => {
  const warnings: string[] = [];
  const families: Array<{ candidate: FamilyCandidate; rows: RawRow[] }> = [];

  for (const candidate of VERSIONED_FAMILIES) {
    const result = await fetchFamilyRows(candidate, tenantId);
    if (result.warning) {
      warnings.push(result.warning);
    }
    if (!result.exists) {
      continue;
    }
    families.push({ candidate, rows: result.rows });
  }

  if (families.length === 0) {
    return {
      sourceTable: null as string | null,
      candidate: null as FamilyCandidate | null,
      rows: [] as RawRow[],
      warnings,
    };
  }

  families.sort((a, b) => b.rows.length - a.rows.length);
  return {
    sourceTable: families[0].candidate.table,
    candidate: families[0].candidate,
    rows: families[0].rows,
    warnings,
  };
};

const resolveVersionInfo = async (
  tenantId: string,
  familyIds: string[],
  family: FamilyCandidate,
) => {
  const admin = getSupabaseAdminClient();

  for (const versionCandidate of family.versions) {
    for (const parentColumn of versionCandidate.parentColumns) {
      let versionRows: RawRow[] = [];
      let queryWorked = false;

      for (const tenantColumn of versionCandidate.tenantColumns) {
        const { data, error } = await admin
          .from(versionCandidate.table)
          .select("*")
          .in(parentColumn, familyIds)
          .eq(tenantColumn, tenantId)
          .limit(SAFE_LIST_LIMIT);

        if (!error) {
          versionRows = (data ?? []) as RawRow[];
          queryWorked = true;
          break;
        }

        const message = error.message ?? "Unknown query error";
        if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, parentColumn)) {
          queryWorked = false;
          break;
        }
        if (looksLikeMissingColumn(message, tenantColumn)) {
          continue;
        }

        queryWorked = false;
        break;
      }

      if (!queryWorked) {
        continue;
      }

      const versionsByParent = new Map<string, VersionSelection>();
      const versionIds: string[] = [];

      for (const familyId of familyIds) {
        const matches = versionRows.filter(
          (row) => readStringFromKeys(row, [parentColumn]) === familyId,
        );
        const best = pickBestVersion(matches, versionCandidate);
        if (!best) {
          continue;
        }

        const versionId = readStringFromKeys(best, versionCandidate.idColumns) || null;
        const versionNo = parseNumber(readFromKeys(best, versionCandidate.versionColumns));
        const status = normalizeStatus(best, versionCandidate.statusColumns);
        const modelId = readStringFromKeys(best, versionCandidate.modelColumns) || null;

        versionsByParent.set(familyId, {
          versionId,
          versionNo,
          status,
          modelId,
        });

        if (versionId) {
          versionIds.push(versionId);
        }
      }

      const lineEvidence = await resolveLineEvidence(
        tenantId,
        versionIds,
        versionCandidate,
      );

      return {
        versionsByParent,
        lineEvidenceByVersion: lineEvidence,
      };
    }
  }

  return {
    versionsByParent: new Map<string, VersionSelection>(),
    lineEvidenceByVersion: new Map<string, LineEvidence>(),
  };
};

const resolveLineEvidence = async (
  tenantId: string,
  versionIds: string[],
  versionCandidate: VersionCandidate,
) => {
  const admin = getSupabaseAdminClient();
  const evidenceMap = new Map<string, LineEvidence>();

  if (versionIds.length === 0) {
    return evidenceMap;
  }

  for (const lineCandidate of versionCandidate.lines) {
    for (const parentColumn of lineCandidate.parentColumns) {
      for (const tenantColumn of lineCandidate.tenantColumns) {
        const { data, error } = await admin
          .from(lineCandidate.table)
          .select("*")
          .in(parentColumn, versionIds)
          .eq(tenantColumn, tenantId)
          .limit(SAFE_LIST_LIMIT);

        if (error) {
          const message = error.message ?? "Unknown query error";
          if (
            looksLikeMissingTable(message) ||
            looksLikeMissingColumn(message, parentColumn) ||
            looksLikeMissingColumn(message, tenantColumn)
          ) {
            continue;
          }
          continue;
        }

        for (const row of (data ?? []) as RawRow[]) {
          const versionId = readStringFromKeys(row, [parentColumn]);
          if (!versionId) {
            continue;
          }

          const current = evidenceMap.get(versionId) ?? {
            optionalLines: 0,
            alternativeLines: 0,
          };

          const optional = parseBoolean(readFromKeys(row, lineCandidate.optionalColumns)) ?? false;
          const alternativeBoolean =
            parseBoolean(readFromKeys(row, lineCandidate.alternativeColumns)) ?? false;
          const alternativeGroup = readStringFromKeys(row, lineCandidate.alternativeGroupColumns);
          const alternative = alternativeBoolean || Boolean(alternativeGroup);

          evidenceMap.set(versionId, {
            optionalLines: current.optionalLines + (optional ? 1 : 0),
            alternativeLines: current.alternativeLines + (alternative ? 1 : 0),
          });
        }

        return evidenceMap;
      }
    }
  }

  return evidenceMap;
};

const buildLookupMap = async (
  tenantId: string,
  table: string,
  tenantColumns: string[],
  idColumns: string[],
  codeColumns: string[],
  nameColumns: string[],
) => {
  const admin = getSupabaseAdminClient();

  for (const tenantColumn of tenantColumns) {
    const { data, error } = await admin
      .from(table)
      .select("*")
      .eq(tenantColumn, tenantId)
      .limit(SAFE_LIST_LIMIT);

    if (error) {
      const message = error.message ?? "Unknown query error";
      if (looksLikeMissingTable(message) || looksLikeMissingColumn(message, tenantColumn)) {
        continue;
      }
      continue;
    }

    const map = new Map<string, { code: string | null; name: string | null }>();
    for (const row of (data ?? []) as RawRow[]) {
      const id = readStringFromKeys(row, idColumns);
      if (!id) {
        continue;
      }
      const code = readStringFromKeys(row, codeColumns) || null;
      const name = readStringFromKeys(row, nameColumns) || null;
      map.set(id, { code, name });
    }
    return map;
  }

  return new Map<string, { code: string | null; name: string | null }>();
};

const resolveProductLookup = async (tenantId: string) => {
  return buildLookupMap(
    tenantId,
    "products",
    ["tenant_id"],
    ["id"],
    ["code"],
    ["name", "description"],
  );
};

const resolveModelLookup = async (tenantId: string) => {
  for (const candidate of MODEL_TABLE_CANDIDATES) {
    const lookup = await buildLookupMap(
      tenantId,
      candidate.table,
      candidate.tenantColumns,
      candidate.idColumns,
      candidate.codeColumns,
      candidate.nameColumns,
    );

    if (lookup.size > 0) {
      return lookup;
    }
  }

  return new Map<string, { code: string | null; name: string | null }>();
};

const applyFilters = (items: DibaListItem[], filters: DibaCatalogFilters) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const status = (filters.status ?? "all").trim().toLowerCase();
  const versionFilter = normalizeVersionFilter(filters.version);
  const productFilter = normalizeBinaryFilter(filters.productLink);
  const modelFilter = normalizeBinaryFilter(filters.modelLink);
  const alternativesFilter = normalizeBinaryFilter(filters.alternatives);

  return items.filter((item) => {
    if (query) {
      const haystack =
        `${item.code} ${item.name} ${item.status} ${item.productCode ?? ""} ${item.productName ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (status !== "all" && item.status.toLowerCase() !== status) {
      return false;
    }

    if (versionFilter === "versioned" && item.versionNo === null) {
      return false;
    }
    if (versionFilter === "no-version" && item.versionNo !== null) {
      return false;
    }

    if (!matchesBinaryFilter(Boolean(item.productId), productFilter)) {
      return false;
    }

    if (!matchesBinaryFilter(Boolean(item.productionModelId), modelFilter)) {
      return false;
    }

    if (!matchesBinaryFilter(item.hasAlternatives, alternativesFilter)) {
      return false;
    }

    return true;
  });
};

const collectStatuses = (items: DibaListItem[]) => {
  return [...new Set(items.map((item) => item.status))].sort((a, b) =>
    a.localeCompare(b, "it"),
  );
};

const sortItems = (items: DibaListItem[]) => {
  return [...items].sort((left, right) => {
    const byCode = left.code.localeCompare(right.code, "it");
    if (byCode !== 0) {
      return byCode;
    }
    return left.name.localeCompare(right.name, "it");
  });
};

export const getTenantDibaCatalog = async (
  tenantId: string,
  filters: DibaCatalogFilters,
): Promise<DibaCatalogResult> => {
  if (!tenantId) {
    return {
      dibas: [],
      statuses: [],
      sourceTable: null,
      warnings: [],
      error: "Tenant non valido.",
    };
  }

  try {
    const familySnapshot = await resolveFamilySnapshot(tenantId);
    if (!familySnapshot.candidate || !familySnapshot.sourceTable) {
      return {
        dibas: [],
        statuses: [],
        sourceTable: null,
        warnings: familySnapshot.warnings,
        error:
          "Nessuna tabella DIBA tenant-scoped trovata nel DB esposto. Verifica naming/schema con baseline DB-00.",
      };
    }

    const family = familySnapshot.candidate;
    const familyRows = familySnapshot.rows;

    const productLookup = await resolveProductLookup(tenantId);
    const modelLookup = await resolveModelLookup(tenantId);

    const familyIds = familyRows
      .map((row) => readStringFromKeys(row, family.idColumns))
      .filter(Boolean);

    const versionInfo = await resolveVersionInfo(tenantId, familyIds, family);

    const items: DibaListItem[] = familyRows
      .map((row) => {
        const id = readStringFromKeys(row, family.idColumns);
        if (!id) {
          return null;
        }

        const tenantRowId = readStringFromKeys(row, family.tenantColumns) || tenantId;
        const code = readStringFromKeys(row, family.codeColumns) || id;
        const name = readStringFromKeys(row, family.nameColumns) || code;

        const familyStatus = normalizeStatus(row, family.statusColumns);
        const familyVersionNo = parseNumber(readFromKeys(row, family.currentVersionColumns));
        const familyModelId = readStringFromKeys(row, family.modelColumns) || null;
        const productId = readStringFromKeys(row, family.productColumns) || null;

        const selectedVersion = versionInfo.versionsByParent.get(id);
        const versionNo = selectedVersion?.versionNo ?? familyVersionNo ?? null;
        const status = selectedVersion?.status ?? familyStatus;
        const modelId = selectedVersion?.modelId ?? familyModelId ?? null;

        const versionId = selectedVersion?.versionId ?? null;
        const lineEvidence = versionId
          ? versionInfo.lineEvidenceByVersion.get(versionId) ?? null
          : null;
        const optionalLines = lineEvidence?.optionalLines ?? null;
        const alternativeLines = lineEvidence?.alternativeLines ?? null;
        const hasAlternatives =
          alternativeLines !== null ? alternativeLines > 0 : Boolean(alternativeLines);

        const product = productId ? productLookup.get(productId) : null;
        const model = modelId ? modelLookup.get(modelId) : null;

        const usageEvidence = buildUsageEvidence(
          product?.code ?? null,
          product?.name ?? null,
          productId,
        );

        return {
          id,
          tenantId: tenantRowId,
          code,
          name,
          status,
          versionNo,
          versionLabel: versionNo !== null ? `v${versionNo}` : "N/D",
          productId,
          productCode: product?.code ?? null,
          productName: product?.name ?? null,
          productionModelId: modelId,
          productionModelCode: model?.code ?? null,
          productionModelName: model?.name ?? null,
          optionalLines,
          alternativeLines,
          hasAlternatives,
          usageEvidence,
          alternativesEvidence: buildAlternativesEvidence(optionalLines, alternativeLines),
        } as DibaListItem;
      })
      .filter((item): item is DibaListItem => Boolean(item));

    const sorted = sortItems(items);
    const filtered = applyFilters(sorted, filters);

    return {
      dibas: filtered,
      statuses: collectStatuses(sorted),
      sourceTable: familySnapshot.sourceTable,
      warnings: familySnapshot.warnings,
      error: null,
    };
  } catch (caughtError) {
    return {
      dibas: [],
      statuses: [],
      sourceTable: null,
      warnings: [],
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

export const getTenantDibaById = async (tenantId: string, dibaId: string) => {
  if (!tenantId || !dibaId) {
    return {
      diba: null as DibaListItem | null,
      sourceTable: null as string | null,
      warnings: [] as string[],
      error: "Parametri non validi.",
    };
  }

  const catalog = await getTenantDibaCatalog(tenantId, {});
  return {
    diba: catalog.dibas.find((item) => item.id === dibaId) ?? null,
    sourceTable: catalog.sourceTable,
    warnings: catalog.warnings,
    error: catalog.error,
  };
};
