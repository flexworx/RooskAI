export default function DatabasesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-52 bg-nexgen-card rounded-lg" />
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass-card p-6 space-y-4">
            <div className="flex justify-between">
              <div className="h-5 w-40 bg-nexgen-border/20 rounded" />
              <div className="h-8 w-20 bg-nexgen-border/20 rounded-lg" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j}><div className="h-3 w-16 bg-nexgen-border/10 rounded mb-1" /><div className="h-4 w-20 bg-nexgen-border/10 rounded" /></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
