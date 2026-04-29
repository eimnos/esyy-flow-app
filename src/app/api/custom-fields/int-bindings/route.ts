import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createTenantIntFieldBinding,
  INT_FIELD_BINDING_DIRECTION_MODES,
  INT_FIELD_BINDING_STATUSES,
  INT_FIELD_BINDING_SYNC_MODES,
  getTenantIntFieldBindingsCatalog,
} from "@/lib/domain/custom-field-int-bindings";
import { buildAppRedirect } from "@/lib/http/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";
import { findTenantMembership, getUserTenantMemberships } from "@/lib/tenant/memberships";

const isJsonRequest = (request: Request) =>
  request.headers.get("content-type")?.toLowerCase().includes("application/json") ?? false;

const parseBool = (value: unknown) => {
  const normalized = `${value ?? ""}`.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
};

const parseText = (value: unknown) => `${value ?? ""}`.trim();

const redirectBasePath = "/configurazione/campi-personalizzati/binding-tecnici";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Utente non autenticato." }, { status: 401 });
  }

  const selectedTenantId = (await cookies()).get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    return NextResponse.json({ error: "Tenant non selezionato." }, { status: 400 });
  }

  const { memberships, error } = await getUserTenantMemberships(user.id);
  if (error || !findTenantMembership(memberships, selectedTenantId)) {
    return NextResponse.json({ error: "Tenant non valido per l'utente." }, { status: 403 });
  }

  const catalog = await getTenantIntFieldBindingsCatalog(selectedTenantId);
  return NextResponse.json(catalog, { status: catalog.error ? 400 : 200 });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const wantsJson = isJsonRequest(request);
  if (!user) {
    if (wantsJson) {
      return NextResponse.json({ error: "Utente non autenticato." }, { status: 401 });
    }
    return buildAppRedirect(request, "/login");
  }

  const selectedTenantId = (await cookies()).get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    if (wantsJson) {
      return NextResponse.json({ error: "Tenant non selezionato." }, { status: 400 });
    }
    return buildAppRedirect(request, "/select-tenant");
  }

  const { memberships, error: membershipError } = await getUserTenantMemberships(user.id);
  if (membershipError || !findTenantMembership(memberships, selectedTenantId)) {
    if (wantsJson) {
      return NextResponse.json({ error: "Tenant non valido per l'utente." }, { status: 403 });
    }
    return buildAppRedirect(request, "/select-tenant");
  }

  let payload: Record<string, unknown> = {};
  if (wantsJson) {
    payload = (await request.json()) as Record<string, unknown>;
  } else {
    const formData = await request.formData();
    payload = Object.fromEntries(formData.entries());
  }

  const status = parseText(payload.status || "draft");
  const directionMode = parseText(payload.direction_mode || "read");
  const syncMode = parseText(payload.sync_mode || "manual");

  if (!INT_FIELD_BINDING_STATUSES.includes(status as (typeof INT_FIELD_BINDING_STATUSES)[number])) {
    const message = `status non supportato: ${status}`;
    if (wantsJson) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return buildAppRedirect(request, redirectBasePath, {
      op: "int-binding-create",
      ok: "0",
      message,
    });
  }

  if (
    !INT_FIELD_BINDING_DIRECTION_MODES.includes(
      directionMode as (typeof INT_FIELD_BINDING_DIRECTION_MODES)[number],
    )
  ) {
    const message = `direction_mode non supportato: ${directionMode}`;
    if (wantsJson) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return buildAppRedirect(request, redirectBasePath, {
      op: "int-binding-create",
      ok: "0",
      message,
    });
  }

  if (!INT_FIELD_BINDING_SYNC_MODES.includes(syncMode as (typeof INT_FIELD_BINDING_SYNC_MODES)[number])) {
    const message = `sync_mode non supportato: ${syncMode}`;
    if (wantsJson) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return buildAppRedirect(request, redirectBasePath, {
      op: "int-binding-create",
      ok: "0",
      message,
    });
  }

  const result = await createTenantIntFieldBinding(selectedTenantId, user.id, {
    code: parseText(payload.code),
    status: status as (typeof INT_FIELD_BINDING_STATUSES)[number],
    customFieldDefinitionId: parseText(
      payload.custom_field_definition_id ?? payload.app_field_definition_id,
    ),
    objectTypeCode: parseText(payload.object_type_code),
    targetLevel: parseText(payload.target_level),
    lineContextType: parseText(payload.line_context_type),
    sourceSystemCode: parseText(payload.source_system_code),
    erpEntitySet: parseText(payload.erp_entity_set),
    erpObjectType: parseText(payload.erp_object_type),
    erpFieldName: parseText(payload.erp_field_name),
    erpIsUdf: parseBool(payload.erp_is_udf),
    directionMode: directionMode as (typeof INT_FIELD_BINDING_DIRECTION_MODES)[number],
    syncMode: syncMode as (typeof INT_FIELD_BINDING_SYNC_MODES)[number],
    isEnabled: parseBool(payload.is_enabled || "1"),
  });

  if (wantsJson) {
    return NextResponse.json(result, { status: result.error ? 400 : 200 });
  }

  return buildAppRedirect(request, redirectBasePath, {
    op: "int-binding-create",
    ok: result.error ? "0" : "1",
    message: result.error ?? `Binding creato (${result.bindingId ?? "n/d"}).`,
  });
}
