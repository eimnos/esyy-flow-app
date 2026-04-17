import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import ConfigurationPlaceholder from "@/app/(app)/anagrafiche/articoli-prodotto/_components/configuration-placeholder";
import { getTenantProductById } from "@/lib/domain/products";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type ProductModelPlaceholderPageProps = {
  params: Promise<{
    productId: string;
  }>;
};

export default async function ProductModelPlaceholderPage({
  params,
}: ProductModelPlaceholderPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const detail = await getTenantProductById(selectedTenantId, resolvedParams.productId);
  const title = detail.product
    ? `Modello articolo ${detail.product.code}`
    : "Modello articolo (placeholder)";

  return (
    <ConfigurationPlaceholder
      title={title}
      subtitle="Area read-only preparata per aggancio modello produttivo in wave successive."
      backHref={`/anagrafiche/articoli-prodotto/${resolvedParams.productId}`}
      backLabel="Torna al dettaglio articolo"
    />
  );
}
