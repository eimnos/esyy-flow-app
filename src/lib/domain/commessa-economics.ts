import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type CommessaEconomicsFilters = {
  q?: string;
  category?: string;
};

export type CommessaEconomicsKpi = {
  plannedRevenue: number | null;
  actualRevenue: number | null;
  plannedCosts: number | null;
  actualCosts: number | null;
  plannedMargin: number | null;
  actualMargin: number | null;
  plannedMarginPct: number | null;
  actualMarginPct: number | null;
  designCostsPlanned: number | null;
  designCostsActual: number | null;
};

export type CommessaEconomicsBreakdownItem = {
  categoryKey: string;
  categoryLabel: string;
  plannedCost: number | null;
  actualCost: number | null;
  deltaCost: number | null;
  actualSharePct: number | null;
  includesDesign: boolean;
  sourceTables: string[];
  origins: string[];
};

export type CommessaEconomicsSummary = {
  categoriesTotal: number;
  positiveMargin: boolean | null;
  worstCategoryLabel: string | null;
  worstCategoryDelta: number | null;
};

export type CommessaEconomicsResult = {
  kpi: CommessaEconomicsKpi;
  breakdown: CommessaEconomicsBreakdownItem[];
  summary: CommessaEconomicsSummary;
  sourceTables: string[];
  snapshotSource: string | null;
  origins: string[];
  warnings: string[];
  emptyStateHint: string | null;
  error: string | null;
};

type RawRow = Record<string, unknown>;

type SnapshotTableCandidate = {
  table: string;
  tenantColumns: string[];
  parentColumns: string[];
  plannedRevenueColumns: string[];
  actualRevenueColumns: string[];
  plannedCostColumns: string[];
  actualCostColumns: string[];
  plannedMarginColumns: string[];
  actualMarginColumns: string[];
  designPlannedColumns: string[];
  designActualColumns: string[];
  originColumns: string[];
  updatedAtColumns: string[];
};

type BreakdownTableCandidate = {
  table: string;
  tenantColumns: string[];
  parentColumns: string[];
  categoryColumns: string[];
  plannedColumns: string[];
  actualColumns: string[];
  amountColumns: string[];
  designFlagColumns: string[];
  originColumns: string[];
  statusColumns: string[];
};

type QueryRowsResult = {
  exists: boolean;
  rows: RawRow[];
  warning: string | null;
};

type SnapshotCandidateResult = {
  sourceTable: string;
  kpi: CommessaEconomicsKpi;
  score: number;
  origins: string[];
  updatedAt: string | null;
};

type RawBreakdownRow = {
  categoryKey: string;
  categoryLabel: string;
  plannedCost: number | null;
  actualCost: number | null;
  includesDesign: boolean;
  sourceTable: string;
  origin: string | null;
};

const SAFE_LIST_LIMIT = 1200;

const EMPTY_KPI: CommessaEconomicsKpi = {
  plannedRevenue: null,
  actualRevenue: null,
  plannedCosts: null,
  actualCosts: null,
  plannedMargin: null,
  actualMargin: null,
  plannedMarginPct: null,
  actualMarginPct: null,
  designCostsPlanned: null,
  designCostsActual: null,
};

