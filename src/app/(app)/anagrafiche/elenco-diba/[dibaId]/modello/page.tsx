import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import ConfigurationPlaceholder from "@/app/(app)/anagrafiche/articoli-prodotto/_components/configuration-placeholder";
import { getTenantDibaById } from "@/lib/domain/diba";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type DibaModelPlaceholderPageProps = {
  params: Promise<{
    dibaId: string;
  }>;
};

export default async function DibaModelPlaceholderPage({
  params,
}: DibaModelPlaceholderPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const detail = await getTenantDibaById(selectedTenantId, resolvedParams.dibaId);
  const title = detail.diba
    ? `Modello produttivo per DIBA ${detail.diba.code}`
    : "Modello produttivo DIBA (placeholder)";

  return (
    <ConfigurationPlaceholder
      title={title}
      subtitle="Accesso rapido al modello produttivo collegato: placeholder tecnico MD-06."
      backHref={`/anagrafiche/elenco-diba/${resolvedParams.dibaId}`}
      backLabel="Torna al dettaglio DIBA"
    />
  );
}
