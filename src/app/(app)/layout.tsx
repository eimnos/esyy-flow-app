import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { hasSupabaseServiceRoleKey } from "@/lib/supabase/admin";
import { supabaseEnvConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";
import {
  findTenantMembership,
  getUserTenantMemberships,
} from "@/lib/tenant/memberships";

export const dynamic = "force-dynamic";

type AppLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const navItems = [
  { href: "/dashboard", label: "Dashboard", enabled: true },
  { href: "/anagrafiche", label: "Anagrafiche", enabled: true },
  { href: "/anagrafiche/articoli-prodotto", label: "Articoli prodotto", enabled: true },
  { href: "/odp", label: "ODP", enabled: true },
  { href: "/mes", label: "MES", enabled: true },
  { href: "/conto-lavoro", label: "Conto Lavoro", enabled: true },
];

export default async function AppLayout({ children }: AppLayoutProps) {
  if (!supabaseEnvConfigured || !hasSupabaseServiceRoleKey) {
    redirect("/login");
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

  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

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
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateRows: "64px 1fr" }}>
      <header
        style={{
          borderBottom: "1px solid #d1d5db",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1rem",
          gap: "1rem",
        }}
      >
        <div style={{ display: "grid", gap: "0.1rem" }}>
          <strong>Esyy Flow</strong>
          <span style={{ fontSize: "0.82rem", color: "#4b5563" }}>
            Tenant: {selectedMembership.tenantName}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#4b5563" }}>
            {user.email ?? user.id}
          </span>
          <form method="post" action="/api/auth/logout">
            <button
              type="submit"
              style={{ padding: "0.45rem 0.7rem", cursor: "pointer" }}
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: 0 }}>
        <aside
          style={{
            borderRight: "1px solid #d1d5db",
            padding: "1rem 0.75rem",
            background: "#f8fafc",
          }}
        >
          <nav style={{ display: "grid", gap: "0.4rem" }}>
            {navItems.map((item) =>
              item.enabled ? (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: "0.55rem 0.65rem",
                    borderRadius: "0.5rem",
                    border: "1px solid transparent",
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  key={item.href}
                  style={{
                    padding: "0.55rem 0.65rem",
                    borderRadius: "0.5rem",
                    color: "#6b7280",
                  }}
                >
                  {item.label}
                </span>
              ),
            )}
          </nav>
        </aside>

        <main style={{ padding: "1rem", minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}

