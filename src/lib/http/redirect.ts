import { NextResponse } from "next/server";

const firstForwardedValue = (value: string | null) => {
  if (!value) {
    return "";
  }
  return value.split(",")[0]?.trim() ?? "";
};

const resolvePublicOrigin = (request: Request) => {
  const requestUrl = new URL(request.url);
  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto"));

  if (forwardedHost) {
    const protocol = forwardedProto || requestUrl.protocol.replace(":", "") || "https";
    return `${protocol}://${forwardedHost}`;
  }

  return `${requestUrl.protocol}//${requestUrl.host}`;
};

export const buildAppRedirect = (
  request: Request,
  pathname: string,
  params?: URLSearchParams | Record<string, string>,
) => {
  const url = new URL(pathname, resolvePublicOrigin(request));

  if (params instanceof URLSearchParams) {
    url.search = params.toString();
  } else if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return NextResponse.redirect(url);
};
