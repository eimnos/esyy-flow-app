import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CommessaDetailTabs } from "@/app/(app)/commesse/_components/commessa-detail-tabs";
import { getTenantCommessaOverviewById } from "@/lib/domain/commesse";
import { getTenantCommessaProduction } from "@/lib/domain/commessa-production";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type CommessaProductionPageProps = {
  params: Promise<{
    commessaId: string;
  }>;
  searchParams: Promise<{
    odp?: string | string[];
  }>;
};

type OdpPhaseLinkSummary = {
  key: string;
  label: string;
  phasesTotal: number;
  delayedPhases: number;
  blockedPhases: number;
  externalPhases: number;
  avgProgress: number | null;
  linkedOrderId: string | null;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const formatPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return `${Math.round(value)}%`;
};

const formatNumber = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return value.toLocaleString("it-IT", { maximumFractionDigits: 2 });
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "N/D";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const delayLabel = (isDelayed: boolean, delayDays: number | null) => {
  if (!isDelayed) {
    return "No";
  }
  if (delayDays === null) {
    return "Si";
  }
  return `Si (${delayDays} gg)`;
};

const blockedLabel = (isBlocked: boolean) => (isBlocked ? "Bloccato" : "No");

const externalLabel = (value: boolean | null) => {
  if (value === null) {
    return "N/D";
  }
  return value ? "Esterna" : "Interna";
};

const qualityLabel = (value: boolean | null) => {
  if (value === null) {
    return "N/D";
  }
  return value ? "Si" : "No";
};

const average = (values: Array<number | null>) => {
  const validValues = values.filter((value): value is number => value !== null);
  if (validValues.length === 0) {
    return null;
  }

  const total = validValues.reduce((sum, value) => sum + value, 0);
  return Math.round((total / validValues.length) * 100) / 100;
};

