import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

/** Animação viva "do bruto ao líquido" — descasca o número anunciado pelos descontos REAIS até o que é SEU. */
const GROSS = 28.0;
const CUTS = [
  { label: 'Perda no preço (IL)', delta: 10.0, color: 'text-rose' },
  { label: 'Taxa do gestor do cofre', delta: 1.7, color: 'text-rose' },
  { label: 'Slippage (montar a posição)', delta: 0.5, color: 'text-amber' },
  { label: 'Taxa Mazari (0,30%)', delta: 0.3, color: 'text-amber' },
  { label: 'Gás de rede', delta: 0.2, color: 'text-amber' },
];
const N = CUTS.length;
const valueAt = (phase: number) => GROSS - CUTS.slice(0, phase).reduce((a, c) => a + c.delta, 0);
const NET = valueAt(N);

export function BrutoLiquido() {
  const [phase, setPhase] = useState(0); // 0=bruto, 1..N descontando, N=líquido
  const [display, setDisplay] = useState(GROSS);
  const raf = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setPhase(N); setDisplay(NET); return; }
    const delay = phase === 0 ? 1200 : phase === N ? 3200 : 820;
    const t = setTimeout(() => setPhase((p) => (p + 1) % (N + 1)), delay);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    const target = valueAt(phase);
    let start: number | null = null;
    const from = display;
    const tick = (t: number) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / 650);
      setDisplay(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const isNet = phase >= N;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative isolate flex w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute -inset-px -z-10 rounded-3xl" style={{ background: 'radial-gradient(420px 220px at 50% -10%, rgba(52,226,155,.12), transparent 70%)' }} />
      <h3 className="font-display text-center text-2xl font-bold text-ftext">Do bruto ao líquido</h3>
      <p className="font-mono mx-auto mt-2 max-w-sm text-center text-[13px] leading-relaxed text-muted">
        Quase todo mundo te mostra o número de cima. A gente mostra o que <b className="text-ftext">sobra pra você</b> — descontando tudo, na sua frente.
      </p>

      {/* horizontal: número (esq) + descontos sempre presentes (dir) = SEM reflow */}
      <div className="mt-6 grid items-center gap-x-8 gap-y-5 sm:grid-cols-2">
        <div className="text-center">
          <motion.div
            animate={isNet ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.6 }}
            className={`font-display font-mono tnum text-6xl font-bold transition-colors ${isNet ? 'text-lime' : 'text-ftext'}`}
            style={isNet ? { textShadow: '0 0 28px rgba(52,226,155,.45)' } : undefined}
          >
            {display.toFixed(1)}%
          </motion.div>
          <p className="font-mono mt-2 text-xs uppercase tracking-[0.18em] text-muted-2">
            {phase === 0 ? 'APY anunciado (ao ano)' : isNet ? (
              <span className="inline-flex items-center gap-1 text-lime"><Check size={13} /> APY real, já líquido</span>
            ) : 'descontando o que ninguém mostra…'}
          </p>
          <AnimatePresence>
            {isNet && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-4 rounded-2xl border border-lime/25 bg-lime/[0.06] px-4 py-3 text-center"
              >
                <p className="text-[12px] leading-relaxed text-muted">
                  Não é projeção — é o que <b className="text-lime">rendeu de verdade</b>:
                </p>
                <p className="font-mono tnum mt-1 text-sm font-bold text-ftext">
                  +0,63% <span className="font-sans text-[11px] font-normal text-muted">nos últimos 15 dias</span>
                </p>
                <p className="font-mono tnum text-[12px] text-lime">R$6 de cada R$1.000 · é seu</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col justify-center gap-1.5">
          {CUTS.map((c, i) => {
            const on = i < phase;
            return (
              <motion.div
                key={c.label}
                animate={{ opacity: on ? 1 : 0.15, x: on ? 0 : -6 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-between rounded-xl border border-edge bg-ink/50 px-3.5 py-2"
              >
                <span className="text-[13px] text-muted">− {c.label}</span>
                <span className={`font-mono tnum text-[13px] font-semibold ${c.color}`}>−{c.delta.toFixed(1)}%</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      <p className="font-mono mt-6 text-center text-[10px] text-muted-2">Exemplo ilustrativo · cada cofre mostra o número real, medido por nós.</p>
    </motion.div>
  );
}
