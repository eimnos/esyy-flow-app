import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getTenantCycleDetailById, type CyclePhaseDetail } from "@/lib/domain/cycle-detail";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type CycleDetailPageProps = {
  params: Promise<{
    cycleId: string;
  }>;
  searchParams: Promise<{
    tab?: string | string[];
    phase?: string | string[];
  }>;
};

type DetailTab = "fasi" | "testata" | "versione";

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const normalizeTab = (value: string): DetailTab => {
  if (value === "testata") {
    return "testata";
  }
  if (value === "versione") {
    return "versione";
  }
  return "fasi";
};

const formatNumber = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return value.toLocaleString("it-IT", { maximumFractionDigits: 4 });
};

const formatText = (value: string | null) => {
  if (!value || value.trim().length === 0) {
    return "N/D";
  }
  return value;
};

const formatBoolean = (value: boolean | null) => {
  if (value === null) {
    return "N/D";
  }
  return value ? "Si" : "No";
};

const processTypeLabel = (value: string) => {
  if (value === "interno") {
    return "Interno";
  }
  if (value === "misto") {
    return "Misto";
  }
  if (value === "esterno") {
    return "Esterno";
  }
  return "N/D";
};

const phaseTypeLabel = (value: string) => {
  if (value === "interna") {
    return "Interna";
  }
  if (value === "esterna") {
    return "Esterna";
  }
  return "N/D";
};

const getSelectedPhase = (phases: CyclePhaseDetail[], phaseId: string) => {
  if (phaseId) {
    const match = phases.find((phase) => phase.id === phaseId);
    if (match) {
      return match;
    }
  }
  return phases[0] ?? null;
};

const executionLabel = (phase: CyclePhaseDetail) => {
  if (phase.phaseType === "esterna") {
    if (phase.externalSupplierCode) {
      return `Terzista: ${phase.externalSupplierCode}`;
    }
    return "Terzista: N/D";
  }

  const department = phase.departmentCode ? `Reparto: ${phase.departmentCode}` : null;
  const center = phase.workCenterCode ? `Centro: ${phase.workCenterCode}` : null;
  if (department || center) {
    return [department, center].filter(Boolean).join(" - ");
  }

  return "Reparto/Centro: N/D";
};