export default async function CommessaProductionPage({
  params,
  searchParams,
}: CommessaProductionPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const odpFilter = normalizeParam(resolvedSearchParams.odp) || "all";
  const overview = await getTenantCommessaOverviewById(selectedTenantId, resolvedParams.commessaId);
  if (!overview.commessa && !overview.error) {
    notFound();
  }

  const production = await getTenantCommessaProduction(selectedTenantId, resolvedParams.commessaId);

  const orderById = new Map(production.orders.map((order) => [order.id, order]));
  const orderByCode = new Map(production.orders.map((order) => [order.code, order]));

  const resolvePhaseOrder = (orderId: string | null, orderCode: string | null) => {
    if (orderId) {
      const order = orderById.get(orderId);
      if (order) {
        return {
          key: `id:${order.id}`,
          label: `${order.code} - ${order.name}`,
          linkedOrderId: order.id,
        };
      }
      return {
        key: `id:${orderId}`,
        label: orderCode ?? orderId,
        linkedOrderId: orderId,
      };
    }

    if (orderCode) {
      const order = orderByCode.get(orderCode);
      if (order) {
        return {
          key: `id:${order.id}`,
          label: `${order.code} - ${order.name}`,
          linkedOrderId: order.id,
        };
      }
      return {
        key: `code:${orderCode}`,
        label: orderCode,
        linkedOrderId: null,
      };
    }

    return {
      key: "unlinked",
      label: "Fasi senza ODP esplicito",
      linkedOrderId: null,
    };
  };

  const phaseLinkMap = new Map<
    string,
    {
      label: string;
      linkedOrderId: string | null;
      phasesTotal: number;
      delayedPhases: number;
      blockedPhases: number;
      externalPhases: number;
      progresses: Array<number | null>;
    }
  >();

  for (const order of production.orders) {
    phaseLinkMap.set(`id:${order.id}`, {
      label: `${order.code} - ${order.name}`,
      linkedOrderId: order.id,
      phasesTotal: 0,
      delayedPhases: 0,
      blockedPhases: 0,
      externalPhases: 0,
      progresses: [],
    });
  }

  const phaseOrderKeyByPhaseId = new Map<string, string>();
  for (const phase of production.phases) {
    const resolved = resolvePhaseOrder(phase.orderId, phase.orderCode);
    phaseOrderKeyByPhaseId.set(phase.id, resolved.key);
    const current = phaseLinkMap.get(resolved.key) ?? {
      label: resolved.label,
      linkedOrderId: resolved.linkedOrderId,
      phasesTotal: 0,
      delayedPhases: 0,
      blockedPhases: 0,
      externalPhases: 0,
      progresses: [] as Array<number | null>,
    };

    current.phasesTotal += 1;
    current.delayedPhases += phase.isDelayed ? 1 : 0;
    current.blockedPhases += phase.isBlocked ? 1 : 0;
    current.externalPhases += phase.isExternal === true ? 1 : 0;
    current.progresses.push(phase.progressPct);

    phaseLinkMap.set(resolved.key, current);
  }

  const odpPhaseLinks: OdpPhaseLinkSummary[] = [...phaseLinkMap.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      phasesTotal: value.phasesTotal,
      delayedPhases: value.delayedPhases,
      blockedPhases: value.blockedPhases,
      externalPhases: value.externalPhases,
      avgProgress: average(value.progresses),
      linkedOrderId: value.linkedOrderId,
    }))
    .filter((entry) => entry.phasesTotal > 0 || entry.linkedOrderId !== null)
    .sort((left, right) => {
      if (left.phasesTotal !== right.phasesTotal) {
        return right.phasesTotal - left.phasesTotal;
      }
      return left.label.localeCompare(right.label, "it");
    });

  const validOdpFilter = odpFilter === "all" || odpPhaseLinks.some((entry) => entry.key === odpFilter);
  const activeOdpFilter = validOdpFilter ? odpFilter : "all";
  const odpPhaseLinkByKey = new Map(odpPhaseLinks.map((entry) => [entry.key, entry]));
  const filteredPhases =
    activeOdpFilter === "all"
      ? production.phases
      : production.phases.filter((phase) => phaseOrderKeyByPhaseId.get(phase.id) === activeOdpFilter);

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1280px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <h1 style={{ margin: 0 }}>Commesse / Produzione commessa</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Cabina di regia read-only con doppia vista ODP/Fasi e indicatori sintetici di avanzamento.
          </p>
        </div>
        <Link href={`/commesse/${resolvedParams.commessaId}`}>Torna a overview commessa</Link>
      </header>

      <CommessaDetailTabs commessaId={resolvedParams.commessaId} activeTab="produzione" />

      {overview.error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            border: "1px solid #fecaca",
            borderRadius: "0.65rem",
            background: "#fef2f2",
            color: "#991b1b",
            padding: "0.8rem",
          }}
        >
          {overview.error}
        </p>
      ) : null}

      {production.error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            border: "1px solid #fecaca",
            borderRadius: "0.65rem",
            background: "#fef2f2",
            color: "#991b1b",
            padding: "0.8rem",
          }}
        >
          {production.error}
        </p>
      ) : null}

      {overview.commessa ? (
        <section
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "0.75rem",
            background: "#fff",
            padding: "0.85rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.7rem",
          }}
        >
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Codice commessa</span>
            <strong>{overview.commessa.code}</strong>
          </div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Descrizione</span>
            <span>{overview.commessa.name}</span>
          </div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Stato</span>
            <span>{overview.commessa.status}</span>
          </div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Priorita</span>
            <span>{overview.commessa.priority}</span>
          </div>
        </section>
      ) : null}

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.85rem",
          display: "grid",
          gap: "0.7rem",
        }}
      >
        <strong>Situazione sintetica produzione commessa</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.6rem",
          }}
        >
          {[
            ["ODP collegati", `${production.summary.ordersTotal}`],
            ["Fasi collegate", `${production.summary.phasesTotal}`],
            ["Avanzamento medio ODP", formatPercent(production.summary.avgOrderProgress)],
            ["Avanzamento medio fasi", formatPercent(production.summary.avgPhaseProgress)],
            ["ODP in ritardo", `${production.summary.delayedOrders}`],
            ["ODP bloccati", `${production.summary.blockedOrders}`],
            ["Fasi esterne", `${production.summary.externalPhases}`],
            ["Criticita aperte", formatNumber(production.summary.openIssues)],
            ["Semilavorati critici", formatNumber(production.summary.semiCritical)],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "0.65rem",
                background: "#f8fafc",
                padding: "0.65rem",
                display: "grid",
                gap: "0.2rem",
              }}
            >
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.85rem",
          display: "grid",
          gap: "0.7rem",
        }}
      >
        <strong>Relazione ODP ↔ Fasi</strong>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
          Le tabelle restano distinte per mantenere leggibile il livello ordine (ODP) rispetto al
          livello operativo (fasi). Usa il filtro ODP per leggere le fasi del solo ordine selezionato.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.6rem",
          }}
        >
          {odpPhaseLinks.map((entry) => {
            const selected = activeOdpFilter === entry.key;
            return (
              <article
                key={entry.key}
                style={{
                  border: selected ? "1px solid #0f172a" : "1px solid #e2e8f0",
                  borderRadius: "0.65rem",
                  background: selected ? "#f8fafc" : "#fff",
                  padding: "0.65rem",
                  display: "grid",
                  gap: "0.25rem",
                }}
              >
                <strong>{entry.label}</strong>
                <span style={{ fontSize: "0.85rem", color: "#334155" }}>
                  Fasi: {entry.phasesTotal} · Ritardo: {entry.delayedPhases} · Blocchi: {entry.blockedPhases}
                </span>
                <span style={{ fontSize: "0.85rem", color: "#334155" }}>
                  Esterne: {entry.externalPhases} · Avanzamento medio: {formatPercent(entry.avgProgress)}
                </span>
                <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
                  <Link href={`/commesse/${resolvedParams.commessaId}/produzione?odp=${encodeURIComponent(entry.key)}#fasi`}>
                    Vedi fasi collegate
                  </Link>
                  {selected ? (
                    <Link href={`/commesse/${resolvedParams.commessaId}/produzione#fasi`}>
                      Reset filtro
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          overflowX: "auto",
        }}
      >
        <header style={{ padding: "0.85rem", borderBottom: "1px solid #e2e8f0", display: "grid", gap: "0.25rem" }}>
          <strong>Elenco ODP collegati</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Vista read-only con avanzamento, ritardi, blocchi, fasi esterne e criticita.
          </p>
        </header>

        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1220px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "ODP",
                "Stato",
                "Avanzamento",
                "Ritardo",
                "Blocchi",
                "Fasi",
                "Tipo",
                "Criticita/Semilavorati",
                "Date",
                "Azioni",
              ].map((header) => (
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
            {production.orders.map((order) => {
              const linkedPhases = odpPhaseLinkByKey.get(`id:${order.id}`);
              const orderSelected = activeOdpFilter === `id:${order.id}`;

              return (
                <tr
                  key={`${order.sourceTable}-${order.id}`}
                  style={orderSelected ? { background: "#f8fafc" } : undefined}
                >
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>{order.code}</strong>
                      <span style={{ color: "#475569", fontSize: "0.85rem" }}>{order.name}</span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>Sorgente: {order.sourceTable}</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>{order.status}</td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {formatPercent(order.progressPct)}
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {delayLabel(order.isDelayed, order.delayDays)}
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {blockedLabel(order.isBlocked)}
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>
                        {formatNumber(order.completedPhases)} / {formatNumber(order.phaseCount)}
                      </span>
                      <span style={{ color: "#334155", fontSize: "0.8rem" }}>
                        Fasi collegate: {linkedPhases?.phasesTotal ?? 0}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Ritardo: {linkedPhases?.delayedPhases ?? 0} · Blocchi: {linkedPhases?.blockedPhases ?? 0}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {externalLabel(order.isExternal)}
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>Criticita: {formatNumber(order.openIssues)}</span>
                      <span>Semilavorati critici: {formatNumber(order.semiCritical)}</span>
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>Inizio: {formatDateTime(order.startedAt)}</span>
                      <span>Fine: {formatDateTime(order.completedAt)}</span>
                      <span>Scadenza: {formatDateTime(order.dueDate)}</span>
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Link href={`/commesse/${resolvedParams.commessaId}/produzione?odp=${encodeURIComponent(`id:${order.id}`)}#fasi`}>
                        Filtra fasi ODP
                      </Link>
                      <Link href="/odp">Apri ODP (placeholder)</Link>
                      <Link href="/mes">Apri MES (placeholder)</Link>
                      <Link href="/conto-lavoro">Apri conto lavoro (placeholder)</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {production.orders.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessun ODP collegato</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              {production.emptyStateHint ??
                "Il dominio non espone ancora ODP collegati alla commessa selezionata."}
            </p>
          </section>
        ) : null}
      </section>

      <section
        id="fasi"
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          overflowX: "auto",
        }}
      >
        <header style={{ padding: "0.85rem", borderBottom: "1px solid #e2e8f0", display: "grid", gap: "0.25rem" }}>
          <strong>Elenco fasi e stato avanzamento (letto insieme agli ODP)</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Seleziona un ODP per isolare le fasi collegate e leggere in modo diretto il rapporto
            ordine-esecuzione.
          </p>
        </header>

        <form
          method="get"
          style={{
            padding: "0.85rem",
            borderBottom: "1px solid #e2e8f0",
            display: "grid",
            gridTemplateColumns: "minmax(220px, 1fr) auto auto",
            gap: "0.55rem",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#334155" }}>Focus ODP</span>
            <select name="odp" defaultValue={activeOdpFilter} style={{ padding: "0.5rem 0.6rem" }}>
              <option value="all">Tutti gli ODP</option>
              {odpPhaseLinks.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label} ({entry.phasesTotal} fasi)
                </option>
              ))}
            </select>
          </label>
          <button type="submit" style={{ padding: "0.5rem 0.75rem", cursor: "pointer" }}>
            Applica
          </button>
          {activeOdpFilter !== "all" ? (
            <Link href={`/commesse/${resolvedParams.commessaId}/produzione#fasi`}>Reset filtro</Link>
          ) : (
            <span style={{ color: "#475569", fontSize: "0.85rem" }}>
              Vista completa ODP/Fasi
            </span>
          )}
        </form>

        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1220px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "ODP",
                "Fase",
                "Stato",
                "Avanzamento",
                "Ritardo",
                "Tipo fase",
                "Qualita",
                "Blocchi",
                "Criticita/Semilavorati",
                "Azioni",
              ].map((header) => (
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
            {filteredPhases.map((phase) => {
              const phaseOrderKey = phaseOrderKeyByPhaseId.get(phase.id) ?? "unlinked";
              const phaseOrder = odpPhaseLinkByKey.get(phaseOrderKey);
              const phaseSelected = activeOdpFilter !== "all" && phaseOrderKey === activeOdpFilter;

              return (
                <tr
                  key={`${phase.sourceTable}-${phase.id}`}
                  style={phaseSelected ? { background: "#f8fafc" } : undefined}
                >
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>{phase.orderCode ?? phase.orderId ?? "N/D"}</strong>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Associazione: {phaseOrder?.label ?? "Fase non agganciata a ODP esplicito"}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>
                        {phase.phaseNo ?? "-"} - {phase.phaseCode}
                      </strong>
                      <span style={{ color: "#475569", fontSize: "0.85rem" }}>{phase.phaseName}</span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>Sorgente: {phase.sourceTable}</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>{phase.status}</td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {formatPercent(phase.progressPct)}
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {delayLabel(phase.isDelayed, phase.delayDays)}
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {externalLabel(phase.isExternal)}
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {qualityLabel(phase.hasQuality)}
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {blockedLabel(phase.isBlocked)}
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>Criticita: {formatNumber(phase.openIssues)}</span>
                      <span>Semilavorati critici: {formatNumber(phase.semiCritical)}</span>
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Link href="/mes">Apri MES (placeholder)</Link>
                      <Link href="/conto-lavoro">Apri conto lavoro (placeholder)</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredPhases.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessuna fase collegata</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              {activeOdpFilter !== "all"
                ? "Nessuna fase disponibile per l'ODP selezionato."
                : "Il dominio non espone ancora fasi collegate alla commessa selezionata, o sono disponibili solo a livello ODP."}
            </p>
          </section>
        ) : null}
      </section>

      <section
        style={{
          borderTop: "1px solid #e2e8f0",
          paddingTop: "0.8rem",
          display: "grid",
          gap: "0.45rem",
        }}
      >
        <strong>Accessi rapidi</strong>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href={`/commesse/${resolvedParams.commessaId}`}>Torna a overview commessa</Link>
          <Link href={`/commesse/${resolvedParams.commessaId}/documenti`}>Apri documenti commessa</Link>
          <Link href={`/commesse/${resolvedParams.commessaId}/approvvigionamenti`}>
            Apri approvvigionamenti commessa
          </Link>
          <Link href={`/commesse/${resolvedParams.commessaId}/conto-lavoro`}>
            Apri conto lavoro commessa
          </Link>
          <Link href={`/commesse/${resolvedParams.commessaId}/costi-fatturato`}>
            Apri costi/fatturato commessa
          </Link>
          <Link href={`/commesse/${resolvedParams.commessaId}/tracciabilita`}>
            Apri tracciabilita commessa
          </Link>
          <Link href="/odp">Apri area ODP (placeholder)</Link>
          <Link href="/mes">Apri area MES (placeholder)</Link>
          <Link href="/conto-lavoro">Apri area conto lavoro (modulo)</Link>
        </div>
      </section>

      {production.sourceTables.length > 0 ? (
        <p style={{ margin: 0, color: "#334155", fontSize: "0.85rem" }}>
          Sorgenti DB: <strong>{production.sourceTables.join(", ")}</strong>
        </p>
      ) : null}

      {production.warnings.length > 0 ? (
        <section
          style={{
            border: "1px solid #fde68a",
            borderRadius: "0.65rem",
            background: "#fffbeb",
            padding: "0.75rem",
            display: "grid",
            gap: "0.35rem",
          }}
        >
          <strong style={{ fontSize: "0.9rem" }}>Warning query</strong>
          {production.warnings.map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
      ) : null}
    </section>
  );
}
