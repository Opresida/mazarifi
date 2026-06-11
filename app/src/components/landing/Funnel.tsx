import { motion } from 'framer-motion';
import { Wallet, Landmark, TrendingUp, type LucideIcon } from 'lucide-react';

/** O caminho do dinheiro: Você (USDC) → Mazari acha a rota → monta o cofre → rende. Token viaja no trilho (estilo Lido). */
type Station = { x: number; label: string; sub: string; icon?: LucideIcon; img?: boolean; green?: boolean };
const STATIONS: Station[] = [
  { x: 8, label: 'Você', sub: 'USDC', icon: Wallet },
  { x: 37, label: 'Mazari', sub: 'acha a rota', img: true },
  { x: 64, label: 'Cofre', sub: 'monta a pool', icon: Landmark },
  { x: 92, label: 'Rende', sub: 'pra você', icon: TrendingUp, green: true },
];

export function Funnel() {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative isolate mx-auto flex h-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute -inset-px -z-10 rounded-3xl" style={{ background: 'radial-gradient(420px 220px at 50% -10%, rgba(52,226,155,.12), transparent 70%)' }} />
      <h3 className="font-display text-center text-2xl font-bold text-ftext">O caminho do seu dinheiro</h3>
      <p className="font-mono mx-auto mt-2 max-w-sm text-center text-[13px] leading-relaxed text-muted">
        Do seu bolso ao rendimento — você vê <b className="text-ftext">cada parada</b>. Sem caixa-preta.
      </p>

      {/* trilho + estações */}
      <div className="relative mx-auto mt-12 mb-2 h-28 w-full">
        {/* linha do trilho */}
        <div className="absolute left-[8%] right-[8%] top-7 h-px" style={{ background: 'repeating-linear-gradient(90deg, rgba(138,143,163,.45) 0 6px, transparent 6px 12px)' }} />
        {/* token USDC (logo oficial) viajando */}
        {!reduce && (
          <motion.div
            className="absolute top-7 z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ filter: 'drop-shadow(0 0 10px rgba(52,226,155,.7))' }}
            animate={{ left: ['8%', '37%', '64%', '92%', '92%'] }}
            transition={{ duration: 4.4, times: [0, 0.26, 0.54, 0.82, 1], repeat: Infinity, repeatDelay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src="/logos/usdc.png" alt="USDC" className="h-8 w-8 rounded-full" draggable={false} />
          </motion.div>
        )}
        {/* estações */}
        {STATIONS.map((s) => {
          const Icon = 'icon' in s ? s.icon : null;
          return (
            <div key={s.label} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${s.x}%` }}>
              <div className={`grid h-14 w-14 place-items-center rounded-2xl border bg-ink/70 ${s.green ? 'border-lime/40 glow-lime' : 'border-edge'}`}>
                {s.img ? (
                  <img src="/logo-icon.png" alt="Mazari" className="h-8 w-8 object-contain" />
                ) : Icon ? (
                  <Icon size={22} className={s.green ? 'text-lime' : 'text-muted'} />
                ) : null}
              </div>
              <p className={`font-display mt-2 text-sm font-semibold ${s.green ? 'text-lime' : 'text-ftext'}`}>{s.label}</p>
              <p className="font-mono text-[10px] text-muted-2">{s.sub}</p>
            </div>
          );
        })}
      </div>

      <p className="font-mono mt-4 text-center text-[10px] text-muted-2">Não-custodial · você assina cada passo · a Mazari nunca segura seu dinheiro.</p>
    </motion.div>
  );
}
