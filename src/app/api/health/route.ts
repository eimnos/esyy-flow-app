import { NextResponse } from "next/server";

import { supabaseEnvConfigured, supabaseEnvSource } from "@/lib/env";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "esyy-flow-app",
      timestamp: new Date().toISOString(),
      checks: {
        supabaseEnv: supabaseEnvConfigured ? "configured" : "missing",
        supabaseEnvSource,
      },
    },
    { status: 200 },
  );
}

