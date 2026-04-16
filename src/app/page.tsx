export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: 760, width: "100%" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>Esyy Flow</h1>
        <p style={{ marginBottom: "0.75rem" }}>
          Bootstrap tecnico iniziale completato (MD-01).
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Controlla lo stato applicativo su <code>/api/health</code>.
        </p>
        <a href="/api/health">Apri health check</a>
      </div>
    </main>
  );
}