export default async function CycleDetailPage({ params, searchParams }: CycleDetailPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const activeTab = normalizeTab(normalizeParam(resolvedSearchParams.tab));
  const phaseId = normalizeParam(resolvedSearchParams.phase);

  const detail = await getTenantCycleDetailById(selectedTenantId, resolvedParams.cycleId);

  if (!detail.cycle && !detail.error) {
    notFound();
  }

  const baseHref = `/anagrafiche/elenco-distinte-ciclo/${resolvedParams.cycleId}`;
  const selectedPhase = getSelectedPhase(detail.phases, phaseId);

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1260px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Dettaglio distinta ciclo</h1>
        <Link href="/anagrafiche/elenco-distinte-ciclo">Torna all&apos;elenco distinte ciclo</Link>
      </header>

      {detail.error ? (
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
          {detail.error}
        </p>
      ) : null}

      {detail.cycle ? (
        <article
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "0.75rem",
            background: "#fff",
            padding: "1rem",
            display: "grid",
            gap: "1rem",
          }}
        >
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.8rem",
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: "0.9rem",
            }}
          >
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Codice</span>
              <strong>{detail.cycle.code}</strong>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Descrizione</span>
              <span>{detail.cycle.name}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Stato</span>
              <span>{detail.version?.status ?? detail.cycle.status}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Versione</span>
              <span>{detail.version?.versionLabel ?? detail.cycle.versionLabel}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Numero fasi</span>
              <span>{detail.phases.length > 0 ? detail.phases.length : detail.cycle.phaseCount ?? "N/D"}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Tipo processo</span>
              <span>{processTypeLabel(detail.cycle.processType)}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Qualita</span>
              <span>{formatBoolean(detail.cycle.hasQuality)}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Modello produttivo</span>
              <Link href={`/anagrafiche/elenco-distinte-ciclo/${detail.cycle.id}/modello`}>
                {detail.cycle.productionModelCode
                  ? detail.cycle.productionModelName
                    ? `${detail.cycle.productionModelCode} - ${detail.cycle.productionModelName}`
                    : detail.cycle.productionModelCode
                  : detail.cycle.productionModelId ?? "N/D"}
              </Link>
            </div>
          </section>

          <nav
            aria-label="Sezioni dettaglio distinta ciclo"
            style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}
          >
            {[
              { key: "fasi", label: "Fasi" },
              { key: "testata", label: "Testata" },
              { key: "versione", label: "Versione e stato" },
            ].map((tab) => {
              const href = `${baseHref}?tab=${tab.key}`;
              const selected = activeTab === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={href}
                  style={{
                    padding: "0.45rem 0.7rem",
                    borderRadius: "999px",
                    border: selected ? "1px solid #0f172a" : "1px solid #cbd5e1",
                    background: selected ? "#0f172a" : "#fff",
                    color: selected ? "#fff" : "#0f172a",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {activeTab === "fasi" ? (
            <section style={{ display: "grid", gap: "0.9rem" }}>
              <header style={{ display: "grid", gap: "0.3rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.02rem" }}>Griglia fasi</h2>
                <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
                  Sezione centrale read-only con reparto/centro/terzista, tipo fase, qualita,
                  tempi standard, setup e risorse parallele.
                </p>
              </header>

              <div
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "0.7rem",
                  overflowX: "auto",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1180px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {[
                        "Step",
                        "Fase",
                        "Reparto / centro / terzista",
                        "Tipo fase",
                        "Qualita",
                        "Tempo standard (min)",
                        "Setup (min)",
                        "Risorse parallele",
                        "Azioni",
                      ].map((header) => (
                        <th
                          key={header}
                          style={{
                            textAlign: "left",
                            fontSize: "0.82rem",
                            color: "#334155",
                            padding: "0.6rem",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.phases.map((phase) => (
                      <tr key={phase.id}>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {phase.stepNo ?? "-"}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          <div style={{ display: "grid", gap: "0.2rem" }}>
                            <strong>{phase.phaseCode}</strong>
                            <span style={{ color: "#475569" }}>{phase.phaseName}</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {executionLabel(phase)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {phaseTypeLabel(phase.phaseType)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {formatBoolean(phase.hasQualityCheck)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {formatNumber(phase.standardTimeMinutes)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {formatNumber(phase.setupTimeMinutes)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {formatNumber(phase.parallelResources)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          <Link
                            href={`${baseHref}?tab=fasi&phase=${encodeURIComponent(phase.id)}#phase-detail`}
                          >
                            Dettaglio fase
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {detail.phases.length === 0 ? (
                  <p style={{ margin: 0, padding: "0.85rem", color: "#475569" }}>
                    Nessuna fase disponibile per questa versione.
                  </p>
                ) : null}
              </div>

              {selectedPhase ? (
                <section
                  id="phase-detail"
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "0.75rem",
                    background: "#f8fafc",
                    padding: "0.9rem",
                    display: "grid",
                    gap: "0.7rem",
                  }}
                >
                  <header style={{ display: "grid", gap: "0.2rem" }}>
                    <h3 style={{ margin: 0, fontSize: "0.98rem" }}>
                      Dettaglio fase {selectedPhase.stepNo ?? "-"} - {selectedPhase.phaseCode}
                    </h3>
                    <p style={{ margin: 0, color: "#475569", fontSize: "0.85rem" }}>
                      Modalita tempi, capacita/simulazione e regole operative in sola lettura.
                    </p>
                  </header>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                      gap: "0.65rem",
                    }}
                  >
                    {[
                      ["Modalita tempo", selectedPhase.timeMode],
                      ["Capacita (u/h)", formatNumber(selectedPhase.capacityPerHour)],
                      [
                        "Simulazione tempo risultante (min)",
                        formatNumber(selectedPhase.simulatedResultMinutes),
                      ],
                      ["Regole operative", formatText(selectedPhase.operationalRules)],
                      ["Fase esterna", selectedPhase.isExternal ? "Si" : "No"],
                      ["Controllo qualita", formatBoolean(selectedPhase.hasQualityCheck)],
                      ["Tempo standard (min)", formatNumber(selectedPhase.standardTimeMinutes)],
                      ["Setup (min)", formatNumber(selectedPhase.setupTimeMinutes)],
                      ["Batch", formatNumber(selectedPhase.batchSize)],
                      ["Risorse parallele", formatNumber(selectedPhase.parallelResources)],
                      ["Reparto", formatText(selectedPhase.departmentCode)],
                      ["Centro", formatText(selectedPhase.workCenterCode)],
                      ["Terzista", formatText(selectedPhase.externalSupplierCode)],
                      ["Note", formatText(selectedPhase.notes)],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "0.6rem",
                          background: "#fff",
                          padding: "0.55rem",
                          display: "grid",
                          gap: "0.25rem",
                        }}
                      >
                        <span style={{ fontSize: "0.78rem", color: "#475569" }}>{label}</span>
                        <strong style={{ fontSize: "0.9rem" }}>{value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </section>
          ) : null}

          {activeTab === "testata" ? (
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <article
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.7rem",
                  padding: "0.75rem",
                  display: "grid",
                  gap: "0.35rem",
                }}
              >
                <strong>Sintesi testata</strong>
                <span style={{ color: "#334155" }}>
                  Versione: {detail.version?.versionLabel ?? detail.cycle.versionLabel}
                </span>
                <span style={{ color: "#334155" }}>
                  Stato: {detail.version?.status ?? detail.cycle.status}
                </span>
                <span style={{ color: "#334155" }}>
                  Numero fasi: {detail.phases.length > 0 ? detail.phases.length : detail.cycle.phaseCount ?? "N/D"}
                </span>
                <span style={{ color: "#334155" }}>
                  Tipo processo: {processTypeLabel(detail.cycle.processType)}
                </span>
                <span style={{ color: "#334155" }}>
                  Qualita: {formatBoolean(detail.cycle.hasQuality)}
                </span>
              </article>

              <article
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.7rem",
                  padding: "0.75rem",
                  display: "grid",
                  gap: "0.35rem",
                }}
              >
                <strong>Collegamenti rapidi</strong>
                <span>
                  <Link href={`${baseHref}?tab=fasi`}>Vai alla griglia fasi</Link>
                </span>
                <span>
                  <Link href={`/anagrafiche/elenco-distinte-ciclo/${resolvedParams.cycleId}/modello`}>
                    Apri modello produttivo
                  </Link>
                </span>
                <span>
                  <Link href="/anagrafiche/elenco-distinte-ciclo">Torna all&apos;elenco</Link>
                </span>
              </article>
            </section>
          ) : null}

          {activeTab === "versione" ? (
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <article
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.7rem",
                  padding: "0.75rem",
                  display: "grid",
                  gap: "0.35rem",
                }}
              >
                <strong>Versioning</strong>
                <span>Versione corrente: {detail.version?.versionLabel ?? "N/D"}</span>
                <span>Version no: {formatNumber(detail.version?.versionNo ?? null)}</span>
                <span>Stato versione: {detail.version?.status ?? "N/D"}</span>
                <span>Validita da: {formatText(detail.version?.validFrom ?? null)}</span>
                <span>Validita a: {formatText(detail.version?.validTo ?? null)}</span>
                <span>
                  Is current:{" "}
                  {detail.version?.isCurrent === null
                    ? "N/D"
                    : detail.version?.isCurrent
                      ? "Si"
                      : "No"}
                </span>
              </article>

              <article
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.7rem",
                  padding: "0.75rem",
                  display: "grid",
                  gap: "0.35rem",
                }}
              >
                <strong>Sorgenti DB</strong>
                <span>Famiglia: {formatText(detail.sourceTable)}</span>
                <span>Versioni: {formatText(detail.versionSourceTable)}</span>
                <span>Fasi: {formatText(detail.phaseSourceTable)}</span>
              </article>
            </section>
          ) : null}

          {detail.warnings.length > 0 ? (
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
              {detail.warnings.map((warning) => (
                <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
                  {warning}
                </span>
              ))}
            </section>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}

