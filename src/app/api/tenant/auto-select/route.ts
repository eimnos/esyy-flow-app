import { NextResponse } from "next/server";

import {
  ACTIVE_TENANT_COOKIE,
  ACTIVE_TENANT_COOKIE_MAX_AGE,
} from "@/lib/tenant/constants";
import { getUserTenantMemberships } from "@/lib/tenant/memberships";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const buildRedirect = (requestUrl: string, pathname: string, searchParams?: URLSearchParams) => {
  const url = new URL(pathname, requestUrl);
  if (searchParams) {
    url.search = searchParams.toString();
  }
  return NextResponse.redirect(url);
};

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request.url, "/login");
  }

  const { memberships, error } = await getUserTenantMemberships(user.id);

  if (error) {
    const params = new URLSearchParams({ error: "tenant-query-failed" });
    return buildRedirect(request.url, "/select-tenant", params);
  }

  if (memberships.length !== 1) {
    return buildRedirect(request.url, "/select-tenant");
  }

  const response = buildRedirect(request.url, "/dashboard");
  response.cookies.set(ACTIVE_TENANT_COOKIE, memberships[0].tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_TENANT_COOKIE_MAX_AGE,
  });
  return response;
}

