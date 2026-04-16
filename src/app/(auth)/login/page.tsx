"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const redirectTarget =
        typeof window === "undefined"
          ? "/dashboard"
          : new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
      const safeTarget = redirectTarget.startsWith("/") ? redirectTarget : "/dashboard";
      router.replace(safeTarget);
      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Login non riuscito.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "420px",
          display: "grid",
          gap: "0.75rem",
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          padding: "1.25rem",
          background: "#fff",
        }}
      >
        <h1 style={{ marginBottom: "0.25rem" }}>Login</h1>
        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ padding: "0.55rem 0.65rem" }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ padding: "0.55rem 0.65rem" }}
          />
        </label>
        {error ? (
          <p style={{ color: "#b91c1c", margin: 0 }} role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: "0.4rem",
            padding: "0.65rem 0.75rem",
            cursor: submitting ? "wait" : "pointer",
          }}
        >
          {submitting ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>
    </main>
  );
}

