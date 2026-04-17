import {
  ACTIVE_TENANT_COOKIE,
  ACTIVE_TENANT_COOKIE_MAX_AGE,
} from "@/lib/tenant/constants";
import { buildAppRedirect } from "@/lib/http/redirect";
import { getUserTenantMemberships } from "@/lib/tenant/memberships";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildAppRedirect(request, "/login");
  }

  const { memberships, error } = await getUserTenantMemberships(user.id);

  if (error) {
    const params = new URLSearchParams({ error: "tenant-query-failed" });
    return buildAppRedirect(request, "/select-tenant", params);
  }

  if (memberships.length !== 1) {
    return buildAppRedirect(request, "/select-tenant");
  }

  const response = buildAppRedirect(request, "/dashboard");
  response.cookies.set(ACTIVE_TENANT_COOKIE, memberships[0].tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_TENANT_COOKIE_MAX_AGE,
  });
  return response;
}

