export default function CatalogLoading() {
  return (
    <div className="animate-pulse space-y-6 px-4 py-8 md:px-8">
      {/* Search bar */}
      <div className="h-10 w-full max-w-md rounded-lg bg-neutral-200" />

      {/* Filter pills */}
      <div className="flex gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-neutral-100" />
        ))}
      </div>

      {/* Pack grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            {/* Icon preview grid */}
            <div className="grid grid-cols-6 gap-1.5">
              {Array.from({ length: 12 }).map((_, j) => (
                <div key={j} className="aspect-square rounded bg-neutral-100" />
              ))}
            </div>
            {/* Title */}
            <div className="h-5 w-2/3 rounded bg-neutral-200" />
            {/* Description */}
            <div className="h-4 w-full rounded bg-neutral-100" />
            <div className="h-4 w-4/5 rounded bg-neutral-100" />
            {/* Badge + button */}
            <div className="flex items-center justify-between">
              <div className="h-5 w-16 rounded-full bg-neutral-100" />
              <div className="h-8 w-24 rounded-lg bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
