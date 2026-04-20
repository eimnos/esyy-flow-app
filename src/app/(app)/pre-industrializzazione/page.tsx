import Link from "next/link";

type LandingBlock = {
  id: string;
  title: string;
  description: string;
  emptyState: string;
  nextStep: string;
};

const provisionalBlocks: LandingBlock[] = [
  {
    id: "progetti-provvisori",
    title: "Progetti prodotto provvisori",
    description:
      "Contenitore iniziale per varianti e studi preliminari prima del consolidamento operativo.",
    emptyState: "Nessun progetto provvisorio disponibile per il tenant corrente.",
    nextStep: "Predisporre lista progetti e metadati minimi (codice, stato, owner, priorita).",
  },
  {
    id: "diba-provvisorie",
    title: "DIBA provvisorie",
    description:
      "Area dedicata alle strutture materiali preliminari separate dalla libreria DIBA operativa.",
    emptyState: "Nessuna DIBA provvisoria disponibile per il tenant corrente.",
    nextStep: "Agganciare le versioni preliminari e il confronto con la DIBA operativa.",
  },
  {
    id: "cicli-provvisori",
    title: "Cicli provvisori",
    description:
      "Spazio per i cicli in studio con alternative interne/esterne prima del rilascio definitivo.",
    emptyState: "Nessun ciclo provvisorio disponibile per il tenant corrente.",
    nextStep: "Abilitare fase, tempi base e tipo processo nel catalogo preliminare.",
  },
  {
    id: "modelli-provvisori",
    title: "Modelli provvisori",
    description:
      "Configurazioni preliminari modello per coordinare articolo, DIBA e cicli compatibili.",
    emptyState: "Nessun modello provvisorio disponibile per il tenant corrente.",
    nextStep: "Collegare modello preliminare a DIBA e cicli candidati.",
  },
];

const planningBlocks: LandingBlock[] = [
  {
    id: "confronto-scenari",
    title: "Confronto scenari",
    description:
      "Vista comparativa per scenari make/buy e varianti di processo, tempi e costo stimato.",
    emptyState: "Nessuno scenario comparativo disponibile per il tenant corrente.",
    nextStep: "Preparare read model per confronto baseline vs alternative.",
  },
  {
    id: "attivita-tempi-costi",
    title: "Attivita, tempi, costi",
    description:
      "Tracciamento leggero delle attivita di pre-industrializzazione con stime e consuntivi iniziali.",
    emptyState: "Nessuna attivita registrata nel dataset corrente.",
    nextStep: "Introdurre timeline minima e KPI di avanzamento preliminare.",
  },
  {
    id: "promozione-operativo",
    title: "Promozione ad operativo",
    description:
      "Placeholder strutturato per accompagnare il passaggio da provvisorio a libreria operativa.",
    emptyState: "Nessuna promozione in corso nel dataset corrente.",
    nextStep: "Definire checklist di validazione prima della promozione definitiva.",
  },
];

export default function PreIndustrializzazionePage() {
  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "1rem",
          display: "grid",
          gap: "0.55rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Pre-industrializzazione</h1>
        <p style={{ margin: 0, color: "#475569" }}>
          Area separata dall&apos;anagrafica operativa per gestire studi preliminari su prodotto,
          DIBA, cicli e modelli, con confronto scenari e preparazione alla promozione.
        </p>
      </header>

      <section
        role="status"
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: "0.75rem",
          background: "#f8fafc",
          padding: "0.9rem",
          display: "grid",
          gap: "0.45rem",
        }}
      >
        <strong>Stato dataset</strong>
        <p style={{ margin: 0, color: "#334155" }}>
          Al momento non e stato rilevato un dataset pre-industrializzazione lato runtime. La
          landing espone empty state strutturati fino alla disponibilita dei dati reali.
        </p>
      </section>

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Librerie provvisorie</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {provisionalBlocks.map((block) => (
            <article
              key={block.id}
              id={block.id}
              style={{
                border: "1px solid #d1d5db",
                borderRadius: "0.75rem",
                background: "#fff",
                padding: "0.85rem",
                display: "grid",
                gap: "0.55rem",
              }}
            >
              <strong>{block.title}</strong>
              <p style={{ margin: 0, color: "#475569" }}>{block.description}</p>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155" }}>
                Empty state: {block.emptyState}
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>
                Prossimo step: {block.nextStep}
              </p>
              <Link href={`/pre-industrializzazione#${block.id}`}>Resta in overview</Link>
            </article>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Consolidamento e controllo</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {planningBlocks.map((block) => (
            <article
              key={block.id}
              id={block.id}
              style={{
                border: "1px solid #d1d5db",
                borderRadius: "0.75rem",
                background: "#fff",
                padding: "0.85rem",
                display: "grid",
                gap: "0.55rem",
              }}
            >
              <strong>{block.title}</strong>
              <p style={{ margin: 0, color: "#475569" }}>{block.description}</p>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155" }}>
                Empty state: {block.emptyState}
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>
                Prossimo step: {block.nextStep}
              </p>
              <Link href={`/pre-industrializzazione#${block.id}`}>Resta in overview</Link>
            </article>
          ))}
        </div>
      </section>

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "1rem",
          display: "grid",
          gap: "0.55rem",
        }}
      >
        <strong>Promozione ad operativo (placeholder strutturato)</strong>
        <p style={{ margin: 0, color: "#475569" }}>
          Workflow completo non incluso in questa wave. La sezione espone la struttura minima da
          consolidare nelle wave successive.
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.35rem" }}>
          <li>Controllo completezza: articolo, DIBA, ciclo, modello.</li>
          <li>Verifica scenario selezionato e impatto tempi/costi.</li>
          <li>Conferma promozione con tracciamento esito.</li>
        </ul>
      </section>
    </section>
  );
}
