import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, Zap, Check, Loader2, MousePointerClick, ArrowUp } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;
// 0 pool atual · 1 pool nova sobrepõe · 2 botão · 3 clique · 4 trocando · 5 trocado (verde)
const DELAYS = [1500, 1700, 1300, 850, 1500, 2700];

/** Demo viva da troca de pool do Autopilot — o usuário vê o fluxo: antiga → nova → confirmar → clique → ✓ trocado. */
export function AutopilotDemo() {
  const [phase, setPhase] = useState(0);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timer = useRef(0);

  useEffect(() => {
    if (reduce) { setPhase(5); return; }
    timer.current = window.setTimeout(() => setPhase((p) => (p + 1) % 6), DELAYS[phase]);
    return () => clearTimeout(timer.current);
  }, [phase, reduce]);

  const done = phase >= 5;
  const showNew = phase >= 1; // card novo já apareceu

  return (
    <div className="relative mx-auto h-72 w-full max-w-sm select-none">
      {/* Card pool ATUAL (base) */}
      <motion.div
        animate={{ opacity: showNew ? 0.45 : 1, scale: showNew ? 0.96 : 1, y: showNew ? 6 : 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="absolute left-0 right-0 top-2 rounded-2xl border border-edge bg-card/80 p-4"
      >
        <PoolRow icon={Landmark} name="Aave · USDC" apy="4,2%" tag="atual" tone="muted" />
      </motion.div>

      {/* Card pool NOVA (sobrepõe) */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: EASE }}
            className={`absolute left-0 right-0 top-12 rounded-2xl border p-4 backdrop-blur ${done ? 'border-lime/60 bg-lime/[0.08]' : 'border-lime/40 bg-card'}`}
            style={{ boxShadow: done ? '0 0 28px rgba(52,226,155,.35)' : '0 12px 30px -12px rgba(52,226,155,.3)' }}
          >
            <PoolRow icon={Zap} name="Morpho · USDC" apy="7,8%" tag={done ? '✓ trocado' : 'recomendado'} tone={done ? 'done' : 'lime'} delta="+3,6%" />

            {/* área de ação */}
            <div className="relative mt-3 h-9">
              <AnimatePresence mode="wait">
                {phase >= 2 && phase <= 3 && (
                  <motion.button
                    key="btn"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, scale: phase === 3 ? 0.95 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-lime text-xs font-bold text-ink"
                  >
                    Confirmar troca
                  </motion.button>
                )}
                {phase === 4 && (
                  <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-lime/30 bg-ink/40 text-xs font-semibold text-muted">
                    <Loader2 size={14} className="animate-spin text-lime" /> Trocando sua pool…
                  </motion.div>
                )}
                {done && (
                  <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-lime/15 text-xs font-bold text-lime">
                    <Check size={15} /> Trocado! Agora rendendo 7,8%/ano
                  </motion.div>
                )}
              </AnimatePresence>

              {/* cursor + clique */}
              <AnimatePresence>
                {phase === 3 && (
                  <>
                    <motion.span
                      key="ripple"
                      initial={{ opacity: 0.5, scale: 0 }}
                      animate={{ opacity: 0, scale: 2.4 }}
                      transition={{ duration: 0.6 }}
                      className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime/40"
                    />
                    <motion.span
                      key="cursor"
                      initial={{ opacity: 0, x: 24, y: 16 }}
                      animate={{ opacity: 1, x: 6, y: 4 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="pointer-events-none absolute left-1/2 top-1/2 text-ftext"
                    >
                      <MousePointerClick size={18} />
                    </motion.span>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* seta "sobe pra pool melhor" */}
      <AnimatePresence>
        {showNew && !done && (
          <motion.div
            key="up"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, -4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ y: { repeat: Infinity, duration: 1.2 }, opacity: { duration: 0.3 } }}
            className="font-mono absolute -top-1 right-0 inline-flex items-center gap-1 text-[10px] font-bold text-lime"
          >
            <ArrowUp size={11} /> rende mais
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PoolRow({ icon: Icon, name, apy, tag, tone, delta }: { icon: typeof Zap; name: string; apy: string; tag: string; tone: 'muted' | 'lime' | 'done'; delta?: string }) {
  const accent = tone === 'muted' ? 'text-muted-2' : 'text-lime';
  return (
    <div className="flex items-center gap-3">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${tone === 'muted' ? 'border-edge bg-ink/50' : 'border-lime/30 bg-lime/10'}`}>
        <Icon size={17} className={accent} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ftext">{name}</p>
        <p className={`font-mono text-[10px] uppercase tracking-wide ${accent}`}>{tag}</p>
      </div>
      <div className="text-right">
        <p className={`font-mono tnum text-base font-bold ${tone === 'muted' ? 'text-muted' : 'text-lime'}`}>{apy}</p>
        {delta && <p className="font-mono tnum text-[10px] font-bold text-lime">{delta}/ano</p>}
      </div>
    </div>
  );
}
