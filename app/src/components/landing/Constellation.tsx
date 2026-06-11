import { useEffect, useRef, useState } from 'react';

/** As 7 redes de ORIGEM (posição em %, ao redor do núcleo Mazari no centro). */
const NODES = [
  { name: 'Ethereum', x: 17, y: 19 },
  { name: 'Avalanche', x: 50, y: 9 },
  { name: 'BNB Chain', x: 83, y: 19 },
  { name: 'Base', x: 9, y: 52 },
  { name: 'Arbitrum', x: 91, y: 52 },
  { name: 'Polygon', x: 25, y: 85 },
  { name: 'Optimism', x: 75, y: 85 },
];
const CORE = { x: 50, y: 50 };

/** Herói VIVO: o dinheiro flui de qualquer rede pro cofre Mazari. Anti-card. */
export function Constellation() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pt = (n: { x: number; y: number }) => ({ x: (n.x / 100) * w, y: (n.y / 100) * h });

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // partículas: cada uma percorre uma linha rede→núcleo
    const N = reduce ? 0 : 35;
    const parts = Array.from({ length: N }, () => ({ node: Math.floor(Math.random() * NODES.length), t: Math.random() }));
    let amber = 0; // pulso âmbar (convergência)
    let raf = 0;

    const drawStatic = () => {
      const c = pt(CORE);
      ctx.clearRect(0, 0, w, h);
      for (const n of NODES) {
        const p = pt(n);
        ctx.strokeStyle = 'rgba(52,226,155,0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke();
      }
    };

    const frame = () => {
      const c = pt(CORE);
      ctx.clearRect(0, 0, w, h);
      // linhas
      for (let i = 0; i < NODES.length; i++) {
        const p = pt(NODES[i]);
        ctx.strokeStyle = hover === i ? 'rgba(52,226,155,0.5)' : 'rgba(52,226,155,0.12)';
        ctx.lineWidth = hover === i ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke();
      }
      // partículas (dinheiro fluindo pro cofre)
      for (const part of parts) {
        const p = pt(NODES[part.node]);
        const ease = part.t * part.t; // acelera ao chegar
        const x = p.x + (c.x - p.x) * ease;
        const y = p.y + (c.y - p.y) * ease;
        ctx.beginPath();
        ctx.arc(x, y, 2.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(92,240,179,0.95)';
        ctx.shadowColor = 'rgba(52,226,155,0.9)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        part.t += 0.006 + Math.random() * 0.004;
        if (part.t >= 1) { part.t = 0; part.node = Math.floor(Math.random() * NODES.length); amber = 1; }
      }
      // pulso âmbar no núcleo (a Mazari agindo)
      if (amber > 0.01) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 22 + (1 - amber) * 40, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245,181,68,${amber * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        amber *= 0.94;
      }
      raf = requestAnimationFrame(frame);
    };

    if (reduce) drawStatic();
    else raf = requestAnimationFrame(frame);

    // pausa fora da viewport (economia)
    const io = new IntersectionObserver(([e]) => {
      if (reduce) return;
      if (e.isIntersecting && !raf) raf = requestAnimationFrame(frame);
      else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    });
    io.observe(wrap);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [hover]);

  return (
    <div ref={wrapRef} className="relative mx-auto aspect-[4/3] w-full max-w-xl select-none sm:aspect-square">
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />
      {/* nós-rede interativos */}
      {NODES.map((n, i) => (
        <button
          key={n.name}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
          className="group absolute -translate-x-1/2 -translate-y-1/2 outline-none"
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
          aria-label={`Rede ${n.name}`}
        >
          <span className={`block h-2.5 w-2.5 rounded-full bg-lime transition-transform ${hover === i ? 'scale-150' : ''}`} style={{ boxShadow: '0 0 12px rgba(52,226,155,.8)' }} />
          <span className="font-mono mt-1.5 block whitespace-nowrap text-[10px] text-muted transition-colors group-hover:text-lime">{n.name}</span>
          {/* tooltip da promessa */}
          <span className={`absolute left-1/2 top-full z-10 mt-1 w-40 -translate-x-1/2 rounded-lg border border-amber/30 bg-ink/95 px-2.5 py-1.5 text-left text-[10px] leading-snug text-muted shadow-lg transition-opacity ${hover === i ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            Tem dinheiro na <b className="text-amber">{n.name}</b>? A gente traz e investe pra você.
          </span>
        </button>
      ))}
      {/* núcleo Mazari (o cofre) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-lime/40 bg-ink/80 backdrop-blur glow-lime">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 19V7l5 6 4-5 4 5 5-6v12" stroke="var(--color-lime)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
