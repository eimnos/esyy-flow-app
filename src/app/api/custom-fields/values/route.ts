import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildAppRedirect } from "@/lib/http/redirect";
import {
  CUSTOM_FIELD_OBJECT_TYPES,
  CUSTOM_FIELD_TARGET_LEVELS,
  getTenantCustomFieldValues,
  upsertTenantCustomFieldValue,
} from "@/lib/domain/custom-fields";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";
import { findTenantMembership, getUserTenantMemberships } from "@/lib/tenant/memberships";

const isJsonRequest = (request: Request) =>
  request.headers.get("content-type")?.toLowerCase().includes("application/json") ?? false;

const redirectBasePath = "/configurazione/campi-personalizzati";

const parseObjectType = (value: unknown) => String(value ?? "").trim();
const parseTargetLevel = (value: unknown) => String(value ?? "").trim();
const parseText = (value: unknown) => String(value ?? "").trim();

const getTenantFromCookie = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
};

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Utente non autenticato." }, { status: 401 });
  }

  const tenantId = await getTenantFromCookie();
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant non selezionato." }, { status: 400 });
  }

  const { memberships, error: membershipError } = await getUserTenantMemberships(user.id);
  if (membershipError || !findTenantMembership(memberships, tenantId)) {
    return NextResponse.json({ error: "Tenant non valido per l'utente." }, { status: 403 });
  }

  const url = new URL(request.url);
  const objectType = parseObjectType(url.searchParams.get("object_type_code"));
  const targetLevel = parseTargetLevel(url.searchParams.get("target_level"));
  const targetRecordId = parseText(url.searchParams.get("target_record_id"));
  const targetLineRecordId = parseText(url.searchParams.get("target_line_record_id"));

  if (
    !CUSTOM_FIELD_OBJECT_TYPES.includes(objectType as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number]) ||
    !CUSTOM_FIELD_TARGET_LEVELS.includes(targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number]) ||
    !targetRecordId
  ) {
    return NextResponse.json(
      { error: "Parametri query non validi: object_type_code / target_level / target_record_id." },
      { status: 400 },
    );
  }

  const result = await getTenantCustomFieldValues(tenantId, {
    objectTypeCode: objectType as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number],
    targetLevel: targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number],
    targetRecordId,
    targetLineRecordId,
  });

  return NextResponse.json(result, { status: result.error ? 400 : 200 });
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

  const tenantId = await getTenantFromCookie();
  if (!tenantId) {
    if (wantsJson) {
      return NextResponse.json({ error: "Tenant non selezionato." }, { status: 400 });
    }
    return buildAppRedirect(request, "/select-tenant");
  }

  const { memberships, error: membershipError } = await getUserTenantMemberships(user.id);
  if (membershipError || !findTenantMembership(memberships, tenantId)) {
    if (wantsJson) {
      return NextResponse.json({ error: "Tenant non valido per l'utente." }, { status: 403 });
    }
    return buildAppRedirect(request, "/select-tenant");
  }

  let payload: Record<string, unknown>;
  if (wantsJson) {
    payload = (await request.json()) as Record<string, unknown>;
  } else {
    const formData = await request.formData();
    payload = Object.fromEntries(formData.entries());
  }

  const objectType = parseObjectType(payload.object_type_code);
  const targetLevel = parseTargetLevel(payload.target_level);
  const targetRecordId = parseText(payload.target_record_id);
  const targetLineRecordId = parseText(payload.target_line_record_id);

  if (
    !CUSTOM_FIELD_OBJECT_TYPES.includes(objectType as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number]) ||
    !CUSTOM_FIELD_TARGET_LEVELS.includes(targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number]) ||
    !targetRecordId
  ) {
    const message =
      "Parametri non validi: object_type_code / target_level / target_record_id obbligatori.";
    if (wantsJson) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return buildAppRedirect(request, redirectBasePath, {
      op: "value-upsert",
      ok: "0",
      message,
      object_type_code: objectType,
      target_level: targetLevel,
      target_record_id: targetRecordId,
      target_line_record_id: targetLineRecordId,
    });
  }

  const result = await upsertTenantCustomFieldValue(tenantId, user.id, {
    customFieldDefinitionId: parseText(payload.custom_field_definition_id),
    objectTypeCode: objectType as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number],
    targetRecordId,
    targetLevel: targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number],
    targetLineRecordId,
    rawValue: parseText(payload.value),
    reason: parseText(payload.reason),
  });

  if (wantsJson) {
    return NextResponse.json(result, { status: result.error ? 400 : 200 });
  }

  return buildAppRedirect(request, redirectBasePath, {
    op: "value-upsert",
    ok: result.error ? "0" : "1",
    message: result.error ?? `Valore aggiornato (${result.valueId ?? "n/d"}).`,
    object_type_code: objectType,
    target_level: targetLevel,
    target_record_id: targetRecordId,
    target_line_record_id: targetLineRecordId,
  });
}
