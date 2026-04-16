import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env, supabaseEnvConfigured } from "@/lib/env";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

let adminClient: ReturnType<typeof createClient> | null = null;

export const hasSupabaseServiceRoleKey = serviceRoleKey.length > 0;

export const getSupabaseAdminClient = () => {
  if (!supabaseEnvConfigured) {
    throw new Error("Supabase environment variables are not configured.");
  }

  if (!hasSupabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  if (!adminClient) {
    adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
};

