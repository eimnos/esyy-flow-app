import { NextResponse } from "next/server";

import {
  ACTIVE_TENANT_COOKIE,
  ACTIVE_TENANT_COOKIE_MAX_AGE,
} from "@/lib/tenant/constants";
import {
  findTenantMembership,
  getUserTenantMemberships,
} from "@/lib/tenant/memberships";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const buildRedirect = (
  requestUrl: string,
  pathname: string,
  params?: Record<string, string>,
) => {
  const url = new URL(pathname, requestUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return NextResponse.redirect(url);
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request.url, "/login");
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenant_id") ?? "").trim();

  if (!tenantId) {
    return buildRedirect(request.url, "/select-tenant", { error: "tenant-required" });
  }

  const { memberships, error } = await getUserTenantMemberships(user.id);

  if (error) {
    return buildRedirect(request.url, "/select-tenant", { error: "tenant-query-failed" });
  }

  const selectedMembership = findTenantMembership(memberships, tenantId);

  if (!selectedMembership) {
    return buildRedirect(request.url, "/select-tenant", { error: "tenant-not-allowed" });
  }

  const response = buildRedirect(request.url, "/dashboard");
  response.cookies.set(ACTIVE_TENANT_COOKIE, selectedMembership.tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_TENANT_COOKIE_MAX_AGE,
  });
  return response;
}

