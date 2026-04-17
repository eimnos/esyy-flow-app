import Link from "next/link";

export default function AnagrafichePage() {
  return (
    <section
      style={{
        display: "grid",
        gap: "1rem",
        maxWidth: "960px",
      }}
    >
      <header style={{ display: "grid", gap: "0.4rem" }}>
        <h1 style={{ margin: 0 }}>Anagrafiche</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Area anagrafiche prodotto della Wave 1. Seleziona il modulo da aprire.
        </p>
      </header>

      <article
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#ffffff",
          padding: "1rem",
          display: "grid",
          gap: "0.7rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Articoli prodotto</h2>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Elenco tenant-scoped in sola lettura con filtri base, stato produttivo e badge di
          copertura configurazione.
        </p>
        <div>
          <Link
            href="/anagrafiche/articoli-prodotto"
            style={{
              display: "inline-block",
              padding: "0.5rem 0.75rem",
              border: "1px solid #cbd5e1",
              borderRadius: "0.5rem",
            }}
          >
            Apri articoli prodotto
          </Link>
        </div>
      </article>
    </section>
  );
}

