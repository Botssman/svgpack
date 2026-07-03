export default function Loading() {
  return (
    <div className="animate-pulse space-y-8 px-4 py-10 md:px-8">
      {/* Hero skeleton */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-6 w-32 rounded-full bg-neutral-200" />
        <div className="h-12 w-96 max-w-full rounded-lg bg-neutral-200" />
        <div className="h-6 w-72 max-w-full rounded bg-neutral-100" />
        <div className="flex gap-3">
          <div className="h-10 w-40 rounded-lg bg-neutral-200" />
          <div className="h-10 w-40 rounded-lg bg-neutral-100" />
        </div>
        <div className="flex gap-8">
          <div className="h-10 w-24 rounded bg-neutral-100" />
          <div className="h-10 w-24 rounded bg-neutral-100" />
          <div className="h-10 w-24 rounded bg-neutral-100" />
        </div>
      </div>

      {/* Icon grid card skeleton */}
      <div className="mx-auto max-w-2xl">
        <div className="grid grid-cols-6 gap-1.5 rounded-xl border border-neutral-200 bg-white p-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-neutral-100" />
          ))}
        </div>
      </div>
    </div>
  )
}
