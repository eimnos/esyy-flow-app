import Link from "next/link";

type ConfigurationPlaceholderProps = {
  title: string;
  subtitle: string;
  backHref: string;
  backLabel: string;
};

export default function ConfigurationPlaceholder({
  title,
  subtitle,
  backHref,
  backLabel,
}: ConfigurationPlaceholderProps) {
  return (
    <section
      style={{
        maxWidth: "820px",
        border: "1px solid #d1d5db",
        borderRadius: "0.75rem",
        background: "#fff",
        padding: "1rem",
        display: "grid",
        gap: "0.75rem",
      }}
    >
      <header style={{ display: "grid", gap: "0.35rem" }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <p style={{ margin: 0, color: "#475569" }}>{subtitle}</p>
      </header>
      <p style={{ margin: 0, color: "#334155" }}>
        Placeholder tecnico MD-05. Le funzionalità di editing/configurazione verranno attivate nei
        micro-deliverable successivi.
      </p>
      <div>
        <Link href={backHref}>{backLabel}</Link>
      </div>
    </section>
  );
}
