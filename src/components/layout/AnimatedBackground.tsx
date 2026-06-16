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
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    
    let w = window.innerWidth;
    let h = window.innerHeight;
    let particleCount = Math.min(120, Math.floor((w * h) / 15000));

    const sizeCanvas = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      // Dynamically adjust particle count based on new screen size
      const newCount = Math.min(120, Math.floor((w * h) / 15000));
      if (newCount > particles.length) {
        const toAdd = newCount - particles.length;
        for (let i = 0; i < toAdd; i++) {
          particles.push(createParticle(Math.random() * w, Math.random() * h));
        }
      } else if (newCount < particles.length) {
        particles.splice(newCount);
      }
      particleCount = newCount;
    };

    // Color probe for theme sync
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;width:0;height:0;color:var(--primary);visibility:hidden;";
    document.body.appendChild(probe);

    let cachedColor = "rgb(120, 200, 255)";
    const updateColor = () => {
      cachedColor = getComputedStyle(probe).color || cachedColor;
    };
    updateColor();

    // Check color periodically instead of every frame to save performance
    const colorInterval = setInterval(updateColor, 1000);

    const createParticle = (x?: number, y?: number) => ({
      x: x ?? Math.random() * w,
      y: y ?? Math.random() * h,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.5 + 0.2,
    });

    const particles = Array.from({ length: particleCount }, () => createParticle());

    let raf = 0;
    const render = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = cachedColor;
      ctx.strokeStyle = cachedColor;
      ctx.shadowColor = cachedColor;
      ctx.shadowBlur = 8;
      
      const connectionDistance = 120;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;
          
          // Smooth wrap-around
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20;
          if (p.y > h + 20) p.y = -20;
        }

        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // Subtle connecting lines (Constellation effect)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < connectionDistance * connectionDistance) {
            const opacity = (1 - Math.sqrt(distSq) / connectionDistance) * 0.15;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };

    const draw = () => {
      render();
      raf = requestAnimationFrame(draw);
    };

    sizeCanvas();
    if (!reduce) draw();
    else render();

    window.addEventListener("resize", sizeCanvas);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", sizeCanvas);
      clearInterval(colorInterval);
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