const SNAPSHOT_TABLE_CANDIDATES: SnapshotTableCandidate[] = [
  {
    table: "project_financials",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    plannedRevenueColumns: ["planned_revenue", "budget_revenue", "target_revenue", "ordered_amount"],
    actualRevenueColumns: ["actual_revenue", "consuntivo_revenue", "invoiced_amount", "revenue_amount"],
    plannedCostColumns: ["planned_cost", "budget_cost", "target_cost", "estimated_cost"],
    actualCostColumns: ["actual_cost", "consuntivo_cost", "cost_amount", "total_cost"],
    plannedMarginColumns: ["planned_margin", "budget_margin", "target_margin"],
    actualMarginColumns: ["actual_margin", "consuntivo_margin", "margin_amount"],
    designPlannedColumns: ["planned_design_cost", "budget_design_cost", "design_cost_planned"],
    designActualColumns: ["actual_design_cost", "consuntivo_design_cost", "design_cost_actual"],
    originColumns: ["origin", "source", "source_system", "calculation_source"],
    updatedAtColumns: ["updated_at", "last_updated_at", "snapshot_at"],
  },
  {
    table: "project_economics",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    plannedRevenueColumns: ["planned_revenue", "budget_revenue", "target_revenue", "ordered_amount"],
    actualRevenueColumns: ["actual_revenue", "consuntivo_revenue", "invoiced_amount", "revenue_amount"],
    plannedCostColumns: ["planned_cost", "budget_cost", "target_cost", "estimated_cost"],
    actualCostColumns: ["actual_cost", "consuntivo_cost", "cost_amount", "total_cost"],
    plannedMarginColumns: ["planned_margin", "budget_margin", "target_margin"],
    actualMarginColumns: ["actual_margin", "consuntivo_margin", "margin_amount"],
    designPlannedColumns: ["planned_design_cost", "budget_design_cost", "design_cost_planned"],
    designActualColumns: ["actual_design_cost", "consuntivo_design_cost", "design_cost_actual"],
    originColumns: ["origin", "source", "source_system", "calculation_source"],
    updatedAtColumns: ["updated_at", "last_updated_at", "snapshot_at"],
  },
  {
    table: "projects",
    tenantColumns: ["tenant_id"],
    parentColumns: ["id", "project_id", "commessa_id", "job_id"],
    plannedRevenueColumns: ["ordered_amount", "planned_revenue", "budget_revenue"],
    actualRevenueColumns: ["invoiced_amount", "actual_revenue", "consuntivo_revenue"],
    plannedCostColumns: ["planned_cost", "budget_cost", "target_cost", "estimated_cost", "purchased_amount"],
    actualCostColumns: ["actual_cost", "consuntivo_cost", "total_cost", "purchased_amount"],
    plannedMarginColumns: ["planned_margin", "budget_margin"],
    actualMarginColumns: ["actual_margin", "consuntivo_margin", "margin_amount"],
    designPlannedColumns: ["planned_design_cost", "budget_design_cost"],
    designActualColumns: ["actual_design_cost", "consuntivo_design_cost"],
    originColumns: ["origin", "source", "source_system"],
    updatedAtColumns: ["updated_at", "last_updated_at"],
  },
];

