interface ScoreRingProps {
  score: number;
  size?: number;
}

function getScoreColor(score: number) {
  if (score >= 75) return "#34d399"; // emerald-400
  if (score >= 50) return "#facc15"; // yellow-400
  return "#f87171"; // red-400
}

function getScoreLabel(score: number) {
  if (score >= 90) return "Outstanding";
  if (score >= 75) return "Great job!";
  if (score >= 60) return "Good effort";
  return "Keep practicing";
}

export default function ScoreRing({ score, size = 148 }: ScoreRingProps) {
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(score, 100) / 100);
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={size}
          height={size}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth={10}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white leading-none">
            {score}
          </span>
          <span className="text-xs text-zinc-500 mt-0.5">/100</span>
        </div>
      </div>
      <span className="text-sm font-medium" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
