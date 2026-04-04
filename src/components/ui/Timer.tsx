'use client'

interface TimerProps {
  seconds: number
  total: number
}

export function Timer({ seconds, total }: TimerProps) {
  const pct = total > 0 ? (seconds / total) * 100 : 0
  const color = pct > 50 ? 'bg-fiesta-yellow' : pct > 25 ? 'bg-fiesta-orange' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="text-2xl font-bold text-fiesta-dark tabular-nums w-12">
        {seconds}s
      </div>
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
