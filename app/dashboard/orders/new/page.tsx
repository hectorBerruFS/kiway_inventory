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
    <div className="flex flex-col gap-4 p-4 md:p-8 md:gap-8 lg:max-w-5xl lg:mx-auto lg:p-10">
       <Skeleton className="h-10 w-32 rounded-lg md:h-12 md:w-48" />
       <Skeleton className="h-12 w-full rounded-lg md:h-14" />
       <Skeleton className="h-32 w-full rounded-lg md:h-48" />
       <div className="flex flex-col gap-2 md:gap-4">
         {[1, 2, 3].map((i) => (
           <Skeleton key={i} className="h-16 w-full rounded-lg md:h-20" />
         ))}
       </div>
     </div>
  );
}