const BREAKDOWN_TABLE_CANDIDATES: BreakdownTableCandidate[] = [
  {
    table: "project_cost_breakdowns",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    categoryColumns: ["cost_category", "category", "type", "cost_type", "bucket"],
    plannedColumns: ["planned_cost", "budget_cost", "target_cost", "estimated_cost"],
    actualColumns: ["actual_cost", "consuntivo_cost", "cost_amount", "total_cost"],
    amountColumns: ["amount", "cost_amount", "value"],
    designFlagColumns: ["is_design_cost", "design_related", "is_engineering"],
    originColumns: ["origin", "source", "source_system"],
    statusColumns: ["status", "state", "workflow_status"],
  },
  {
    table: "project_cost_lines",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    categoryColumns: ["cost_category", "category", "type", "cost_type", "bucket"],
    plannedColumns: ["planned_cost", "budget_cost", "target_cost", "estimated_cost"],
    actualColumns: ["actual_cost", "consuntivo_cost", "cost_amount", "total_cost"],
    amountColumns: ["amount", "cost_amount", "value"],
    designFlagColumns: ["is_design_cost", "design_related", "is_engineering"],
    originColumns: ["origin", "source", "source_system"],
    statusColumns: ["status", "state", "workflow_status"],
  },
  {
    table: "project_expense_lines",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    categoryColumns: ["expense_category", "category", "type", "cost_type", "bucket"],
    plannedColumns: ["planned_cost", "budget_cost", "target_cost", "estimated_cost"],
    actualColumns: ["actual_cost", "consuntivo_cost", "expense_amount", "total_cost"],
    amountColumns: ["amount", "expense_amount", "value"],
    designFlagColumns: ["is_design_cost", "design_related", "is_engineering"],
    originColumns: ["origin", "source", "source_system"],
    statusColumns: ["status", "state", "workflow_status"],
  },
  {
    table: "cost_entries",
    tenantColumns: ["tenant_id"],
    parentColumns: ["project_id", "commessa_id", "job_id"],
    categoryColumns: ["cost_category", "category", "type", "cost_type", "bucket"],
    plannedColumns: ["planned_cost", "budget_cost", "target_cost", "estimated_cost"],
    actualColumns: ["actual_cost", "consuntivo_cost", "cost_amount", "total_cost"],
    amountColumns: ["amount", "cost_amount", "value"],
    designFlagColumns: ["is_design_cost", "design_related", "is_engineering"],
    originColumns: ["origin", "source", "source_system"],
    statusColumns: ["status", "state", "workflow_status"],
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
    if (["true", "1", "yes", "y", "on", "enabled", "active"].includes(normalized)) {
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

const normalizeAmount = (value: number | null) => {
  if (value === null) {
    return null;
  }
  return Math.round(value * 100) / 100;
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
    const { data, error } = await admin.from(candidate.table).select("*").eq(parentColumn, commessaId).limit(limit);
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

const scoreSnapshot = (kpi: CommessaEconomicsKpi) =>
  [
    kpi.plannedRevenue,
    kpi.actualRevenue,
    kpi.plannedCosts,
    kpi.actualCosts,
    kpi.plannedMargin,
    kpi.actualMargin,
    kpi.designCostsPlanned,
    kpi.designCostsActual,
  ].reduce<number>((score, value) => score + (value === null ? 0 : 1), 0);

const marginPct = (margin: number | null, revenue: number | null) => {
  if (margin === null || revenue === null || revenue === 0) {
    return null;
  }
  return Math.round((margin / revenue) * 10000) / 100;
};

const enrichKpi = (input: CommessaEconomicsKpi): CommessaEconomicsKpi => {
  const plannedMargin =
    input.plannedMargin !== null
      ? input.plannedMargin
      : input.plannedRevenue !== null && input.plannedCosts !== null
        ? input.plannedRevenue - input.plannedCosts
        : null;

  const actualMargin =
    input.actualMargin !== null
      ? input.actualMargin
      : input.actualRevenue !== null && input.actualCosts !== null
        ? input.actualRevenue - input.actualCosts
        : null;

  return {
    ...input,
    plannedMargin: normalizeAmount(plannedMargin),
    actualMargin: normalizeAmount(actualMargin),
    plannedMarginPct: marginPct(plannedMargin, input.plannedRevenue),
    actualMarginPct: marginPct(actualMargin, input.actualRevenue),
  };
};

const normalizeSnapshotFromRow = (row: RawRow, candidate: SnapshotTableCandidate): SnapshotCandidateResult => {
  const kpi = enrichKpi({
    plannedRevenue: normalizeAmount(readNumberFromKeys(row, candidate.plannedRevenueColumns)),
    actualRevenue: normalizeAmount(readNumberFromKeys(row, candidate.actualRevenueColumns)),
    plannedCosts: normalizeAmount(readNumberFromKeys(row, candidate.plannedCostColumns)),
    actualCosts: normalizeAmount(readNumberFromKeys(row, candidate.actualCostColumns)),
    plannedMargin: normalizeAmount(readNumberFromKeys(row, candidate.plannedMarginColumns)),
    actualMargin: normalizeAmount(readNumberFromKeys(row, candidate.actualMarginColumns)),
    plannedMarginPct: null,
    actualMarginPct: null,
    designCostsPlanned: normalizeAmount(readNumberFromKeys(row, candidate.designPlannedColumns)),
    designCostsActual: normalizeAmount(readNumberFromKeys(row, candidate.designActualColumns)),
  });

  const origin = readStringFromKeys(row, candidate.originColumns);
  return {
    sourceTable: candidate.table,
    kpi,
    score: scoreSnapshot(kpi),
    origins: origin ? [origin] : [],
    updatedAt: readDateTextFromKeys(row, candidate.updatedAtColumns),
  };
};

const pickBestSnapshot = (candidates: SnapshotCandidateResult[]) => {
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }

    const leftDate = left.updatedAt ? new Date(left.updatedAt).getTime() : -1;
    const rightDate = right.updatedAt ? new Date(right.updatedAt).getTime() : -1;
    return rightDate - leftDate;
  })[0];
};

const categoryFromToken = (token: string) => {
  const normalized = token.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) {
    return { key: "uncategorized", label: "Non classificato", includesDesign: false };
  }

  if (/(design|engineering|progett|ufficio_tecnico|svilupp)/.test(normalized)) {
    return { key: "design", label: "Progettazione", includesDesign: true };
  }
  if (/(material|acquist|purchase|raw|component)/.test(normalized)) {
    return { key: "materials", label: "Materiali / Acquisti", includesDesign: false };
  }
  if (/(produzion|production|labor|manodopera|operation|routing)/.test(normalized)) {
    return { key: "production", label: "Produzione", includesDesign: false };
  }
  if (/(subcontract|conto_lavoro|terz|outsour)/.test(normalized)) {
    return { key: "subcontract", label: "Conto lavoro", includesDesign: false };
  }
  if (/(logistic|spedizion|shipping|trasport|consegna|delivery)/.test(normalized)) {
    return { key: "logistics", label: "Logistica", includesDesign: false };
  }
  if (/(quality|qualita|collaudo|inspection)/.test(normalized)) {
    return { key: "quality", label: "Qualita", includesDesign: false };
  }
  if (/(general|overhead|indirect|amministr|admin)/.test(normalized)) {
    return { key: "general", label: "Costi generali", includesDesign: false };
  }

  const humanized = normalized.replace(/_/g, " ").trim();
  return {
    key: normalized,
    label: humanized.charAt(0).toUpperCase() + humanized.slice(1),
    includesDesign: false,
  };
};

