import { useEffect, useState } from "react";

interface ScoreMeterProps {
  value: number; // 0..10
  size?: number;
}

/** Animated SVG arc gauge (0–10). Stroke uses the theme gradient. */
export function ScoreMeter({ value, size = 220 }: ScoreMeterProps) {
  const [progress, setProgress] = useState(0);
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // 270deg arc
  const startAngle = 135;
  const sweep = 270;
  const circumference = 2 * Math.PI * r;
  const arcLen = (sweep / 360) * circumference;

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const pct = Math.min(1, Math.max(0, progress / 10));
  const dash = arcLen * pct;

  const polar = (angle: number) => {
    const a = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const startPt = polar(startAngle);
  const endPt = polar(startAngle + sweep);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block">
        <defs>
          <linearGradient id="meterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--glow)" />
            <stop offset="100%" stopColor="var(--glow-2)" />
          </linearGradient>
        </defs>
        {/* track */}
        <path
          d={describeArc(cx, cy, r, startAngle, startAngle + sweep)}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* value */}
        <path
          d={describeArc(cx, cy, r, startAngle, startAngle + sweep)}
          fill="none"
          stroke="url(#meterGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ filter: "drop-shadow(0 0 8px var(--glow))" }}
        />
        <circle cx={startPt.x} cy={startPt.y} r={3} fill="var(--muted-foreground)" />
        <circle cx={endPt.x} cy={endPt.y} r={3} fill="var(--muted-foreground)" opacity={0.4} />
      </svg>
    </div>
  );
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const polar = (angle: number) => {
    const a = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const start = polar(endAngle);
  const end = polar(startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}
