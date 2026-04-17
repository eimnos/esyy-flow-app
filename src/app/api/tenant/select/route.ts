import {
  ACTIVE_TENANT_COOKIE,
  ACTIVE_TENANT_COOKIE_MAX_AGE,
} from "@/lib/tenant/constants";
import { buildAppRedirect } from "@/lib/http/redirect";
import {
  findTenantMembership,
  getUserTenantMemberships,
} from "@/lib/tenant/memberships";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildAppRedirect(request, "/login");
  }

  const formData = await request.formData();
  const tenantId = String(formData.get("tenant_id") ?? "").trim();

  if (!tenantId) {
    return buildAppRedirect(request, "/select-tenant", { error: "tenant-required" });
  }

  const { memberships, error } = await getUserTenantMemberships(user.id);

  if (error) {
    return buildAppRedirect(request, "/select-tenant", { error: "tenant-query-failed" });
  }

  const selectedMembership = findTenantMembership(memberships, tenantId);

  if (!selectedMembership) {
    return buildAppRedirect(request, "/select-tenant", { error: "tenant-not-allowed" });
  }

  const response = buildAppRedirect(request, "/dashboard");
  response.cookies.set(ACTIVE_TENANT_COOKIE, selectedMembership.tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_TENANT_COOKIE_MAX_AGE,
  });
  return response;
}

