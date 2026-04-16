const readEnv = (name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") =>
  process.env[name]?.trim() ?? "";

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
} as const;

export const supabaseEnvConfigured =
  env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0;

