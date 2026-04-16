import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { hasSupabaseServiceRoleKey } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";
import {
  findTenantMembership,
  getUserTenantMemberships,
} from "@/lib/tenant/memberships";

export const dynamic = "force-dynamic";

type SelectTenantPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value ?? "";

const resolveErrorMessage = (errorCode: string, queryError: string | null) => {
  if (queryError) {
    return `Errore di lettura tenant: ${queryError}`;
  }

  const byCode: Record<string, string> = {
    "tenant-query-failed": "Impossibile leggere le membership tenant.",
    "tenant-required": "Seleziona un tenant prima di continuare.",
    "tenant-not-allowed": "Il tenant selezionato non è associato al tuo utente.",
    "no-memberships": "Nessuna membership tenant valida per questo utente.",
  };

  return byCode[errorCode] ?? "";
};

export default async function SelectTenantPage({ searchParams }: SelectTenantPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const routeErrorCode = normalizeParam(params.error);

  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";

  const { memberships, error: queryError } = await getUserTenantMemberships(user.id);
  const errorMessage = resolveErrorMessage(routeErrorCode, queryError);
  const activeMembership = findTenantMembership(memberships, selectedTenantId);

  if (memberships.length === 1) {
    redirect("/api/tenant/auto-select");
  }

  if (activeMembership) {
    redirect("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "620px",
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          padding: "1.25rem",
          display: "grid",
          gap: "0.9rem",
          background: "#fff",
        }}
      >
        <h1 style={{ margin: 0 }}>Selezione tenant</h1>
        <p style={{ margin: 0 }}>
          Utente autenticato: <strong>{user.email ?? user.id}</strong>
        </p>
        <p style={{ margin: 0 }}>
          Seleziona il tenant da usare per continuare in dashboard.
        </p>

        {!hasSupabaseServiceRoleKey ? (
          <p style={{ margin: 0, color: "#b91c1c" }} role="alert">
            SUPABASE_SERVICE_ROLE_KEY non configurata: impossibile risolvere le membership.
          </p>
        ) : null}

        {errorMessage ? (
          <p style={{ margin: 0, color: "#b91c1c" }} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {memberships.length === 0 ? (
          <p style={{ margin: 0, color: "#7f1d1d" }} role="alert">
            Nessuna membership valida trovata. Contatta l&apos;amministratore.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {memberships.map((membership) => (
              <form
                key={membership.tenantId}
                method="post"
                action="/api/tenant/select"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.6rem",
                }}
              >
                <div style={{ display: "grid", gap: "0.2rem" }}>
                  <strong>{membership.tenantName}</strong>
                  <span style={{ fontSize: "0.92rem" }}>
                    ruolo: <strong>{membership.role}</strong>
                    {membership.tenantCode ? ` · code: ${membership.tenantCode}` : ""}
                  </span>
                </div>
                <input type="hidden" name="tenant_id" value={membership.tenantId} />
                <button
                  type="submit"
                  style={{ padding: "0.5rem 0.75rem", cursor: "pointer" }}
                >
                  Usa tenant
                </button>
              </form>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

