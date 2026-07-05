export default function IconsLoading() {
  return (
    <div className="animate-pulse space-y-6 px-4 py-8 md:px-8">
      {/* Search */}
      <div className="h-10 w-full max-w-md rounded-lg bg-neutral-200" />

      {/* Filter pills */}
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-neutral-100" />
        ))}
      </div>

      {/* Dense icon grid */}
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-neutral-100" />
        ))}
      </div>
    </div>
  )
}
