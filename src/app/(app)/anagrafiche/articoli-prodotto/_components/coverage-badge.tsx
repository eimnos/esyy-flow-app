type CoverageBadgeProps = {
  label: string;
  enabled: boolean;
};

export default function CoverageBadge({ label, enabled }: CoverageBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        padding: "0.2rem 0.5rem",
        fontSize: "0.75rem",
        border: "1px solid",
        borderColor: enabled ? "#16a34a" : "#94a3b8",
        background: enabled ? "#dcfce7" : "#f8fafc",
        color: enabled ? "#14532d" : "#334155",
        whiteSpace: "nowrap",
      }}
    >
      {label}: {enabled ? "OK" : "N/D"}
    </span>
  );
}
