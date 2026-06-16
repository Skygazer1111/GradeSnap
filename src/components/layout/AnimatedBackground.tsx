import { useEffect, useRef } from "react";

/**
 * Ambient background: a subtle theme-tinted gradient wash, a neat static
 * dotted grid, and a light drifting particle field. Purely decorative.
 */
export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;
    const sizeCanvas = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();
    const count = Math.min(90, Math.floor(window.innerWidth / 16));

    // Resolve the theme primary into a canvas-safe rgb() string.
    // Canvas 2D doesn't reliably accept oklch() fillStyle, so probe via DOM.
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;width:0;height:0;color:var(--primary)";
    document.body.appendChild(probe);
    const particleColor = () => {
      probe.style.color = "var(--primary)";
      const rgb = getComputedStyle(probe).color;
      return rgb || "rgb(120, 200, 255)";
    };

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.2 + 1,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.5 + 0.45,
    }));

    let raf = 0;
    const render = () => {
      ctx.clearRect(0, 0, w, h);
      const col = particleColor();
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 6;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };

    const draw = () => {
      render();
      raf = requestAnimationFrame(draw);
    };

    if (!reduce) draw();
    else render();

    const onResize = () => {
      sizeCanvas();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      probe.remove();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* soft gradient wash */}
      <div
        className="absolute inset-0"
        style={{ background: "var(--gradient-hero)" }}
      />
      {/* neat dotted grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(var(--dot-color) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          backgroundPosition: "-13px -13px",
          maskImage:
            "radial-gradient(120% 100% at 50% 0%, black 55%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(120% 100% at 50% 0%, black 55%, transparent 100%)",
        }}
      />
      {/* drifting particles */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
