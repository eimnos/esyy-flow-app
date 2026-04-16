import { NextResponse, type NextRequest } from "next/server";

import { ACTIVE_TENANT_COOKIE } from "./src/lib/tenant/constants";
import { updateSupabaseSession } from "./src/lib/supabase/middleware";

const copyCookies = (from: NextResponse, to: NextResponse) => {
  from.cookies.getAll().forEach(({ name, value, ...options }) => {
    to.cookies.set(name, value, options);
  });
};

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);
  const pathname = request.nextUrl.pathname;
  const protectedPrefixes = [
    "/dashboard",
    "/anagrafiche",
    "/odp",
    "/mes",
    "/conto-lavoro",
  ];
  const isProtectedAppRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isAuthRoute = pathname === "/login";
  const isTenantSelectionRoute = pathname === "/select-tenant";
  const selectedTenantId = request.cookies.get(ACTIVE_TENANT_COOKIE)?.value ?? "";

  if (isProtectedAppRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    if (pathname !== "/dashboard") {
      redirectUrl.searchParams.set("next", pathname);
    }

    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = selectedTenantId ? "/dashboard" : "/select-tenant";
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (isTenantSelectionRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (isProtectedAppRoute && user && !selectedTenantId) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/select-tenant";
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/select-tenant",
    "/dashboard/:path*",
    "/anagrafiche/:path*",
    "/odp/:path*",
    "/mes/:path*",
    "/conto-lavoro/:path*",
  ],
};