const normalizeBreakdownRow = (row: RawRow, candidate: BreakdownTableCandidate): RawBreakdownRow | null => {
  const categoryToken = readStringFromKeys(row, candidate.categoryColumns) || candidate.table;
  const category = categoryFromToken(categoryToken);
  const explicitDesign = readBooleanFromKeys(row, candidate.designFlagColumns);
  const statusToken = readStringFromKeys(row, candidate.statusColumns).toLowerCase();

  let plannedCost = normalizeAmount(readNumberFromKeys(row, candidate.plannedColumns));
  let actualCost = normalizeAmount(readNumberFromKeys(row, candidate.actualColumns));
  const genericAmount = normalizeAmount(readNumberFromKeys(row, candidate.amountColumns));

  if (plannedCost === null && genericAmount !== null && /(plan|budget|forecast)/.test(statusToken)) {
    plannedCost = genericAmount;
  }
  if (actualCost === null && genericAmount !== null) {
    actualCost = genericAmount;
  }

  if (plannedCost === null && actualCost === null) {
    return null;
  }

  return {
    categoryKey: category.key,
    categoryLabel: category.label,
    plannedCost,
    actualCost,
    includesDesign: explicitDesign === true || category.includesDesign,
    sourceTable: candidate.table,
    origin: readStringFromKeys(row, candidate.originColumns) || null,
  };
};

