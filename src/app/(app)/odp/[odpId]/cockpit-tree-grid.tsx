"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { OdpCockpitNode, OdpCockpitResult, OdpCockpitSignal } from "@/lib/domain/odp";

type OdpCockpitTreeGridProps = {
  cockpit: OdpCockpitResult;
};

type CockpitTreeRow = {
  node: OdpCockpitNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
};

const signalMeta: Record<
  OdpCockpitSignal,
  { label: string; bg: string; text: string; border: string }
> = {
  delay: {
    label: "Ritardo",
    bg: "#fef3c7",
    text: "#92400e",
    border: "#fcd34d",
  },
  blocked: {
    label: "Blocco",
    bg: "#fee2e2",
    text: "#991b1b",
    border: "#fecaca",
  },
  external: {
    label: "Esterna",
    bg: "#dbeafe",
    text: "#1e3a8a",
    border: "#bfdbfe",
  },
  critical_material: {
    label: "Critico",
    bg: "#ffe4e6",
    text: "#9f1239",
    border: "#fecdd3",
  },
  quality: {
    label: "Qualita",
    bg: "#dcfce7",
    text: "#166534",
    border: "#bbf7d0",
  },
};

const kindLabel: Record<OdpCockpitNode["kind"], string> = {
  odp: "ODP",
  phase: "Fase",
  material: "Materiale",
  event: "Evento",
};

const formatNodeProgress = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return `${Math.round(value)}%`;
};

