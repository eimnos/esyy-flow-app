const supabaseUrlCandidates = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
  "SUPABASE_PROJECT_URL",
] as const;

const supabaseKeyCandidates = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
] as const;

type EnvCandidate = (typeof supabaseUrlCandidates)[number] | (typeof supabaseKeyCandidates)[number];

const pickEnv = (names: readonly EnvCandidate[]) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return { value, name };
    }
  }

  return { value: "", name: "missing" as const };
};

const url = pickEnv(supabaseUrlCandidates);
const key = pickEnv(supabaseKeyCandidates);

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: url.value,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: key.value,
} as const;

export const supabaseEnvConfigured = url.value.length > 0 && key.value.length > 0;

export const supabaseEnvSource =
  url.name !== "missing" && key.name !== "missing"
    ? `${url.name}+${key.name}`
    : "missing";

export const supabaseEnvDiagnostics = {
  supabaseUrlVar: url.name,
  supabaseKeyVar: key.name,
  serviceRoleKeyPresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  runtimeContext: process.env.CONTEXT ?? "unknown",
} as const;

