const browserUrlFromNextPublic = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const browserUrlFromProjectAlias =
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL?.trim() ?? "";
const browserKeyFromAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const browserKeyFromPublishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

const browserUrl = browserUrlFromNextPublic || browserUrlFromProjectAlias;
const browserUrlName = browserUrlFromNextPublic
  ? "NEXT_PUBLIC_SUPABASE_URL"
  : browserUrlFromProjectAlias
    ? "NEXT_PUBLIC_SUPABASE_PROJECT_URL"
    : "missing";

const browserKey = browserKeyFromAnon || browserKeyFromPublishable;
const browserKeyName = browserKeyFromAnon
  ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  : browserKeyFromPublishable
    ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    : "missing";

const serverSupabaseUrlCandidates = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
  "SUPABASE_PROJECT_URL",
] as const;

const serverSupabaseKeyCandidates = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
] as const;

type ServerEnvCandidate =
  | (typeof serverSupabaseUrlCandidates)[number]
  | (typeof serverSupabaseKeyCandidates)[number];

const pickServerEnv = (names: readonly ServerEnvCandidate[]) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return { value, name };
    }
  }

  return { value: "", name: "missing" as const };
};

const serverUrl = pickServerEnv(serverSupabaseUrlCandidates);
const serverKey = pickServerEnv(serverSupabaseKeyCandidates);

const inBrowser = typeof window !== "undefined";
const url = inBrowser
  ? { value: browserUrl, name: browserUrlName }
  : { value: serverUrl.value, name: serverUrl.name };
const key = inBrowser
  ? { value: browserKey, name: browserKeyName }
  : { value: serverKey.value, name: serverKey.name };

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