const aggregateBreakdown = (rows: RawBreakdownRow[]) => {
  const byCategory = new Map<
    string,
    {
      categoryKey: string;
      categoryLabel: string;
      planned: number;
      actual: number;
      hasPlanned: boolean;
      hasActual: boolean;
      includesDesign: boolean;
      sourceTables: Set<string>;
      origins: Set<string>;
    }
  >();

  for (const row of rows) {
    const existing = byCategory.get(row.categoryKey);
    if (!existing) {
      byCategory.set(row.categoryKey, {
        categoryKey: row.categoryKey,
        categoryLabel: row.categoryLabel,
        planned: row.plannedCost ?? 0,
        actual: row.actualCost ?? 0,
        hasPlanned: row.plannedCost !== null,
        hasActual: row.actualCost !== null,
        includesDesign: row.includesDesign,
        sourceTables: new Set([row.sourceTable]),
        origins: new Set(row.origin ? [row.origin] : []),
      });
      continue;
    }

    if (row.plannedCost !== null) {
      existing.planned += row.plannedCost;
      existing.hasPlanned = true;
    }
    if (row.actualCost !== null) {
      existing.actual += row.actualCost;
      existing.hasActual = true;
    }
    existing.includesDesign = existing.includesDesign || row.includesDesign;
    existing.sourceTables.add(row.sourceTable);
    if (row.origin) {
      existing.origins.add(row.origin);
    }
  }

  const actualTotal = [...byCategory.values()].reduce((sum, row) => sum + (row.hasActual ? row.actual : 0), 0);

  return [...byCategory.values()].map<CommessaEconomicsBreakdownItem>((row) => {
    const planned = row.hasPlanned ? normalizeAmount(row.planned) : null;
    const actual = row.hasActual ? normalizeAmount(row.actual) : null;
    const delta = planned !== null && actual !== null ? normalizeAmount(actual - planned) : null;
    const share = actual !== null && actualTotal > 0 ? Math.round((actual / actualTotal) * 10000) / 100 : null;

    return {
      categoryKey: row.categoryKey,
      categoryLabel: row.categoryLabel,
      plannedCost: planned,
      actualCost: actual,
      deltaCost: delta,
      actualSharePct: share,
      includesDesign: row.includesDesign,
      sourceTables: [...row.sourceTables].sort((left, right) => left.localeCompare(right, "it")),
      origins: [...row.origins].sort((left, right) => left.localeCompare(right, "it")),
    };
  }).sort((left, right) => (right.actualCost ?? 0) - (left.actualCost ?? 0));
};

const sumOrNull = (values: Array<number | null>) => {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length === 0) {
    return null;
  }
  return normalizeAmount(numbers.reduce((sum, value) => sum + value, 0));
};

