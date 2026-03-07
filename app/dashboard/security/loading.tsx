export default function SecurityLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-nexgen-card rounded-lg" />
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-nexgen-card rounded-lg" />
          <div className="h-8 w-20 bg-nexgen-card rounded-lg" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="h-4 w-64 bg-nexgen-border/20 rounded mb-2" />
            <div className="h-3 w-48 bg-nexgen-border/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
