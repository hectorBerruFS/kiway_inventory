import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import NewOrderContent from "./new-order-content";

export default function NewOrderPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewOrderContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-10 w-32 rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
