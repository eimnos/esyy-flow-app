import Link from "next/link";

import type { ModelCompatibleCycle, ProductionModelDetailResult } from "@/lib/domain/production-model-detail";

type DetailTab = "overview" | "cycles" | "process";

type ProductionModelDetailViewProps = {
  detail: ProductionModelDetailResult;
  title: string;
  backHref: string;
  backLabel: string;
  baseHref: string;
  activeTab: DetailTab;
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
  if (value === "esterno") {
    return "Esterno";
  }
  if (value === "misto") {
    return "Misto";
  }
  return "N/D";
};

const firstCycle = (cycles: ModelCompatibleCycle[]) => cycles[0] ?? null;

export default function ProductionModelDetailView({
  detail,
  title,
  backHref,
  backLabel,
  baseHref,
  activeTab,
}: ProductionModelDetailViewProps) {
  const cycle = firstCycle(detail.compatibleCycles);

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1260px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <Link href={backHref}>{backLabel}</Link>
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

      {!detail.model && !detail.error ? (
        <article
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "0.75rem",
            background: "#fff",
            padding: "1rem",
            display: "grid",
            gap: "0.65rem",
          }}
        >
          <strong>Nessun modello produttivo collegato</strong>
          <p style={{ margin: 0, color: "#475569" }}>
            Nessun record modello trovato per il riferimento corrente. Verifica il collegamento
            modello sul tenant attivo.
          </p>
        </article>
      ) : null}

      {detail.model ? (
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
              <strong>{detail.model.code}</strong>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Descrizione</span>
              <span>{detail.model.name}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Stato operativo</span>
              <span>{detail.model.operationalStatus}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Stato completezza</span>
              <span>{detail.model.completenessStatus}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Versione</span>
              <span>{detail.model.versionLabel}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Regola scelta ciclo</span>
              <span>{formatText(detail.model.cycleSelectionRule)}</span>
            </div>
          </section>

          <nav
            aria-label="Sezioni dettaglio modello produttivo"
            style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}
          >
            {[
              { key: "overview", label: "Panoramica" },
              { key: "cycles", label: "Cicli compatibili" },
              { key: "process", label: "Vista processo" },
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

          {activeTab === "overview" ? (
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
                <strong>Articolo collegato</strong>
                {detail.linkedProduct ? (
                  <span>
                    <Link href={`/anagrafiche/articoli-prodotto/${detail.linkedProduct.id}`}>
                      {detail.linkedProduct.code
                        ? detail.linkedProduct.name
                          ? `${detail.linkedProduct.code} - ${detail.linkedProduct.name}`
                          : detail.linkedProduct.code
                        : detail.linkedProduct.id}
                    </Link>
                  </span>
                ) : (
                  <span>N/D</span>
                )}
                <span style={{ color: "#475569" }}>
                  Stato articolo: {formatText(detail.linkedProduct?.status ?? null)}
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
                <strong>DIBA di default</strong>
                {detail.defaultDiba ? (
                  <span>
                    <Link href={`/anagrafiche/elenco-diba/${detail.defaultDiba.id}`}>
                      {detail.defaultDiba.code
                        ? detail.defaultDiba.name
                          ? `${detail.defaultDiba.code} - ${detail.defaultDiba.name}`
                          : detail.defaultDiba.code
                        : detail.defaultDiba.id}
                    </Link>
                  </span>
                ) : (
                  <span>N/D</span>
                )}
                <span style={{ color: "#475569" }}>
                  Stato DIBA: {formatText(detail.defaultDiba?.status ?? null)}
                </span>
                <span style={{ color: "#475569" }}>
                  Versione: {formatText(detail.defaultDiba?.versionLabel ?? null)}
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
                <strong>Cicli compatibili</strong>
                <span>Totale cicli: {detail.compatibleCycles.length}</span>
                {cycle ? (
                  <span>
                    Primo ciclo:{" "}
                    <Link href={`/anagrafiche/elenco-distinte-ciclo/${cycle.id}`}>
                      {cycle.code}
                    </Link>
                  </span>
                ) : (
                  <span>N/D</span>
                )}
                <span>
                  <Link href={`${baseHref}?tab=cycles`}>Apri elenco cicli compatibili</Link>
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
                {detail.linkedProduct ? (
                  <span>
                    <Link href={`/anagrafiche/articoli-prodotto/${detail.linkedProduct.id}`}>
                      Apri articolo
                    </Link>
                  </span>
                ) : null}
                {detail.defaultDiba ? (
                  <span>
                    <Link href={`/anagrafiche/elenco-diba/${detail.defaultDiba.id}`}>
                      Apri DIBA
                    </Link>
                  </span>
                ) : null}
                {cycle ? (
                  <span>
                    <Link href={`/anagrafiche/elenco-distinte-ciclo/${cycle.id}`}>
                      Apri ciclo
                    </Link>
                  </span>
                ) : null}
                {!detail.linkedProduct && !detail.defaultDiba && !cycle ? (
                  <span style={{ color: "#475569" }}>Nessun collegamento rapido disponibile.</span>
                ) : null}
              </article>
            </section>
          ) : null}

          {activeTab === "cycles" ? (
            <section style={{ display: "grid", gap: "0.75rem" }}>
              <header style={{ display: "grid", gap: "0.3rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.02rem" }}>Cicli compatibili</h2>
                <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
                  Elenco in sola lettura dei cicli compatibili collegati al modello produttivo.
                </p>
              </header>

              <div
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "0.7rem",
                  overflowX: "auto",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "960px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {[
                        "Codice",
                        "Descrizione",
                        "Stato",
                        "Versione",
                        "N. fasi",
                        "Tipo processo",
                        "Qualita",
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
                    {detail.compatibleCycles.map((compatibleCycle) => (
                      <tr key={compatibleCycle.id}>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          <Link href={`/anagrafiche/elenco-distinte-ciclo/${compatibleCycle.id}`}>
                            <strong>{compatibleCycle.code}</strong>
                          </Link>
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {compatibleCycle.name}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {compatibleCycle.status}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {compatibleCycle.versionLabel}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {compatibleCycle.phaseCount ?? "N/D"}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {processTypeLabel(compatibleCycle.processType)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                          {formatBoolean(compatibleCycle.hasQuality)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {detail.compatibleCycles.length === 0 ? (
                  <p style={{ margin: 0, padding: "0.85rem", color: "#475569" }}>
                    Nessun ciclo compatibile disponibile per questo modello.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {activeTab === "process" ? (
            <section style={{ display: "grid", gap: "0.75rem" }}>
              <header style={{ display: "grid", gap: "0.3rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.02rem" }}>Vista processo modello</h2>
                <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
                  Placeholder strutturato della vista grafica: il builder completo resta fuori scope
                  in questa wave.
                </p>
              </header>

              <div
                style={{
                  border: "1px dashed #94a3b8",
                  borderRadius: "0.75rem",
                  background: "#f8fafc",
                  padding: "1rem",
                  display: "grid",
                  gap: "0.8rem",
                }}
              >
                <div style={{ display: "grid", gap: "0.45rem" }}>
                  <strong>Nodi principali</strong>
                  <span>
                    Articolo:{" "}
                    {detail.linkedProduct ? (
                      <Link href={`/anagrafiche/articoli-prodotto/${detail.linkedProduct.id}`}>
                        {detail.linkedProduct.code ?? detail.linkedProduct.id}
                      </Link>
                    ) : (
                      "N/D"
                    )}
                  </span>
                  <span>
                    DIBA default:{" "}
                    {detail.defaultDiba ? (
                      <Link href={`/anagrafiche/elenco-diba/${detail.defaultDiba.id}`}>
                        {detail.defaultDiba.code ?? detail.defaultDiba.id}
                      </Link>
                    ) : (
                      "N/D"
                    )}
                  </span>
                  <span>Cicli compatibili: {detail.compatibleCycles.length}</span>
                </div>

                <div style={{ display: "grid", gap: "0.45rem" }}>
                  <strong>Regole processo</strong>
                  <span>Stato operativo: {detail.model.operationalStatus}</span>
                  <span>Stato completezza: {detail.model.completenessStatus}</span>
                  <span>Regola scelta ciclo: {formatText(detail.model.cycleSelectionRule)}</span>
                </div>
              </div>
            </section>
          ) : null}
        </article>
      ) : null}

      {detail.sourceTable ? (
        <p style={{ margin: 0, color: "#334155", fontSize: "0.85rem" }}>
          Sorgente DB: <strong>{detail.sourceTable}</strong>
          {detail.versionSourceTable ? (
            <>
              {" "}
              | Versioni: <strong>{detail.versionSourceTable}</strong>
            </>
          ) : null}
        </p>
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
    </section>
  );
}
