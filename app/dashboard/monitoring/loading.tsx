export default function MonitoringLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-36 bg-nexgen-card rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5 text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-full bg-nexgen-border/10" />
            <div className="h-3 w-16 mx-auto bg-nexgen-border/10 rounded" />
          </div>
        ))}
      </div>
      <div className="glass-card p-6"><div className="h-48 bg-nexgen-border/10 rounded-lg" /></div>
    </div>
  )
}
