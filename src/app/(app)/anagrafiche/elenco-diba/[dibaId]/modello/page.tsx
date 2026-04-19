import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import ProductionModelDetailView from "@/app/(app)/anagrafiche/_components/production-model-detail-view";
import { getTenantProductionModelDetail } from "@/lib/domain/production-model-detail";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type DibaModelPlaceholderPageProps = {
  params: Promise<{
    dibaId: string;
  }>;
  searchParams: Promise<{
    tab?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const normalizeTab = (value: string): "overview" | "cycles" | "process" => {
  if (value === "cycles") {
    return "cycles";
  }
  if (value === "process") {
    return "process";
  }
  return "overview";
};

export default async function DibaModelPlaceholderPage({
  params,
  searchParams,
}: DibaModelPlaceholderPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const activeTab = normalizeTab(normalizeParam(resolvedSearchParams.tab));
  const detail = await getTenantProductionModelDetail(selectedTenantId, {
    dibaId: resolvedParams.dibaId,
  });

  return (
    <ProductionModelDetailView
      detail={detail}
      title="Dettaglio modello produttivo"
      backHref={`/anagrafiche/elenco-diba/${resolvedParams.dibaId}`}
      backLabel="Torna al dettaglio DIBA"
      baseHref={`/anagrafiche/elenco-diba/${resolvedParams.dibaId}/modello`}
      activeTab={activeTab}
    />
  );
}
