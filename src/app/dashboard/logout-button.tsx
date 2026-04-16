"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setSubmitting(true);
    setError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(signOutError.message);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Logout non riuscito.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "0.5rem", justifyItems: "start" }}>
      <button
        type="button"
        onClick={handleLogout}
        disabled={submitting}
        style={{
          padding: "0.6rem 0.8rem",
          cursor: submitting ? "wait" : "pointer",
        }}
      >
        {submitting ? "Uscita in corso..." : "Logout"}
      </button>
      {error ? (
        <p style={{ color: "#b91c1c", margin: 0 }} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

