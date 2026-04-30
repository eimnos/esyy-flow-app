import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ContextualCustomFieldPanel } from "@/app/(app)/_components/contextual-custom-field-panel";
import {
  formatContextSectionLabel,
  resolveContextualCustomFields,
} from "@/lib/domain/custom-field-contextual";
import {
  getTenantCustomFieldCatalog,
  getTenantCustomFieldLineValuesByLineIds,
} from "@/lib/domain/custom-fields";
import {
  getTenantOdpMaterials,
  type OdpBinaryFilter,
  type OdpMaterialDifferenceFilter,
} from "@/lib/domain/odp";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type OdpMaterialsPageProps = {
  params: Promise<{
    odpId: string;
  }>;
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    difference?: string | string[];
    manual?: string | string[];
    substitution?: string | string[];
    lots?: string | string[];
    external?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const normalizeBinaryFilter = (value: string): OdpBinaryFilter =>
  value === "yes" || value === "no" ? value : "all";

const normalizeDifferenceFilter = (value: string): OdpMaterialDifferenceFilter =>
  value === "positive" || value === "negative" || value === "none" ? value : "all";

const formatQty = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return value.toLocaleString("it-IT", { maximumFractionDigits: 3 });
};

const formatDiff = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  const normalized = Math.round(value * 1000) / 1000;
  if (normalized > 0) {
    return `+${formatQty(normalized)}`;
  }
  return formatQty(normalized);
};

const boolLabel = (value: boolean) => (value ? "Si" : "No");

const formatCustomFieldValue = (value: string | number | boolean | null, defaultValue: string | null) => {
  if (value === null) {
    return defaultValue ?? "N/D";
  }
  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }
  return `${value}`;
};

