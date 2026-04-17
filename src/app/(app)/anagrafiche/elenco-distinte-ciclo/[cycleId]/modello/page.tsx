import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import ConfigurationPlaceholder from "@/app/(app)/anagrafiche/articoli-prodotto/_components/configuration-placeholder";
import { getTenantCycleById } from "@/lib/domain/cycles";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type CycleModelPlaceholderPageProps = {
  params: Promise<{
    cycleId: string;
  }>;
};

export default async function CycleModelPlaceholderPage({ params }: CycleModelPlaceholderPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const detail = await getTenantCycleById(selectedTenantId, resolvedParams.cycleId);
  const title = detail.cycle
    ? `Modello produttivo ciclo ${detail.cycle.code}`
    : "Modello produttivo ciclo (placeholder)";

  return (
    <ConfigurationPlaceholder
      title={title}
      subtitle="Accesso rapido al modello produttivo collegato: placeholder tecnico MD-08."
      backHref="/anagrafiche/elenco-distinte-ciclo"
      backLabel="Torna all'elenco distinte ciclo"
    />
  );
}

