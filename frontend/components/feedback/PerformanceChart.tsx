export interface SubScore {
  category: string;
  score: number;
  max: number;
}

interface PerformanceChartProps {
  scores: SubScore[];
}

function getBarColor(pct: number) {
  if (pct >= 75) return "bg-emerald-400";
  if (pct >= 50) return "bg-yellow-400";
  return "bg-red-400";
}

export default function PerformanceChart({ scores }: PerformanceChartProps) {
  return (
    <div className="space-y-5">
      {scores.map(({ category, score, max }) => {
        const pct = Math.round((score / max) * 100);
        const barColor = getBarColor(pct);
        return (
          <div key={category}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-300">{category}</span>
              <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                {score}
                <span className="text-zinc-600 font-normal">/{max}</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
