import type { Metadata } from "next";
import { Listing, parseFilters } from "@/components/store/listing";
import { SectionHeading } from "@/components/ui/bits";

export const metadata: Metadata = {
  title: "Shop all",
  description: "Shop Rivkah Luxe body oils, scrubs, body butter and gift sets.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const filters = parseFilters(await searchParams);
  return (
    <div className="container-luxe py-14 sm:py-20">
      <SectionHeading as="h1" eyebrow="The collection" title="Shop all" subtitle="Body care made to feel like a moment of luxury, every day." className="mb-12" />
      <Listing filters={filters} />
    </div>
  );
}
