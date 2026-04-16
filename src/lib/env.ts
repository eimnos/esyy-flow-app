const readFirstEnv = (names: readonly string[]) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
};

const hasNextPublicPair =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());

const hasSupabasePair =
  Boolean(process.env.SUPABASE_URL?.trim()) &&
  Boolean(process.env.SUPABASE_ANON_KEY?.trim());

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: readFirstEnv([
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
  ]),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: readFirstEnv([
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
  ]),
} as const;

export const supabaseEnvConfigured =
  env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0;

export const supabaseEnvSource = hasNextPublicPair
  ? "next_public"
  : hasSupabasePair
    ? "supabase"
    : "missing";