export default async function OdpMaterialsPage({
  params,
  searchParams,
}: OdpMaterialsPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const q = normalizeParam(resolvedSearchParams.q);
  const status = normalizeParam(resolvedSearchParams.status) || "all";
  const difference = normalizeDifferenceFilter(normalizeParam(resolvedSearchParams.difference));
  const manual = normalizeBinaryFilter(normalizeParam(resolvedSearchParams.manual));
  const substitution = normalizeBinaryFilter(normalizeParam(resolvedSearchParams.substitution));
  const lots = normalizeBinaryFilter(normalizeParam(resolvedSearchParams.lots));
  const external = normalizeBinaryFilter(normalizeParam(resolvedSearchParams.external));

  const materials = await getTenantOdpMaterials(selectedTenantId, resolvedParams.odpId, {
    q,
    status,
    difference,
    manual,
    substitution,
    lots,
    externalLink: external,
  });

  const orderCode = materials.order?.code ?? resolvedParams.odpId;
  const customFieldCatalog = await getTenantCustomFieldCatalog(selectedTenantId);
  const materialsLineContextFields = resolveContextualCustomFields({
    catalog: customFieldCatalog,
    objectTypeCode: "production_order_phases",
    screenCode: "odp_materiali_effettivi",
    targetLevels: ["line"],
  });
  const lineValuesSnapshot =
    materialsLineContextFields.length > 0 && materials.items.length > 0
      ? await getTenantCustomFieldLineValuesByLineIds(selectedTenantId, {
          objectTypeCode: "production_order_phases",
          targetLineRecordIds: materials.items.map((item) => item.id),
        })
      : null;
  const lineDefinitionIdSet = new Set(
    materialsLineContextFields.map((item) => item.definition.definitionId),
  );
  const lineValuesByRecordId = new Map<
    string,
    Array<{
      definitionId: string;
      targetRecordId: string;
      value: string | number | boolean | null;
    }>
  >();
  (lineValuesSnapshot?.values ?? []).forEach((item) => {
    if (!lineDefinitionIdSet.has(item.customFieldDefinitionId)) {
      return;
    }
    const current = lineValuesByRecordId.get(item.targetLineRecordId) ?? [];
    current.push({
      definitionId: item.customFieldDefinitionId,
      targetRecordId: item.targetRecordId,
      value: item.value,
    });
    lineValuesByRecordId.set(item.targetLineRecordId, current);
  });
  const lineCustomSections = [...new Set(materialsLineContextFields.map((item) => item.binding.sectionCode))].map(
    (sectionCode) => ({
      sectionCode,
      label: formatContextSectionLabel(sectionCode),
      fields: materialsLineContextFields.filter((item) => item.binding.sectionCode === sectionCode),
    }),
  );
  const firstLinePreview = materials.items.find((item) => item.phaseId);
  const contoLavoroLink = materials.order?.commessaId
    ? `/commesse/${materials.order.commessaId}/conto-lavoro`
    : `/odp/${resolvedParams.odpId}?section=conto-lavoro`;
  const customFieldWarnings = lineValuesSnapshot?.warnings ?? [];
  const customFieldError = lineValuesSnapshot?.error ?? null;

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1320px" }}>
      <header style={{ display: "grid", gap: "0.35rem" }}>
        <h1 style={{ margin: 0 }}>Ordini di Produzione / Materiali effettivi</h1>
        <p style={{ margin: 0, color: "#475569" }}>
          Vista read-only tenant-scoped dei materiali reali dell&apos;ODP con confronto tra teorico,
          prelevato, consumato e scostamento.
        </p>
      </header>

      <ContextualCustomFieldPanel
        tenantId={selectedTenantId}
        objectTypeCode="production_order_phases"
        screenCode="odp_materiali_effettivi"
        sectionCode="materiali_effettivi"
        lineContextType="production_order_phase_materials"
        contextLabel="ODP / Materiali effettivi"
        contextDescription="Creazione contestuale campi line per le righe materiali reali."
        fieldDomainCode="production"
        allowedTargetLevels={["line"]}
        defaultTargetLevel="line"
        valuePreview={
          firstLinePreview?.phaseId
            ? {
                objectTypeCode: "production_order_phases",
                targetLevel: "line",
                targetRecordId: firstLinePreview.phaseId,
                targetLineRecordId: firstLinePreview.id,
              }
            : undefined
        }
      />

      {lineCustomSections.length > 0 ? (
        <section
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "0.75rem",
            background: "#fff",
            padding: "0.85rem",
            display: "grid",
            gap: "0.65rem",
          }}
        >
          <strong>Campi personalizzati contestuali (line materiali)</strong>
          {lineCustomSections.map((section) => (
            <article
              key={section.sectionCode}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "0.65rem",
                background: "#f8fafc",
                padding: "0.65rem",
                display: "grid",
                gap: "0.45rem",
              }}
            >
              <strong style={{ fontSize: "0.9rem" }}>{section.label}</strong>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {section.fields.map((field) => (
                  <span
                    key={`${field.definition.definitionId}:${field.binding.id}`}
                    style={{
                      border: "1px solid #d1d5db",
                      borderRadius: "999px",
                      background: "#fff",
                      padding: "0.2rem 0.5rem",
                      fontSize: "0.8rem",
                      color: "#334155",
                    }}
                  >
                    {field.definition.label} (ord. {field.binding.sortOrder})
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {materials.error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            border: "1px solid #fecaca",
            borderRadius: "0.65rem",
            background: "#fef2f2",
            color: "#991b1b",
            padding: "0.8rem",
          }}
        >
          {materials.error}
        </p>
      ) : null}

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.85rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.65rem",
        }}
      >
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.82rem", color: "#475569" }}>ODP</span>
          <strong>{orderCode}</strong>
        </div>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.82rem", color: "#475569" }}>Descrizione</span>
          <span>{materials.order?.name ?? "N/D"}</span>
        </div>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.82rem", color: "#475569" }}>Stato ODP</span>
          <span>{materials.order?.status ?? "N/D"}</span>
        </div>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.82rem", color: "#475569" }}>Origine</span>
          <span>{materials.order?.origin ?? "N/D"}</span>
        </div>
      </section>

      <form
        method="get"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px,2fr) repeat(6,minmax(115px,1fr)) auto",
          gap: "0.55rem",
          alignItems: "end",
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.8rem",
        }}
      >
        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Ricerca</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="materiale, lotto, fase, nota"
            style={{ padding: "0.5rem 0.6rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Stato</span>
          <select name="status" defaultValue={status} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutti</option>
            {materials.statuses.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Differenza</span>
          <select name="difference" defaultValue={difference} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            <option value="positive">Positiva</option>
            <option value="negative">Negativa</option>
            <option value="none">Allineata</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Modifica manuale</span>
          <select name="manual" defaultValue={manual} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            <option value="yes">Solo si</option>
            <option value="no">Solo no</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Sostituzione</span>
          <select
            name="substitution"
            defaultValue={substitution}
            style={{ padding: "0.5rem 0.6rem" }}
          >
            <option value="all">Tutte</option>
            <option value="yes">Solo si</option>
            <option value="no">Solo no</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Lotti</span>
          <select name="lots" defaultValue={lots} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutti</option>
            <option value="yes">Con lotto</option>
            <option value="no">Senza lotto</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Link esterni</span>
          <select name="external" defaultValue={external} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutti</option>
            <option value="yes">Con link</option>
            <option value="no">Senza link</option>
          </select>
        </label>

        <button type="submit" style={{ padding: "0.5rem 0.75rem", cursor: "pointer" }}>
          Filtra
        </button>
      </form>

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.85rem",
          display: "grid",
          gap: "0.7rem",
        }}
      >
        <strong>Situazione sintetica materiali ODP</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.6rem",
          }}
        >
          {[
            ["Righe visibili", `${materials.summary.total}`],
            ["Con differenza", `${materials.summary.withDifference}`],
            ["Sovra-consumo", `${materials.summary.overConsumed}`],
            ["Sotto-consumo", `${materials.summary.underConsumed}`],
            ["Allineate", `${materials.summary.aligned}`],
            ["Modifiche manuali", `${materials.summary.manualChanges}`],
            ["Sostituzioni", `${materials.summary.substitutions}`],
            ["Con lotto", `${materials.summary.withLots}`],
            ["Link esterni", `${materials.summary.externalLinked}`],
            ["Tot teorico", formatQty(materials.summary.theoreticalQtyTotal)],
            ["Tot prelevato", formatQty(materials.summary.pickedQtyTotal)],
            ["Tot consumato", formatQty(materials.summary.consumedQtyTotal)],
            ["Tot differenza", formatDiff(materials.summary.differenceQtyTotal)],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "0.65rem",
                background: "#f8fafc",
                padding: "0.65rem",
                display: "grid",
                gap: "0.2rem",
              }}
            >
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          overflowX: "auto",
        }}
      >
        <header style={{ padding: "0.85rem", borderBottom: "1px solid #e2e8f0", display: "grid", gap: "0.25rem" }}>
          <strong>Distinta dinamica materiali ODP</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Confronto teorico/prelevato/consumato con differenze, sostituzioni, lotti e legami verso
            fasi esterne o conto lavoro dove disponibili.
          </p>
        </header>

        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1420px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "ODP",
                  "Materiale",
                  "Stato",
                  "Quantita",
                  "Custom fields line",
                  "Modifiche",
                  "Lotti",
                  "Collegamenti",
                "Azioni",
              ].map((header) => (
                <th
                  key={header}
                  style={{
                    textAlign: "left",
                    fontSize: "0.82rem",
                    letterSpacing: "0.02em",
                    color: "#334155",
                    padding: "0.65rem",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materials.items.map((item) => (
              <tr key={`${item.sourceTable}-${item.id}`}>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <strong>{item.odpCode ?? orderCode}</strong>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      Sorgente: {item.sourceTable}
                    </span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <strong>{item.materialCode}</strong>
                    <span style={{ color: "#475569", fontSize: "0.85rem" }}>{item.materialName}</span>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      UM: {item.uom ?? "N/D"}
                    </span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>{item.status}</td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <span>Teorico: {formatQty(item.theoreticalQty)}</span>
                    <span>Prelevato: {formatQty(item.pickedQty)}</span>
                    <span>Consumato: {formatQty(item.consumedQty)}</span>
                    <strong>Differenza: {formatDiff(item.differenceQty)}</strong>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {materialsLineContextFields.length > 0 ? (
                    <div style={{ display: "grid", gap: "0.25rem" }}>
                      {materialsLineContextFields.map((field) => {
                        const lineValues = lineValuesByRecordId.get(item.id) ?? [];
                        const value = lineValues.find(
                          (lineValue) =>
                            lineValue.definitionId === field.definition.definitionId &&
                            (!item.phaseId || lineValue.targetRecordId === item.phaseId),
                        );
                        return (
                          <span
                            key={`${item.id}:${field.definition.definitionId}:${field.binding.id}`}
                            style={{ fontSize: "0.82rem", color: "#334155" }}
                          >
                            <strong>{field.definition.label}:</strong>{" "}
                            {formatCustomFieldValue(value?.value ?? null, field.definition.defaultValue)}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span style={{ color: "#64748b", fontSize: "0.85rem" }}>N/D</span>
                  )}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <span>Manuale: {boolLabel(item.hasManualChange)}</span>
                    <span>Sostituzione: {boolLabel(item.hasSubstitution)}</span>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      {item.note ?? "Nessuna nota"}
                    </span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {item.hasLots ? item.lotCode ?? "Presente" : "No"}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <span>Fase: {item.externalPhaseCode ?? "N/D"}</span>
                    <span>Conto lavoro: {item.subcontractingCode ?? "N/D"}</span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <Link href={`/odp/${resolvedParams.odpId}`}>Dettaglio ODP</Link>
                    <Link href={`/odp/${resolvedParams.odpId}/fasi`}>Fasi ODP</Link>
                    <Link href={contoLavoroLink}>Conto lavoro</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {materials.items.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessun materiale ODP disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              {materials.emptyStateHint ??
                "Il dominio non espone ancora materiali effettivi per l'ODP selezionato nel tenant corrente."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href={`/odp/${resolvedParams.odpId}/materiali`}>Reset filtri</Link>
              <Link href={`/odp/${resolvedParams.odpId}`}>Torna a dettaglio ODP</Link>
              <Link href="/odp">Torna a elenco ODP</Link>
            </div>
          </section>
        ) : null}
      </section>

      {customFieldError ? (
        <p
          role="alert"
          style={{
            margin: 0,
            border: "1px solid #fecaca",
            borderRadius: "0.65rem",
            background: "#fef2f2",
            color: "#991b1b",
            padding: "0.8rem",
          }}
        >
          {customFieldError}
        </p>
      ) : null}

      <section
        style={{
          borderTop: "1px solid #e2e8f0",
          paddingTop: "0.8rem",
          display: "grid",
          gap: "0.45rem",
        }}
      >
        <strong>Accessi rapidi</strong>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href={`/odp/${resolvedParams.odpId}`}>Torna a dettaglio ODP</Link>
          <Link href={`/odp/${resolvedParams.odpId}/fasi`}>Fasi ODP</Link>
          <Link href={contoLavoroLink}>Conto lavoro ODP</Link>
          <Link href="/odp">Torna a elenco ODP</Link>
          <Link href="/mes">MES (placeholder)</Link>
        </div>
      </section>

      {materials.sourceTables.length > 0 ? (
        <p style={{ margin: 0, color: "#334155", fontSize: "0.85rem" }}>
          Sorgenti DB: <strong>{materials.sourceTables.join(", ")}</strong>
        </p>
      ) : null}

      {materials.warnings.length > 0 ? (
        <section
          style={{
            border: "1px solid #fde68a",
            borderRadius: "0.65rem",
            background: "#fffbeb",
            padding: "0.75rem",
            display: "grid",
            gap: "0.35rem",
          }}
        >
          <strong style={{ fontSize: "0.9rem" }}>Warning query</strong>
          {materials.warnings.map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
      ) : null}

      {customFieldWarnings.length > 0 ? (
        <section
          style={{
            border: "1px solid #fde68a",
            borderRadius: "0.65rem",
            background: "#fffbeb",
            padding: "0.75rem",
            display: "grid",
            gap: "0.35rem",
          }}
        >
          <strong style={{ fontSize: "0.9rem" }}>Warning query custom fields line</strong>
          {customFieldWarnings.map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
      ) : null}
    </section>
  );
}
