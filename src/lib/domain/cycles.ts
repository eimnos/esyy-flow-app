import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type BinaryFilter = "all" | "yes" | "no";
export type CycleVersionFilter = "all" | "versioned" | "no-version";
export type CycleProcessType = "interno" | "misto" | "esterno" | "n/d";
export type CycleProcessTypeFilter = "all" | CycleProcessType;

export type CycleCatalogFilters = {
  q?: string;
  status?: string;
  version?: CycleVersionFilter;
  processType?: CycleProcessTypeFilter;
  quality?: BinaryFilter;
  modelLink?: BinaryFilter;
};

export type CycleListItem = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: string;
  versionNo: number | null;
  versionLabel: string;
  phaseCount: number | null;
  processType: CycleProcessType;
  hasQuality: boolean | null;
  productionModelId: string | null;
  productionModelCode: string | null;
  productionModelName: string | null;
};

export type CycleCatalogResult = {
  cycles: CycleListItem[];
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
  modelColumns: string[];
  currentVersionColumns: string[];
  processTypeColumns: string[];
  qualityColumns: string[];
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
  processTypeColumns: string[];
  qualityColumns: string[];
  phaseCountColumns: string[];
  phases: PhaseCandidate[];
};

type PhaseCandidate = {
  table: string;
  parentColumns: string[];
  tenantColumns: string[];
  processTypeColumns: string[];
  externalColumns: string[];
  qualityColumns: string[];
};

type VersionSelection = {
  versionId: string | null;
  versionNo: number | null;
  status: string | null;
  modelId: string | null;
  processType: CycleProcessType;
  hasQuality: boolean | null;
  phaseCount: number | null;
};

type PhaseStats = {
  phaseCount: number | null;
  processType: CycleProcessType;
  hasQuality: boolean | null;
};

type PhaseStatsAccumulator = {
  phaseCount: number;
  internalCount: number;
  externalCount: number;
  qualityTrueCount: number;
  qualityFalseCount: number;
};

const SAFE_LIST_LIMIT = 1000;

