import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

/** Animação viva: "do bruto ao líquido" — descasca o número anunciado até o que é SEU. Exemplo ilustrativo. */
const GROSS = 22.0;
const CUTS = [
  { label: 'Perda no preço (IL)', delta: 9.0, color: 'text-rose' },
  { label: 'Taxas (entrada + gás)', delta: 0.5, color: 'text-amber' },
];
const NET = GROSS - CUTS.reduce((a, c) => a + c.delta, 0); // 12.5
const VALUES = [GROSS, GROSS - CUTS[0].delta, NET, NET]; // alvo do número por fase

export function BrutoLiquido() {
  const [phase, setPhase] = useState(0);
  const [display, setDisplay] = useState(GROSS);
  const raf = useRef(0);

  // ciclo de fases (0 anunciado → 1 −IL → 2 −taxas → 3 líquido) e volta
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setPhase(3); setDisplay(NET); return; }
    const delays = [1400, 1300, 1300, 2800];
    const t = setTimeout(() => setPhase((p) => (p + 1) % 4), delays[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  // tween do número ao mudar de fase
  useEffect(() => {
    const target = VALUES[phase];
    let start: number | null = null;
    const from = display;
    const tick = (t: number) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / 700);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (target - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const isNet = phase >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative isolate mx-auto flex max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-md"
    >
      {/* glow de fundo */}
      <div className="pointer-events-none absolute -inset-px -z-10 rounded-3xl" style={{ background: 'radial-gradient(420px 220px at 50% -10%, rgba(52,226,155,.12), transparent 70%)' }} />
      <h3 className="font-display text-center text-2xl font-bold text-ftext">Do bruto ao líquido</h3>
      <p className="font-mono mx-auto mt-2 max-w-sm text-center text-[13px] leading-relaxed text-muted">
        Quase todo mundo te mostra o número de cima. A gente mostra o que <b className="text-ftext">sobra pra você</b> — descontando perda, taxa e gás, na sua frente.
      </p>

      {/* número grande */}
      <div className="mt-7 text-center">
        <motion.div
          key={isNet ? 'net' : 'gross'}
          animate={isNet ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 0.6 }}
          className={`font-display font-mono tnum text-6xl font-bold transition-colors ${isNet ? 'text-lime' : 'text-ftext'}`}
          style={isNet ? { textShadow: '0 0 28px rgba(52,226,155,.45)' } : undefined}
        >
          {display.toFixed(1)}%
        </motion.div>
        <p className="font-mono mt-2 text-xs uppercase tracking-[0.18em] text-muted-2">
          {phase === 0 ? 'rendimento anunciado' : isNet ? (
            <span className="inline-flex items-center gap-1 text-lime"><Check size={13} /> isso é seu</span>
          ) : 'descontando o que ninguém mostra…'}
        </p>
      </div>

      {/* deduções aparecendo */}
      <div className="mt-6 space-y-2">
        <AnimatePresence>
          {phase >= 1 && phase < 3 && <CutRow {...CUTS[0]} />}
          {phase >= 2 && phase < 3 && <CutRow {...CUTS[1]} />}
        </AnimatePresence>
      </div>

      <p className="font-mono mt-6 text-center text-[10px] text-muted-2">Exemplo ilustrativo · cada cofre mostra o número real, medido por nós.</p>
    </motion.div>
  );
}

function CutRow({ label, delta, color }: { label: string; delta: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center justify-between rounded-xl border border-edge bg-ink/50 px-3.5 py-2.5"
    >
      <span className="text-sm text-muted">− {label}</span>
      <span className={`font-mono tnum text-sm font-semibold ${color}`}>−{delta.toFixed(1)}%</span>
    </motion.div>
  );
}
