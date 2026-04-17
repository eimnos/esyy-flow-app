import { buildAppRedirect } from "@/lib/http/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const response = buildAppRedirect(request, "/login");
  response.cookies.set(ACTIVE_TENANT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

