type ModulePlaceholderProps = {
  title: string;
  description: string;
};

export default function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
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
      <h1 style={{ margin: 0, fontSize: "1.35rem" }}>{title}</h1>
      <p style={{ margin: 0, color: "#4b5563" }}>{description}</p>
    </section>
  );
}

