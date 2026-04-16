export default function DashboardPage() {
  return (
    <section
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "0.75rem",
        padding: "1rem",
        display: "grid",
        gap: "0.5rem",
        background: "#fff",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "1.35rem" }}>Dashboard</h1>
      <p style={{ margin: 0 }}>Benvenuto in Esyy Flow.</p>
      <p style={{ margin: 0, color: "#4b5563" }}>
        Questa è la shell iniziale dell&apos;area protetta. I moduli operativi verranno
        aggiunti nelle wave successive.
      </p>
    </section>
  );
}