const CYCLE_FAMILY_CANDIDATES: FamilyCandidate[] = [
  {
    table: "routing_templates",
    idColumns: ["id", "routing_template_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["code", "routing_code", "template_code"],
    nameColumns: ["name", "description", "title"],
    statusColumns: ["status", "state", "lifecycle_status", "is_active"],
    modelColumns: ["production_model_id", "model_id"],
    currentVersionColumns: ["current_version_no"],
    processTypeColumns: ["process_type", "execution_type", "routing_type"],
    qualityColumns: ["has_quality", "quality_required", "requires_quality", "has_quality_check"],
    versions: [
      {
        table: "routing_template_versions",
        idColumns: ["id", "routing_template_version_id"],
        parentColumns: ["routing_template_id", "template_id"],
        tenantColumns: ["tenant_id"],
        versionColumns: ["version_no", "revision_no", "version"],
        statusColumns: ["status", "state", "lifecycle_status", "is_active"],
        isCurrentColumns: ["is_current", "current_flag"],
        modelColumns: ["production_model_id", "model_id"],
        processTypeColumns: ["process_type", "execution_type", "routing_type"],
        qualityColumns: [
          "has_quality",
          "quality_required",
          "requires_quality",
          "has_quality_check",
        ],
        phaseCountColumns: ["phase_count", "steps_count", "operations_count"],
        phases: [
          {
            table: "routing_template_version_steps",
            parentColumns: ["routing_template_version_id", "version_id"],
            tenantColumns: ["tenant_id"],
            processTypeColumns: ["process_type", "execution_type", "step_type"],
            externalColumns: [
              "is_external",
              "is_outsourced",
              "outsourced_flag",
              "is_subcontracted",
            ],
            qualityColumns: [
              "has_quality_check",
              "quality_required",
              "requires_quality",
              "quality_enabled",
            ],
          },
          {
            table: "routing_template_version_phases",
            parentColumns: ["routing_template_version_id", "version_id"],
            tenantColumns: ["tenant_id"],
            processTypeColumns: ["process_type", "execution_type", "phase_type"],
            externalColumns: [
              "is_external",
              "is_outsourced",
              "outsourced_flag",
              "is_subcontracted",
            ],
            qualityColumns: [
              "has_quality_check",
              "quality_required",
              "requires_quality",
              "quality_enabled",
            ],
          },
        ],
      },
    ],
  },
  {
    table: "cycle_templates",
    idColumns: ["id", "cycle_template_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["code", "cycle_code", "template_code"],
    nameColumns: ["name", "description", "title"],
    statusColumns: ["status", "state", "lifecycle_status", "is_active"],
    modelColumns: ["production_model_id", "model_id"],
    currentVersionColumns: ["current_version_no"],
    processTypeColumns: ["process_type", "execution_type", "cycle_type"],
    qualityColumns: ["has_quality", "quality_required", "requires_quality", "has_quality_check"],
    versions: [
      {
        table: "cycle_template_versions",
        idColumns: ["id", "cycle_template_version_id"],
        parentColumns: ["cycle_template_id", "template_id"],
        tenantColumns: ["tenant_id"],
        versionColumns: ["version_no", "revision_no", "version"],
        statusColumns: ["status", "state", "lifecycle_status", "is_active"],
        isCurrentColumns: ["is_current", "current_flag"],
        modelColumns: ["production_model_id", "model_id"],
        processTypeColumns: ["process_type", "execution_type", "cycle_type"],
        qualityColumns: [
          "has_quality",
          "quality_required",
          "requires_quality",
          "has_quality_check",
        ],
        phaseCountColumns: ["phase_count", "steps_count", "operations_count"],
        phases: [
          {
            table: "cycle_template_version_steps",
            parentColumns: ["cycle_template_version_id", "version_id"],
            tenantColumns: ["tenant_id"],
            processTypeColumns: ["process_type", "execution_type", "step_type"],
            externalColumns: [
              "is_external",
              "is_outsourced",
              "outsourced_flag",
              "is_subcontracted",
            ],
            qualityColumns: [
              "has_quality_check",
              "quality_required",
              "requires_quality",
              "quality_enabled",
            ],
          },
        ],
      },
    ],
  },
  {
    table: "routings",
    idColumns: ["id", "routing_id"],
    tenantColumns: ["tenant_id"],
    codeColumns: ["code", "routing_code"],
    nameColumns: ["name", "description", "title"],
    statusColumns: ["status", "state", "lifecycle_status", "is_active"],
    modelColumns: ["production_model_id", "model_id"],
    currentVersionColumns: ["current_version_no"],
    processTypeColumns: ["process_type", "execution_type", "routing_type"],
    qualityColumns: ["has_quality", "quality_required", "requires_quality", "has_quality_check"],
    versions: [
      {
        table: "routing_versions",
        idColumns: ["id", "routing_version_id"],
        parentColumns: ["routing_id"],
        tenantColumns: ["tenant_id"],
        versionColumns: ["version_no", "revision_no", "version"],
        statusColumns: ["status", "state", "lifecycle_status", "is_active"],
        isCurrentColumns: ["is_current", "current_flag"],
        modelColumns: ["production_model_id", "model_id"],
        processTypeColumns: ["process_type", "execution_type", "routing_type"],
        qualityColumns: [
          "has_quality",
          "quality_required",
          "requires_quality",
          "has_quality_check",
        ],
        phaseCountColumns: ["phase_count", "steps_count", "operations_count"],
        phases: [
          {
            table: "routing_steps",
            parentColumns: ["routing_version_id", "version_id"],
            tenantColumns: ["tenant_id"],
            processTypeColumns: ["process_type", "execution_type", "step_type"],
            externalColumns: [
              "is_external",
              "is_outsourced",
              "outsourced_flag",
              "is_subcontracted",
            ],
            qualityColumns: [
              "has_quality_check",
              "quality_required",
              "requires_quality",
              "quality_enabled",
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

const normalizeProcessTypeValue = (value: unknown): CycleProcessType => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (
      ["interno", "internal", "in_house", "in-house", "inhouse", "inside"].includes(normalized)
    ) {
      return "interno";
    }
    if (
      ["esterno", "external", "outsource", "subcontract", "subcontracted", "outside"].includes(
        normalized,
      )
    ) {
      return "esterno";
    }
    if (["misto", "mixed", "hybrid", "both"].includes(normalized)) {
      return "misto";
    }
  }

  return "n/d";
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

const normalizeVersionFilter = (value: string | undefined): CycleVersionFilter => {
  if (value === "versioned" || value === "no-version") {
    return value;
  }
  return "all";
};

const normalizeProcessTypeFilter = (value: string | undefined): CycleProcessTypeFilter => {
  if (value === "interno" || value === "misto" || value === "esterno" || value === "n/d") {
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

  for (const candidate of CYCLE_FAMILY_CANDIDATES) {
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

const resolvePhaseStats = async (
  tenantId: string,
  versionIds: string[],
  versionCandidate: VersionCandidate,
) => {
  const admin = getSupabaseAdminClient();
  const phaseStatsMap = new Map<string, PhaseStats>();

  if (versionIds.length === 0) {
    return phaseStatsMap;
  }

  for (const phaseCandidate of versionCandidate.phases) {
    for (const parentColumn of phaseCandidate.parentColumns) {
      for (const tenantColumn of phaseCandidate.tenantColumns) {
        const { data, error } = await admin
          .from(phaseCandidate.table)
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

        const accumulators = new Map<string, PhaseStatsAccumulator>();

        for (const row of (data ?? []) as RawRow[]) {
          const versionId = readStringFromKeys(row, [parentColumn]);
          if (!versionId) {
            continue;
          }

          const current = accumulators.get(versionId) ?? {
            phaseCount: 0,
            internalCount: 0,
            externalCount: 0,
            qualityTrueCount: 0,
            qualityFalseCount: 0,
          };

          const processType = normalizeProcessTypeValue(
            readFromKeys(row, phaseCandidate.processTypeColumns),
          );
          if (processType === "interno") {
            current.internalCount += 1;
          } else if (processType === "esterno") {
            current.externalCount += 1;
          } else if (processType === "misto") {
            current.internalCount += 1;
            current.externalCount += 1;
          } else {
            const isExternal = parseBoolean(readFromKeys(row, phaseCandidate.externalColumns));
            if (isExternal === true) {
              current.externalCount += 1;
            } else if (isExternal === false) {
              current.internalCount += 1;
            }
          }

          const hasQuality = parseBoolean(readFromKeys(row, phaseCandidate.qualityColumns));
          if (hasQuality === true) {
            current.qualityTrueCount += 1;
          } else if (hasQuality === false) {
            current.qualityFalseCount += 1;
          }

          current.phaseCount += 1;
          accumulators.set(versionId, current);
        }

        for (const [versionId, stats] of accumulators.entries()) {
          let processType: CycleProcessType = "n/d";
          if (stats.internalCount > 0 && stats.externalCount > 0) {
            processType = "misto";
          } else if (stats.externalCount > 0) {
            processType = "esterno";
          } else if (stats.internalCount > 0) {
            processType = "interno";
          }

          let hasQuality: boolean | null = null;
          if (stats.qualityTrueCount > 0) {
            hasQuality = true;
          } else if (stats.qualityFalseCount > 0) {
            hasQuality = false;
          }

          phaseStatsMap.set(versionId, {
            phaseCount: stats.phaseCount,
            processType,
            hasQuality,
          });
        }

        return phaseStatsMap;
      }
    }
  }

  return phaseStatsMap;
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
        const processType = normalizeProcessTypeValue(
          readFromKeys(best, versionCandidate.processTypeColumns),
        );
        const hasQuality = parseBoolean(readFromKeys(best, versionCandidate.qualityColumns));
        const phaseCount = parseNumber(readFromKeys(best, versionCandidate.phaseCountColumns));

        versionsByParent.set(familyId, {
          versionId,
          versionNo,
          status,
          modelId,
          processType,
          hasQuality,
          phaseCount,
        });

        if (versionId) {
          versionIds.push(versionId);
        }
      }

      const phaseStatsByVersion = await resolvePhaseStats(tenantId, versionIds, versionCandidate);

      return {
        versionsByParent,
        phaseStatsByVersion,
      };
    }
  }

  return {
    versionsByParent: new Map<string, VersionSelection>(),
    phaseStatsByVersion: new Map<string, PhaseStats>(),
  };
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

const applyFilters = (items: CycleListItem[], filters: CycleCatalogFilters) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const status = (filters.status ?? "all").trim().toLowerCase();
  const versionFilter = normalizeVersionFilter(filters.version);
  const processTypeFilter = normalizeProcessTypeFilter(filters.processType);
  const qualityFilter = normalizeBinaryFilter(filters.quality);
  const modelFilter = normalizeBinaryFilter(filters.modelLink);

  return items.filter((item) => {
    if (query) {
      const haystack =
        `${item.code} ${item.name} ${item.status} ${item.processType} ${item.productionModelCode ?? ""} ${item.productionModelName ?? ""}`.toLowerCase();
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

    if (processTypeFilter !== "all" && item.processType !== processTypeFilter) {
      return false;
    }

    if (!matchesBinaryFilter(item.hasQuality === true, qualityFilter)) {
      return false;
    }

    if (!matchesBinaryFilter(Boolean(item.productionModelId), modelFilter)) {
      return false;
    }

    return true;
  });
};

const collectStatuses = (items: CycleListItem[]) => {
  return [...new Set(items.map((item) => item.status))].sort((a, b) =>
    a.localeCompare(b, "it"),
  );
};

const sortItems = (items: CycleListItem[]) => {
  return [...items].sort((left, right) => {
    const byCode = left.code.localeCompare(right.code, "it");
    if (byCode !== 0) {
      return byCode;
    }
    return left.name.localeCompare(right.name, "it");
  });
};

export const getTenantCycleCatalog = async (
  tenantId: string,
  filters: CycleCatalogFilters,
): Promise<CycleCatalogResult> => {
  if (!tenantId) {
    return {
      cycles: [],
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
        cycles: [],
        statuses: [],
        sourceTable: null,
        warnings: familySnapshot.warnings,
        error:
          "Nessuna tabella ciclo tenant-scoped trovata nel DB esposto. Verifica naming/schema con baseline DB-00.",
      };
    }

    const family = familySnapshot.candidate;
    const familyRows = familySnapshot.rows;

    const modelLookup = await resolveModelLookup(tenantId);

    const familyIds = familyRows
      .map((row) => readStringFromKeys(row, family.idColumns))
      .filter(Boolean);

    const versionInfo = await resolveVersionInfo(tenantId, familyIds, family);

    const items: CycleListItem[] = familyRows
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
        const familyProcessType = normalizeProcessTypeValue(
          readFromKeys(row, family.processTypeColumns),
        );
        const familyHasQuality = parseBoolean(readFromKeys(row, family.qualityColumns));

        const selectedVersion = versionInfo.versionsByParent.get(id);
        const versionNo = selectedVersion?.versionNo ?? familyVersionNo ?? null;
        const status = selectedVersion?.status ?? familyStatus;
        const modelId = selectedVersion?.modelId ?? familyModelId ?? null;

        const versionId = selectedVersion?.versionId ?? null;
        const phaseStats = versionId
          ? versionInfo.phaseStatsByVersion.get(versionId) ?? null
          : null;

        const phaseCount =
          phaseStats?.phaseCount ?? selectedVersion?.phaseCount ?? null;

        let processType = phaseStats?.processType ?? "n/d";
        if (processType === "n/d") {
          processType = selectedVersion?.processType ?? familyProcessType;
        }

        const hasQuality =
          phaseStats?.hasQuality ?? selectedVersion?.hasQuality ?? familyHasQuality ?? null;

        const model = modelId ? modelLookup.get(modelId) : null;

        return {
          id,
          tenantId: tenantRowId,
          code,
          name,
          status,
          versionNo,
          versionLabel: versionNo !== null ? `v${versionNo}` : "N/D",
          phaseCount,
          processType,
          hasQuality,
          productionModelId: modelId,
          productionModelCode: model?.code ?? null,
          productionModelName: model?.name ?? null,
        } as CycleListItem;
      })
      .filter((item): item is CycleListItem => Boolean(item));

    const sorted = sortItems(items);
    const filtered = applyFilters(sorted, filters);

    return {
      cycles: filtered,
      statuses: collectStatuses(sorted),
      sourceTable: familySnapshot.sourceTable,
      warnings: familySnapshot.warnings,
      error: null,
    };
  } catch (caughtError) {
    return {
      cycles: [],
      statuses: [],
      sourceTable: null,
      warnings: [],
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};

export const getTenantCycleById = async (tenantId: string, cycleId: string) => {
  if (!tenantId || !cycleId) {
    return {
      cycle: null as CycleListItem | null,
      sourceTable: null as string | null,
      warnings: [] as string[],
      error: "Parametri non validi.",
    };
  }

  const catalog = await getTenantCycleCatalog(tenantId, {});
  return {
    cycle: catalog.cycles.find((item) => item.id === cycleId) ?? null,
    sourceTable: catalog.sourceTable,
    warnings: catalog.warnings,
    error: catalog.error,
  };
};

