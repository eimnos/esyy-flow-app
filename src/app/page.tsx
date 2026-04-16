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
          Setup tecnico con auth base completato (MD-01 + MD-02 in corso).
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.4rem" }}>
          <li>
            <a href="/login">Vai al login</a>
          </li>
          <li>
            <a href="/dashboard">Apri dashboard protetta</a>
          </li>
          <li>
            <a href="/api/health">Apri health check</a>
          </li>
        </ul>
      </div>
    </main>
  );
}
