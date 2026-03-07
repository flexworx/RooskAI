export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-nexgen-card rounded-lg" />
        <div className="h-8 w-32 bg-nexgen-card rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-6 space-y-3">
            <div className="h-4 w-20 bg-nexgen-border/20 rounded" />
            <div className="h-8 w-24 bg-nexgen-border/20 rounded" />
            <div className="h-3 w-16 bg-nexgen-border/10 rounded" />
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-4">
          <div className="h-5 w-32 bg-nexgen-border/20 rounded" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-nexgen-border/10 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="glass-card p-6 space-y-4">
          <div className="h-5 w-40 bg-nexgen-border/20 rounded" />
          <div className="h-48 bg-nexgen-border/10 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
