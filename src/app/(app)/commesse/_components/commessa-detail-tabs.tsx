import Link from "next/link";

type CommessaDetailTabKey =
  | "overview"
  | "documenti"
  | "produzione"
  | "approvvigionamenti"
  | "conto-lavoro"
  | "costi-fatturato";

type CommessaDetailTabsProps = {
  commessaId: string;
  activeTab: CommessaDetailTabKey;
};

const tabs: Array<{ key: CommessaDetailTabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "documenti", label: "Documenti" },
  { key: "produzione", label: "Produzione" },
  { key: "approvvigionamenti", label: "Approvvigionamenti" },
  { key: "conto-lavoro", label: "Conto lavoro" },
  { key: "costi-fatturato", label: "Costi/Fatturato" },
];

export function CommessaDetailTabs({ commessaId, activeTab }: CommessaDetailTabsProps) {
  const baseHref = `/commesse/${commessaId}`;

  return (
    <nav aria-label="Sezioni dettaglio commessa" style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
      {tabs.map((tab) => {
        const href =
          tab.key === "overview"
            ? baseHref
            : tab.key === "documenti"
              ? `${baseHref}/documenti`
            : tab.key === "produzione"
              ? `${baseHref}/produzione`
            : tab.key === "approvvigionamenti"
              ? `${baseHref}/approvvigionamenti`
            : tab.key === "conto-lavoro"
              ? `${baseHref}/conto-lavoro`
              : `${baseHref}/costi-fatturato`;
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
  );
}
