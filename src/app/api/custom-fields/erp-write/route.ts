import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  CUSTOM_FIELD_OBJECT_TYPES,
  CUSTOM_FIELD_TARGET_LEVELS,
} from "@/lib/domain/custom-fields";
import { executeTenantCustomFieldErpWrite } from "@/lib/domain/custom-field-erp-write";
import { buildAppRedirect } from "@/lib/http/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";
import { findTenantMembership, getUserTenantMemberships } from "@/lib/tenant/memberships";

const redirectBasePath = "/configurazione/campi-personalizzati/scrittura-erp";

const isJsonRequest = (request: Request) =>
  request.headers.get("content-type")?.toLowerCase().includes("application/json") ?? false;

const parseText = (value: unknown) => `${value ?? ""}`.trim();

const parseBool = (value: unknown) => {
  const normalized = parseText(value).toLowerCase();
  return ["1", "true", "yes", "on", "y"].includes(normalized);
};

const validateTenantUser = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, tenantId: "", allowed: false, status: 401 as const, reason: "Utente non autenticato." };
  }

  const selectedTenantId = (await cookies()).get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    return {
      user,
      tenantId: "",
      allowed: false,
      status: 400 as const,
      reason: "Tenant non selezionato.",
    };
  }

  const { memberships, error } = await getUserTenantMemberships(user.id);
  if (error || !findTenantMembership(memberships, selectedTenantId)) {
    return {
      user,
      tenantId: selectedTenantId,
      allowed: false,
      status: 403 as const,
      reason: "Tenant non valido per l'utente.",
    };
  }

  return {
    user,
    tenantId: selectedTenantId,
    allowed: true,
    status: 200 as const,
    reason: "",
  };
};

export async function GET(request: Request) {
  const auth = await validateTenantUser();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const url = new URL(request.url);
  const objectTypeCode = parseText(url.searchParams.get("object_type_code"));
  const targetLevel = parseText(url.searchParams.get("target_level"));
  const targetRecordId = parseText(url.searchParams.get("target_record_id"));
  const targetLineRecordId = parseText(url.searchParams.get("target_line_record_id"));
  const customFieldDefinitionId = parseText(url.searchParams.get("custom_field_definition_id"));
  const sourceSystemCode = parseText(url.searchParams.get("source_system_code"));

  if (
    !CUSTOM_FIELD_OBJECT_TYPES.includes(
      objectTypeCode as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number],
    ) ||
    !CUSTOM_FIELD_TARGET_LEVELS.includes(
      targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number],
    ) ||
    !targetRecordId
  ) {
    return NextResponse.json(
      {
        error:
          "Parametri query non validi: object_type_code / target_level / target_record_id.",
      },
      { status: 400 },
    );
  }

  const result = await executeTenantCustomFieldErpWrite(auth.tenantId, {
    objectTypeCode: objectTypeCode as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number],
    targetLevel: targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number],
    targetRecordId,
    targetLineRecordId,
    customFieldDefinitionId,
    sourceSystemCode,
    dryRun: true,
  });

  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}

export async function POST(request: Request) {
  const wantsJson = isJsonRequest(request);

  const auth = await validateTenantUser();
  if (!auth.allowed) {
    if (wantsJson) {
      return NextResponse.json({ error: auth.reason }, { status: auth.status });
    }
    if (auth.status === 401) {
      return buildAppRedirect(request, "/login");
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

  const objectTypeCode = parseText(payload.object_type_code);
  const targetLevel = parseText(payload.target_level);
  const targetRecordId = parseText(payload.target_record_id);
  const targetLineRecordId = parseText(payload.target_line_record_id);
  const customFieldDefinitionId = parseText(payload.custom_field_definition_id);
  const sourceSystemCode = parseText(payload.source_system_code);
  const dryRun = parseBool(payload.dry_run);

  if (
    !CUSTOM_FIELD_OBJECT_TYPES.includes(
      objectTypeCode as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number],
    ) ||
    !CUSTOM_FIELD_TARGET_LEVELS.includes(
      targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number],
    ) ||
    !targetRecordId
  ) {
    const message =
      "Parametri non validi: object_type_code / target_level / target_record_id obbligatori.";

    if (wantsJson) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return buildAppRedirect(request, redirectBasePath, {
      op: "erp-write",
      ok: "0",
      message,
      object_type_code: objectTypeCode,
      target_level: targetLevel,
      target_record_id: targetRecordId,
      target_line_record_id: targetLineRecordId,
      custom_field_definition_id: customFieldDefinitionId,
      source_system_code: sourceSystemCode,
      dry_run: dryRun ? "1" : "0",
    });
  }

  const result = await executeTenantCustomFieldErpWrite(auth.tenantId, {
    objectTypeCode: objectTypeCode as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number],
    targetLevel: targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number],
    targetRecordId,
    targetLineRecordId,
    customFieldDefinitionId,
    sourceSystemCode,
    dryRun,
  });

  if (wantsJson) {
    return NextResponse.json(result, { status: result.error ? 400 : 200 });
  }

  return buildAppRedirect(request, redirectBasePath, {
    op: dryRun ? "erp-write-dry-run" : "erp-write",
    ok: result.error ? "0" : "1",
    message:
      result.error ??
      `${dryRun ? "Dry run" : "Write"} completato: written=${result.totals.written}, planned=${result.totals.planned}, skipped=${result.totals.skipped}, failed=${result.totals.failed}.`,
    object_type_code: objectTypeCode,
    target_level: targetLevel,
    target_record_id: targetRecordId,
    target_line_record_id: targetLineRecordId,
    custom_field_definition_id: customFieldDefinitionId,
    source_system_code: sourceSystemCode,
    dry_run: dryRun ? "1" : "0",
  });
}
