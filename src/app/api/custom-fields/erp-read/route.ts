import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  CUSTOM_FIELD_OBJECT_TYPES,
  CUSTOM_FIELD_TARGET_LEVELS,
} from "@/lib/domain/custom-fields";
import { getTenantCustomFieldErpReadPreview } from "@/lib/domain/custom-field-erp-read";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";
import { findTenantMembership, getUserTenantMemberships } from "@/lib/tenant/memberships";

const parseText = (value: string | null) => `${value ?? ""}`.trim();

export async function GET(request: Request) {
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

  const result = await getTenantCustomFieldErpReadPreview(selectedTenantId, {
    objectTypeCode: objectTypeCode as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number],
    targetLevel: targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number],
    targetRecordId,
    targetLineRecordId,
    customFieldDefinitionId,
    sourceSystemCode,
  });

  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
