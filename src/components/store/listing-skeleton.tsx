import { ProductCardSkeleton, Skeleton } from "@/components/ui/bits";

export function ListingSkeleton() {
  return (
    <div className="container-luxe py-14 sm:py-20" aria-busy="true" aria-label="Loading products">
      <Skeleton className="mx-auto h-12 w-64" />
      <Skeleton className="mx-auto mt-4 h-4 w-80 max-w-full" />
      <Skeleton className="mt-12 h-12 w-full" />
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:ml-[268px]">
        {Array.from({ length: 6 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
