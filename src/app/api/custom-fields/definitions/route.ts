import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildAppRedirect } from "@/lib/http/redirect";
import {
  createTenantCustomFieldDefinition,
  CUSTOM_FIELD_OBJECT_TYPES,
  CUSTOM_FIELD_TARGET_LEVELS,
  CUSTOM_FIELD_V1_TYPES,
  getTenantCustomFieldCatalog,
} from "@/lib/domain/custom-fields";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";
import { findTenantMembership, getUserTenantMemberships } from "@/lib/tenant/memberships";

const parseBool = (value: string | null | undefined) =>
  value === "1" || value === "true" || value === "yes" || value === "on";

const parseSortOrder = (value: unknown) => {
  const numeric =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(numeric)) {
    return 100;
  }
  const truncated = Math.trunc(numeric);
  return Math.max(1, Math.min(10000, truncated));
};

const parseEnumOptions = (value: string | null | undefined) => {
  const text = (value ?? "").trim();
  if (!text) {
    return [];
  }
  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
};

const isJsonRequest = (request: Request) =>
  request.headers.get("content-type")?.toLowerCase().includes("application/json") ?? false;

const redirectBasePath = "/configurazione/campi-personalizzati";

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

  const catalog = await getTenantCustomFieldCatalog(selectedTenantId);
  return NextResponse.json(catalog);
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

  const fieldType = String(payload.field_type ?? "");
  const targetLevel = String(payload.target_level ?? "");
  const objectTypeCode = String(payload.object_type_code ?? "");

  if (!CUSTOM_FIELD_V1_TYPES.includes(fieldType as (typeof CUSTOM_FIELD_V1_TYPES)[number])) {
    const message = `field_type non supportato: ${fieldType}`;
    if (wantsJson) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return buildAppRedirect(request, redirectBasePath, {
      op: "definition-create",
      ok: "0",
      message,
    });
  }

  if (!CUSTOM_FIELD_TARGET_LEVELS.includes(targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number])) {
    const message = `target_level non supportato: ${targetLevel}`;
    if (wantsJson) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return buildAppRedirect(request, redirectBasePath, {
      op: "definition-create",
      ok: "0",
      message,
    });
  }

  if (!CUSTOM_FIELD_OBJECT_TYPES.includes(objectTypeCode as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number])) {
    const message = `object_type_code non supportato: ${objectTypeCode}`;
    if (wantsJson) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return buildAppRedirect(request, redirectBasePath, {
      op: "definition-create",
      ok: "0",
      message,
    });
  }

  const result = await createTenantCustomFieldDefinition(selectedTenantId, user.id, {
    code: String(payload.code ?? ""),
    label: String(payload.label ?? ""),
    description: String(payload.description ?? ""),
    fieldType: fieldType as (typeof CUSTOM_FIELD_V1_TYPES)[number],
    targetLevel: targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number],
    objectTypeCode: objectTypeCode as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number],
    screenCode: String(payload.screen_code ?? "general"),
    sectionCode: String(payload.section_code ?? "general"),
    lineContextType: String(payload.line_context_type ?? ""),
    fieldDomainCode: String(payload.field_domain_code ?? "general"),
    isRequired: parseBool(String(payload.is_required ?? "")),
    isReadOnly: parseBool(String(payload.is_read_only ?? "")),
    isFilterable: parseBool(String(payload.is_filterable ?? "")),
    isSearchable: parseBool(String(payload.is_searchable ?? "")),
    isReportable: parseBool(String(payload.is_reportable ?? "")),
    isDefaultVisible: !parseBool(String(payload.is_default_visible ?? "1")) ? false : true,
    visibilityMode: String(payload.visibility_mode ?? "visible") === "hidden" ? "hidden" : "visible",
    editabilityMode:
      String(payload.editability_mode ?? "editable") === "read_only" ? "read_only" : "editable",
    requirednessMode:
      String(payload.requiredness_mode ?? "optional") === "required" ? "required" : "optional",
    enumOptions: parseEnumOptions(String(payload.enum_options ?? "")),
    defaultValue: String(payload.default_value ?? ""),
    sortOrder: parseSortOrder(payload.sort_order),
  });

  if (wantsJson) {
    if (result.error) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, { status: 200 });
  }

  return buildAppRedirect(request, redirectBasePath, {
    op: "definition-create",
    ok: result.error ? "0" : "1",
    message: result.error ?? `Campo creato (${result.definitionId ?? "n/d"}).`,
  });
}
