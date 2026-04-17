import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getTenantDibaDetailById, type DibaLineDetail } from "@/lib/domain/diba-detail";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type DibaDetailPageProps = {
  params: Promise<{
    dibaId: string;
  }>;
  searchParams: Promise<{
    tab?: string | string[];
    line?: string | string[];
  }>;
};

type DetailTab = "materials" | "header" | "version";

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const normalizeTab = (value: string): DetailTab => {
  if (value === "header") {
    return "header";
  }
  if (value === "version") {
    return "version";
  }
  return "materials";
};

const formatNumber = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return value.toLocaleString("it-IT", { maximumFractionDigits: 6 });
};

const formatText = (value: string | null) => {
  if (!value || value.trim().length === 0) {
    return "N/D";
  }
  return value;
};

const formatBoolean = (value: boolean) => (value ? "Si" : "No");

const getSelectedLine = (lines: DibaLineDetail[], lineId: string) => {
  if (lineId) {
    const line = lines.find((candidate) => candidate.id === lineId);
    if (line) {
      return line;
    }
  }
  return lines[0] ?? null;
};

export default async function DibaDetailPage({ params, searchParams }: DibaDetailPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const activeTab = normalizeTab(normalizeParam(resolvedSearchParams.tab));
  const lineId = normalizeParam(resolvedSearchParams.line);
  const detail = await getTenantDibaDetailById(selectedTenantId, resolvedParams.dibaId);

  if (!detail.diba && !detail.error) {
    notFound();
  }

  const baseHref = `/anagrafiche/elenco-diba/${resolvedParams.dibaId}`;
  const selectedLine = getSelectedLine(detail.lines, lineId);

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1240px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Dettaglio DIBA</h1>
        <Link href="/anagrafiche/elenco-diba">Torna all&apos;elenco DIBA</Link>
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

      {detail.diba ? (
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
              <strong>{detail.diba.code}</strong>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Descrizione</span>
              <span>{detail.diba.name}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Stato</span>
              <span>{detail.version?.status ?? detail.diba.status}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Versione</span>
              <span>{detail.version?.versionLabel ?? detail.diba.versionLabel}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Articolo collegato</span>
              {detail.diba.productId ? (
                <Link href={`/anagrafiche/articoli-prodotto/${detail.diba.productId}`}>
                  {detail.diba.usageEvidence}
                </Link>
              ) : (
                <span>{detail.diba.usageEvidence}</span>
              )}
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Modello produttivo</span>
              {detail.diba.productionModelId ? (
                <Link href={`/anagrafiche/elenco-diba/${detail.diba.id}/modello`}>
                  {detail.diba.productionModelCode
                    ? detail.diba.productionModelName
                      ? `${detail.diba.productionModelCode} - ${detail.diba.productionModelName}`
                      : detail.diba.productionModelCode
                    : detail.diba.productionModelId}
                </Link>
              ) : (
                <span>N/D</span>
              )}
            </div>
          </section>

          <nav
            aria-label="Sezioni dettaglio DIBA"
            style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}
          >
            {[
              { key: "materials", label: "Materiali" },
              { key: "header", label: "Testata" },
              { key: "version", label: "Versione e stato" },
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

          {activeTab === "materials" ? (
            <section style={{ display: "grid", gap: "0.9rem" }}>
              <header style={{ display: "grid", gap: "0.3rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.02rem" }}>Griglia materiali</h2>
                <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
                  Sezione centrale read-only per quantita, UM, alternative/opzionali e note.
                </p>
              </header>

              <div
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "0.7rem",
                  overflowX: "auto",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {[
                        "Riga",
                        "Materiale",
                        "Quantita",
                        "Base",
                        "UM",
                        "Opzionale",
                        "Alternativa",
                        "Note",
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
                    {detail.lines.map((line) => (
                      <tr key={line.id}>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {line.lineNo ?? "-"}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          <div style={{ display: "grid", gap: "0.2rem" }}>
                            <strong>{line.componentCode}</strong>
                            <span style={{ color: "#475569" }}>{line.componentDescription}</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {formatNumber(line.quantityPerBase)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {formatNumber(line.baseQuantity)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {formatText(line.unitOfMeasure)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {formatBoolean(line.isOptional)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {line.isAlternative
                            ? line.alternativeGroup
                              ? `Si (${line.alternativeGroup})`
                              : "Si"
                            : "No"}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {formatText(line.notes)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          <Link
                            href={`${baseHref}?tab=materials&line=${encodeURIComponent(line.id)}#line-detail`}
                          >
                            Dettaglio riga
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {detail.lines.length === 0 ? (
                  <p style={{ margin: 0, padding: "0.85rem", color: "#475569" }}>
                    Nessuna riga materiali disponibile per questa versione.
                  </p>
                ) : null}
              </div>

              {selectedLine ? (
                <section
                  id="line-detail"
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
                      Dettaglio riga {selectedLine.lineNo ?? "-"} - {selectedLine.componentCode}
                    </h3>
                    <p style={{ margin: 0, color: "#475569", fontSize: "0.85rem" }}>
                      Base di calcolo, conversioni e regole di prelievo in sola lettura.
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
                      ["Base di calcolo", formatText(selectedLine.baseCalculation)],
                      ["Moltiplicatore", formatNumber(selectedLine.multiplier)],
                      ["Conversioni UM", formatText(selectedLine.uomConversion)],
                      ["Arrotondamenti", formatText(selectedLine.roundingRule)],
                      ["Multipli prelievo", formatNumber(selectedLine.pickingMultiple)],
                      ["Minimo prelevabile", formatNumber(selectedLine.minimumPickable)],
                      [
                        "Consumo teorico",
                        `${formatNumber(selectedLine.theoreticalConsumptionQty)} ${formatText(selectedLine.unitOfMeasure)}`,
                      ],
                      [
                        "Prelievo reale",
                        `${formatNumber(selectedLine.actualWithdrawalQty)} ${formatText(selectedLine.unitOfMeasure)}`,
                      ],
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

          {activeTab === "header" ? (
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
                <span style={{ color: "#334155" }}>Versione: {detail.version?.versionLabel ?? "N/D"}</span>
                <span style={{ color: "#334155" }}>Stato: {detail.version?.status ?? detail.diba.status}</span>
                <span style={{ color: "#334155" }}>Righe materiali: {detail.lines.length}</span>
                <span style={{ color: "#334155" }}>
                  Evidenza alternative/opzionali: {detail.diba.alternativesEvidence}
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
                  <Link href={`${baseHref}?tab=materials`}>Vai alla griglia materiali</Link>
                </span>
                <span>
                  <Link href={`/anagrafiche/elenco-diba/${resolvedParams.dibaId}/modello`}>
                    Apri modello produttivo
                  </Link>
                </span>
                {detail.diba.productId ? (
                  <span>
                    <Link href={`/anagrafiche/articoli-prodotto/${detail.diba.productId}`}>
                      Apri articolo collegato
                    </Link>
                  </span>
                ) : (
                  <span style={{ color: "#475569" }}>Nessun articolo collegato disponibile.</span>
                )}
              </article>
            </section>
          ) : null}

          {activeTab === "version" ? (
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
                <span>Righe: {formatText(detail.lineSourceTable)}</span>
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

