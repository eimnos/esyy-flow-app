import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type TenantRole = "owner" | "admin" | "member" | string;

export type TenantMembership = {
  tenantId: string;
  tenantName: string;
  tenantCode: string | null;
  role: TenantRole;
};

type TenantLookupRow = Record<string, unknown>;
type MembershipLookupRow = Record<string, unknown>;

const parseString = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "";
  }

  return "";
};

const normalizeTenantName = (row: TenantLookupRow | undefined, tenantId: string) => {
  if (!row) {
    return tenantId;
  }

  const nameCandidates = ["name", "tenant_name", "display_name", "label", "code"];

  for (const candidate of nameCandidates) {
    const value = parseString(row[candidate]);
    if (value) {
      return value;
    }
  }

  return tenantId;
};

const normalizeTenantCode = (row: TenantLookupRow | undefined) => {
  if (!row) {
    return null;
  }

  const codeCandidates = ["code", "tenant_code"];

  for (const candidate of codeCandidates) {
    const value = parseString(row[candidate]);
    if (value) {
      return value;
    }
  }

  return null;
};

const fetchMembershipRows = async (userId: string) => {
  const admin = getSupabaseAdminClient();
  const filterCandidates = ["user_id", "profile_id"] as const;

  let fallbackError: string | null = null;
  let rowsFound: MembershipLookupRow[] = [];

  for (const columnName of filterCandidates) {
    const { data, error } = await admin
      .from("tenant_memberships")
      .select("*")
      .eq(columnName, userId);

    if (!error) {
      const rows = (data ?? []) as MembershipLookupRow[];
      if (rows.length > 0) {
        return { rows, error: null };
      }
      rowsFound = rows;
      continue;
    }

    const message = error.message ?? "Unknown query error";

    // Keep trying if the column doesn't exist in this project schema.
    if (
      message.toLowerCase().includes("column") &&
      message.toLowerCase().includes(columnName)
    ) {
      fallbackError = message;
      continue;
    }

    return { rows: [], error: message };
  }

  // Fallback for schemas where tenant_memberships links to profiles.id.
  const { data: profileRows, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .limit(1);

  if (profileError) {
    return {
      rows: rowsFound,
      error:
        fallbackError ??
        `Unable to resolve profiles for current user: ${profileError.message}`,
    };
  }

  const profileIds = ((profileRows ?? []) as MembershipLookupRow[])
    .map((row) => parseString(row.id))
    .filter(Boolean);

  if (profileIds.length > 0) {
    const { data: membershipRows, error: membershipError } = await admin
      .from("tenant_memberships")
      .select("*")
      .in("profile_id", profileIds);

    if (!membershipError) {
      const rows = (membershipRows ?? []) as MembershipLookupRow[];
      if (rows.length > 0) {
        return { rows, error: null };
      }
      rowsFound = rows;
    } else {
      fallbackError = membershipError.message;
    }
  }

  if (fallbackError) {
    return { rows: rowsFound, error: fallbackError };
  }

  return { rows: rowsFound, error: null };
};

const buildTenantLookup = async (tenantIds: string[]) => {
  if (tenantIds.length === 0) {
    return {
      byId: new Map<string, TenantLookupRow>(),
      error: null,
    };
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("tenants").select("*").in("id", tenantIds);

  if (error) {
    return { byId: new Map<string, TenantLookupRow>(), error: error.message };
  }

  const byId = new Map<string, TenantLookupRow>();
  for (const row of (data ?? []) as TenantLookupRow[]) {
    const id = parseString(row.id);
    if (id) {
      byId.set(id, row);
    }
  }

  return { byId, error: null };
};

export const getUserTenantMemberships = async (userId: string) => {
  const { rows, error } = await fetchMembershipRows(userId);

  if (error) {
    return { memberships: [] as TenantMembership[], error };
  }

  const normalizedRows = (rows as MembershipLookupRow[])
    .map((row) => {
      const tenantId = parseString(row.tenant_id ?? row.tenantId);
      const role = parseString(row.role ?? row.membership_role) || "member";
      return { tenantId, role };
    })
    .filter((row) => row.tenantId);

  const uniqueTenantIds = [...new Set(normalizedRows.map((row) => row.tenantId))];
  const { byId, error: tenantError } = await buildTenantLookup(uniqueTenantIds);

  const memberships: TenantMembership[] = normalizedRows.map((row) => {
    const tenant = byId.get(row.tenantId);
    return {
      tenantId: row.tenantId,
      tenantName: normalizeTenantName(tenant, row.tenantId),
      tenantCode: normalizeTenantCode(tenant),
      role: row.role,
    };
  });

  return {
    memberships,
    error: tenantError,
  };
};

export const findTenantMembership = (
  memberships: TenantMembership[],
  tenantId: string | null | undefined,
) => {
  if (!tenantId) {
    return null;
  }

  return memberships.find((membership) => membership.tenantId === tenantId) ?? null;
};

