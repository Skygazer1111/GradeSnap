import { useEffect, useRef } from "react";
import type { Classification } from "@/domain/cgpa/cgpa";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: "circle" | "star";
  spin: number;
}

const PALETTE: Record<Classification["tier"], string[]> = {
  outstanding: ["#ffd75e", "#ffb347", "#fff1b8", "#ffcf40"],
  excellent: ["#7c5cff", "#22d3ee", "#a855f7", "#7afcff"],
  great: ["#22d3ee", "#4aa8ff", "#7afcff"],
  growing: ["#6ee7b7", "#34d399", "#a7f3d0"],
  support: ["#93c5fd", "#bfdbfe"],
};

/**
 * Lightweight canvas celebration tuned per performance tier.
 * Higher tiers get denser, brighter bursts; the lowest tier stays calm.
 */
export function Celebration({ tier }: { tier: Classification["tier"] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const w = (canvas.width = canvas.offsetWidth);
    const h = (canvas.height = canvas.offsetHeight);
    const colors = PALETTE[tier];

    const density =
      tier === "outstanding"
        ? 160
        : tier === "excellent"
          ? 120
          : tier === "great"
            ? 90
            : tier === "growing"
              ? 55
              : 24;

    const particles: Particle[] = [];
    const cx = w / 2;
    const cy = h * 0.42;

    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + (tier === "outstanding" ? 3 : 1.5);
      const upward = tier === "growing" || tier === "support";
      particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed * (upward ? 0.4 : 1),
        vy: upward ? -(Math.random() * 3 + 2) : Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.random() * 70 + 70,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: tier === "outstanding" && Math.random() > 0.5 ? "star" : "circle",
        spin: Math.random() * Math.PI,
      });
    }

    const drawStar = (x: number, y: number, r: number, rot: number) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = rot + (i * 2 * Math.PI) / 5 - Math.PI / 2;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        const a2 = a + Math.PI / 5;
        ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45);
      }
      ctx.closePath();
      ctx.fill();
    };

    let raf = 0;
    const gravity = tier === "support" || tier === "growing" ? 0.02 : 0.08;

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const p of particles) {
        p.life++;
        if (p.life > p.maxLife) continue;
        alive = true;
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.spin += 0.1;
        const alpha = 1 - p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        if (p.shape === "star") drawStar(p.x, p.y, p.size * 1.6, p.spin);
        else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (alive) raf = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(raf);
  }, [tier]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