const applyBreakdownFilters = (
  breakdown: CommessaEconomicsBreakdownItem[],
  filters: CommessaEconomicsFilters,
) => {
  const query = (filters.q ?? "").trim().toLowerCase();
  const category = (filters.category ?? "all").trim().toLowerCase();

  return breakdown.filter((item) => {
    if (query) {
      const haystack = [item.categoryLabel, item.categoryKey, ...item.origins].join(" ").toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (category !== "all") {
      const match =
        item.categoryKey.toLowerCase() === category || item.categoryLabel.toLowerCase() === category;
      if (!match) {
        return false;
      }
    }
    return true;
  });
};

const enrichKpiWithBreakdown = (
  kpi: CommessaEconomicsKpi,
  breakdown: CommessaEconomicsBreakdownItem[],
): CommessaEconomicsKpi => {
  const plannedTotal = sumOrNull(breakdown.map((entry) => entry.plannedCost));
  const actualTotal = sumOrNull(breakdown.map((entry) => entry.actualCost));
  const designPlanned = sumOrNull(
    breakdown.filter((entry) => entry.includesDesign).map((entry) => entry.plannedCost),
  );
  const designActual = sumOrNull(
    breakdown.filter((entry) => entry.includesDesign).map((entry) => entry.actualCost),
  );

  return enrichKpi({
    ...kpi,
    plannedCosts: kpi.plannedCosts ?? plannedTotal,
    actualCosts: kpi.actualCosts ?? actualTotal,
    designCostsPlanned: kpi.designCostsPlanned ?? designPlanned,
    designCostsActual: kpi.designCostsActual ?? designActual,
  });
};

const buildSummary = (
  kpi: CommessaEconomicsKpi,
  breakdown: CommessaEconomicsBreakdownItem[],
): CommessaEconomicsSummary => {
  const positiveMargin =
    kpi.actualMargin !== null
      ? kpi.actualMargin >= 0
      : kpi.plannedMargin !== null
        ? kpi.plannedMargin >= 0
        : null;

  const worst = [...breakdown]
    .filter((entry) => entry.deltaCost !== null)
    .sort((left, right) => (right.deltaCost ?? 0) - (left.deltaCost ?? 0))[0];

  return {
    categoriesTotal: breakdown.length,
    positiveMargin,
    worstCategoryLabel: worst?.categoryLabel ?? null,
    worstCategoryDelta: worst?.deltaCost ?? null,
  };
};

const buildEconomics = async (
  tenantId: string,
  commessaId: string,
  filters: CommessaEconomicsFilters,
): Promise<CommessaEconomicsResult> => {
  const warnings: string[] = [];
  const sourceTables = new Set<string>();
  const origins = new Set<string>();

  const snapshotCandidates: SnapshotCandidateResult[] = [];

  for (const candidate of SNAPSHOT_TABLE_CANDIDATES) {
    const result = await queryCandidateRows(candidate, tenantId, commessaId, SAFE_LIST_LIMIT);
    if (result.warning) {
      warnings.push(result.warning);
    }
    if (!result.exists) {
      continue;
    }

    sourceTables.add(candidate.table);
    result.rows.forEach((row) => {
      const normalized = normalizeSnapshotFromRow(row, candidate);
      snapshotCandidates.push(normalized);
      normalized.origins.forEach((origin) => origins.add(origin));
    });
  }

  const rawBreakdown: RawBreakdownRow[] = [];
  for (const candidate of BREAKDOWN_TABLE_CANDIDATES) {
    const result = await queryCandidateRows(candidate, tenantId, commessaId, SAFE_LIST_LIMIT);
    if (result.warning) {
      warnings.push(result.warning);
    }
    if (!result.exists) {
      continue;
    }

    sourceTables.add(candidate.table);
    result.rows.forEach((row) => {
      const normalized = normalizeBreakdownRow(row, candidate);
      if (!normalized) {
        return;
      }
      rawBreakdown.push(normalized);
      if (normalized.origin) {
        origins.add(normalized.origin);
      }
    });
  }

  const snapshot = pickBestSnapshot(snapshotCandidates);
  const aggregatedBreakdown = aggregateBreakdown(rawBreakdown);
  const filteredBreakdown = applyBreakdownFilters(aggregatedBreakdown, filters);
  const baseKpi = snapshot?.kpi ?? EMPTY_KPI;
  const kpi = enrichKpiWithBreakdown(baseKpi, filteredBreakdown);
  const summary = buildSummary(kpi, filteredBreakdown);

  let emptyStateHint: string | null = null;
  if (sourceTables.size === 0) {
    emptyStateHint = "Nessuna sorgente economica disponibile nel DB esposto per la commessa selezionata.";
  } else if (filteredBreakdown.length === 0 && scoreSnapshot(kpi) === 0) {
    emptyStateHint = "Nessun dato economico disponibile per la commessa nel tenant selezionato.";
  } else if (aggregatedBreakdown.length > 0 && filteredBreakdown.length === 0) {
    emptyStateHint = "Nessuna categoria costi trovata con i filtri correnti.";
  }

  return {
    kpi,
    breakdown: filteredBreakdown,
    summary,
    sourceTables: [...sourceTables].sort((left, right) => left.localeCompare(right, "it")),
    snapshotSource: snapshot?.sourceTable ?? null,
    origins: [...origins].sort((left, right) => left.localeCompare(right, "it")),
    warnings,
    emptyStateHint,
    error: null,
  };
};

export const getTenantCommessaEconomics = async (
  tenantId: string,
  commessaId: string,
  filters: CommessaEconomicsFilters,
): Promise<CommessaEconomicsResult> => {
  if (!tenantId || !commessaId) {
    return {
      kpi: EMPTY_KPI,
      breakdown: [],
      summary: {
        categoriesTotal: 0,
        positiveMargin: null,
        worstCategoryLabel: null,
        worstCategoryDelta: null,
      },
      sourceTables: [],
      snapshotSource: null,
      origins: [],
      warnings: [],
      emptyStateHint: null,
      error: "Parametri non validi.",
    };
  }

  try {
    return await buildEconomics(tenantId, commessaId, filters);
  } catch (caughtError) {
    return {
      kpi: EMPTY_KPI,
      breakdown: [],
      summary: {
        categoriesTotal: 0,
        positiveMargin: null,
        worstCategoryLabel: null,
        worstCategoryDelta: null,
      },
      sourceTables: [],
      snapshotSource: null,
      origins: [],
      warnings: [],
      emptyStateHint: null,
      error: caughtError instanceof Error ? caughtError.message : "Errore inatteso.",
    };
  }
};
