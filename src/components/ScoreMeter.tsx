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
  // 270deg arc with gap at the bottom
  const startAngle = 225;
  const sweep = 270;
  // We use pathLength="100" to let the browser normalize the path length perfectly.

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

  const polar = (angle: number) => {
    const a = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const startPt = polar(startAngle);
  const endPt = polar(startAngle + sweep);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block overflow-visible">
        <defs>
          <linearGradient id="meterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
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
          pathLength="100"
          strokeDasharray={`${pct * 100} 100`}
          style={{ filter: "drop-shadow(0 0 8px var(--glow))" }}
        />
        <circle cx={startPt.x} cy={startPt.y} r={3} fill="var(--muted-foreground)" opacity={0.4} />
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
  const start = polar(startAngle);
  const end = polar(endAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  // Clockwise sweep flag is 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}
