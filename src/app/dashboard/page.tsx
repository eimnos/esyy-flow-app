import { redirect } from "next/navigation";

import LogoutButton from "@/app/dashboard/logout-button";
import { supabaseEnvConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!supabaseEnvConfigured) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
        <LogoutButton />
      </section>
    </main>
  );
}
