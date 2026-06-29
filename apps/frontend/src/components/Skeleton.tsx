export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />;
}

export function FeedSkeleton() {
  return (
    <div className="flex h-full flex-col bg-black">
      <div className="flex gap-4 overflow-hidden border-b border-ig-border px-4 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-2 w-10" />
          </div>
        ))}
      </div>
      <div className="relative flex-1">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute bottom-28 left-4 right-16 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="absolute bottom-28 right-3 flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5 p-0.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[9/16] w-full rounded-none" />
      ))}
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-none" />
      ))}
    </div>
  );
}
