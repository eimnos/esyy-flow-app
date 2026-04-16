import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LogoutButton from "@/app/dashboard/logout-button";
import { hasSupabaseServiceRoleKey } from "@/lib/supabase/admin";
import { supabaseEnvConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";
import {
  findTenantMembership,
  getUserTenantMemberships,
} from "@/lib/tenant/memberships";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!supabaseEnvConfigured || !hasSupabaseServiceRoleKey) {
    redirect("/select-tenant?error=tenant-query-failed");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  const { memberships, error } = await getUserTenantMemberships(user.id);

  if (error) {
    redirect("/select-tenant?error=tenant-query-failed");
  }

  if (memberships.length === 0) {
    redirect("/select-tenant?error=no-memberships");
  }

  const selectedMembership = findTenantMembership(memberships, selectedTenantId);

  if (!selectedMembership) {
    if (memberships.length === 1) {
      redirect("/api/tenant/auto-select");
    }
    redirect("/select-tenant");
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
          maxWidth: "760px",
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          padding: "1.25rem",
          display: "grid",
          gap: "0.75rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <p style={{ margin: 0 }}>Accesso autenticato confermato.</p>
        <p style={{ margin: 0 }}>
          Utente corrente: <strong>{user.email ?? user.id}</strong>
        </p>
        <p style={{ margin: 0 }}>
          Tenant attivo: <strong>{selectedMembership.tenantName}</strong> · ruolo{" "}
          <strong>{selectedMembership.role}</strong>
        </p>
        <LogoutButton />
      </section>
    </main>
  );
}
