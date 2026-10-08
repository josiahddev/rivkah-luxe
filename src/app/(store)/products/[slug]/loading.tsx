import { Skeleton } from "@/components/ui/bits";

export default function Loading() {
  return (
    <div className="container-luxe pb-16 pt-12" aria-busy="true" aria-label="Loading product">
      <Skeleton className="mb-8 h-3 w-48" />
      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <Skeleton className="aspect-[4/5] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
