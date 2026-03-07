export default function VMsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 bg-nexgen-card rounded-lg" />
        <div className="h-9 w-28 bg-nexgen-card rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-28 bg-nexgen-border/20 rounded" />
              <div className="h-5 w-16 bg-nexgen-border/20 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-nexgen-border/10 rounded" />
              <div className="h-3 w-3/4 bg-nexgen-border/10 rounded" />
              <div className="h-3 w-1/2 bg-nexgen-border/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