export default function OdpCockpitTreeGrid({ cockpit }: OdpCockpitTreeGridProps) {
  const initialSelectedId = cockpit.rootNodeId ?? cockpit.nodes[0]?.id ?? null;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (cockpit.rootNodeId) {
      initial.add(cockpit.rootNodeId);
    }
    return initial;
  });
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const childMap = useMemo(() => {
    const map = new Map<string | null, OdpCockpitNode[]>();
    for (const node of cockpit.nodes) {
      const existing = map.get(node.parentId) ?? [];
      existing.push(node);
      map.set(node.parentId, existing);
    }
    for (const [key, nodes] of map.entries()) {
      map.set(
        key,
        [...nodes].sort((left, right) => {
          if (left.sortOrder !== right.sortOrder) {
            return left.sortOrder - right.sortOrder;
          }
          return left.label.localeCompare(right.label, "it");
        }),
      );
    }
    return map;
  }, [cockpit.nodes]);

  const rows = useMemo(() => {
    const flattened: CockpitTreeRow[] = [];

    const visit = (parentId: string | null, depth: number) => {
      const children = childMap.get(parentId) ?? [];
      for (const child of children) {
        const hasChildren = (childMap.get(child.id) ?? []).length > 0;
        const isExpanded = expandedIds.has(child.id);
        flattened.push({
          node: child,
          depth,
          hasChildren,
          isExpanded,
        });
        if (hasChildren && isExpanded) {
          visit(child.id, depth + 1);
        }
      }
    };

    visit(null, 0);
    return flattened;
  }, [childMap, expandedIds]);

  const nodeById = useMemo(() => {
    const map = new Map<string, OdpCockpitNode>();
    cockpit.nodes.forEach((node) => {
      map.set(node.id, node);
    });
    return map;
  }, [cockpit.nodes]);

  const selectedNode = selectedId ? nodeById.get(selectedId) ?? null : null;

  const onRowClick = (row: CockpitTreeRow) => {
    setSelectedId(row.node.id);
    setDrawerOpen(true);
    if (!row.hasChildren) {
      return;
    }
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(row.node.id)) {
        next.delete(row.node.id);
      } else {
        next.add(row.node.id);
      }
      return next;
    });
  };

  if (cockpit.nodes.length === 0) {
    return (
      <section
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: "0.75rem",
          background: "#f8fafc",
          padding: "0.95rem",
          display: "grid",
          gap: "0.45rem",
        }}
      >
        <strong>Cockpit ODP non disponibile</strong>
        <p style={{ margin: 0, color: "#334155" }}>
          {cockpit.emptyStateHint ??
            "Il dataset corrente non espone ancora nodi utili per il cockpit ODP."}
        </p>
      </section>
    );
  }

  return (
    <>
      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          overflowX: "auto",
        }}
      >
        <header
          style={{
            padding: "0.8rem",
            borderBottom: "1px solid #e2e8f0",
            display: "grid",
            gap: "0.4rem",
          }}
        >
          <strong>Cockpit tree-grid ODP</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Click sulla riga per selezionare ed espandere/collassare i livelli ODP, fasi,
            materiali e movimenti/eventi collegati.
          </p>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {(Object.keys(signalMeta) as OdpCockpitSignal[]).map((signal) => (
              <span
                key={signal}
                style={{
                  fontSize: "0.74rem",
                  border: `1px solid ${signalMeta[signal].border}`,
                  borderRadius: "999px",
                  background: signalMeta[signal].bg,
                  color: signalMeta[signal].text,
                  padding: "0.12rem 0.52rem",
                }}
              >
                {signalMeta[signal].label}
              </span>
            ))}
          </div>
        </header>

        <table style={{ width: "100%", minWidth: "1180px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Nodo", "Stato / Segnali", "Metriche", "Link rapidi"].map((header) => (
                <th
                  key={header}
                  style={{
                    textAlign: "left",
                    fontSize: "0.82rem",
                    letterSpacing: "0.02em",
                    color: "#334155",
                    padding: "0.65rem",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = selectedId === row.node.id;
              return (
                <tr
                  key={row.node.id}
                  onClick={() => onRowClick(row)}
                  style={{
                    cursor: "pointer",
                    background: selected ? "#eef2ff" : "transparent",
                  }}
                >
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.42rem",
                        paddingLeft: `${row.depth * 18}px`,
                      }}
                    >
                      <span
                        style={{
                          minWidth: "2.4rem",
                          color: "#64748b",
                          fontSize: "0.78rem",
                          fontFamily: "monospace",
                        }}
                      >
                        {row.hasChildren ? (row.isExpanded ? "[-]" : "[+]") : "[.]"}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.35rem",
                          padding: "0.05rem 0.35rem",
                          color: "#334155",
                          background: "#f8fafc",
                          minWidth: "4.5rem",
                          textAlign: "center",
                        }}
                      >
                        {kindLabel[row.node.kind]}
                      </span>
                      <div style={{ display: "grid", gap: "0.18rem" }}>
                        <strong>{row.node.label}</strong>
                        {row.node.secondaryLabel ? (
                          <span style={{ color: "#475569", fontSize: "0.84rem" }}>
                            {row.node.secondaryLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.28rem" }}>
                      <span style={{ color: "#334155" }}>
                        Stato: <strong>{row.node.status ?? "N/D"}</strong>
                        {" · "}Avanz.: <strong>{formatNodeProgress(row.node.progressPct)}</strong>
                      </span>
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        {row.node.signals.length > 0 ? (
                          row.node.signals.map((signal) => (
                            <span
                              key={`${row.node.id}-${signal}`}
                              style={{
                                fontSize: "0.72rem",
                                border: `1px solid ${signalMeta[signal].border}`,
                                borderRadius: "999px",
                                background: signalMeta[signal].bg,
                                color: signalMeta[signal].text,
                                padding: "0.06rem 0.48rem",
                              }}
                            >
                              {signalMeta[signal].label}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: "#64748b", fontSize: "0.82rem" }}>
                            Nessun segnale attivo
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      {row.node.metrics.length > 0 ? (
                        row.node.metrics.map((metric) => (
                          <span key={`${row.node.id}-${metric.label}`} style={{ color: "#334155" }}>
                            {metric.label}: <strong>{metric.value}</strong>
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#64748b" }}>N/D</span>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                      {row.node.links.slice(0, 5).map((link) => (
                        <Link
                          key={`${row.node.id}-${link.key}-${link.href}`}
                          href={link.href}
                          title={link.key}
                          onClick={(event) => event.stopPropagation()}
                          style={{
                            textDecoration: "none",
                            border: "1px solid #cbd5e1",
                            borderRadius: "0.4rem",
                            padding: "0.1rem 0.38rem",
                            fontSize: "0.72rem",
                            color: "#1e293b",
                            background: "#f8fafc",
                          }}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {selectedNode && drawerOpen ? (
        <aside
            style={{
              position: "fixed",
              top: "72px",
              right: 0,
              bottom: 0,
              width: "min(420px, 95vw)",
              background: "#ffffff",
              borderLeft: "1px solid #cbd5e1",
              zIndex: 60,
              padding: "0.9rem",
              display: "grid",
              alignContent: "start",
              gap: "0.75rem",
              overflowY: "auto",
            }}
          >
            <header style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem" }}>
              <div style={{ display: "grid", gap: "0.22rem" }}>
                <span style={{ color: "#64748b", fontSize: "0.78rem" }}>
                  {kindLabel[selectedNode.kind]}
                </span>
                <strong style={{ fontSize: "1.02rem" }}>{selectedNode.label}</strong>
                {selectedNode.secondaryLabel ? (
                  <span style={{ color: "#475569" }}>{selectedNode.secondaryLabel}</span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.45rem",
                  background: "#f8fafc",
                  padding: "0.34rem 0.52rem",
                  cursor: "pointer",
                  height: "fit-content",
                }}
              >
                Chiudi
              </button>
            </header>

            <section
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "0.62rem",
                background: "#f8fafc",
                padding: "0.62rem",
                display: "grid",
                gap: "0.35rem",
              }}
            >
              <span>
                Stato: <strong>{selectedNode.status ?? "N/D"}</strong>
              </span>
              <span>
                Avanzamento: <strong>{formatNodeProgress(selectedNode.progressPct)}</strong>
              </span>
              <span>
                Sorgente: <strong>{selectedNode.sourceTable ?? "N/D"}</strong>
              </span>
            </section>

            <section style={{ display: "grid", gap: "0.38rem" }}>
              <strong>Metriche</strong>
              {selectedNode.metrics.length > 0 ? (
                selectedNode.metrics.map((metric) => (
                  <span key={`${selectedNode.id}-${metric.label}`}>
                    {metric.label}: <strong>{metric.value}</strong>
                  </span>
                ))
              ) : (
                <span style={{ color: "#64748b" }}>Nessuna metrica disponibile.</span>
              )}
            </section>

            <section style={{ display: "grid", gap: "0.38rem" }}>
              <strong>Dettagli</strong>
              {selectedNode.detailLines.length > 0 ? (
                selectedNode.detailLines.map((line) => <span key={`${selectedNode.id}-${line}`}>{line}</span>)
              ) : (
                <span style={{ color: "#64748b" }}>Nessun dettaglio disponibile.</span>
              )}
            </section>

            <section style={{ display: "grid", gap: "0.38rem" }}>
              <strong>Rimandi rapidi</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.48rem" }}>
                {selectedNode.links.map((link) => (
                  <Link
                    key={`${selectedNode.id}-drawer-${link.key}-${link.href}`}
                    href={link.href}
                    style={{
                      textDecoration: "none",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.45rem",
                      padding: "0.18rem 0.5rem",
                      color: "#1e293b",
                      background: "#f8fafc",
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          </aside>
      ) : null}
    </>
  );
}
