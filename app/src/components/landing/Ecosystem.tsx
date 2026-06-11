import { motion } from 'framer-motion';
import { Coins, Layers, Rocket, Megaphone, Leaf, Wallet, ArrowUpRight, Check } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

/** A marca da Nortoken (caixa gradiente + cubo + wordmark), reproduzida do menu do projeto. */
function NortokenMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-500 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
        <svg className="h-6 w-6 text-[#02181a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-black italic uppercase leading-none tracking-tighter text-white">Nortoken</span>
        <span className="font-mono mt-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-emerald-400">Launchpad on-chain</span>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Coins, text: 'Crie seu token em minutos — sem escrever código.' },
  { icon: Layers, text: 'Monte a pool de liquidez e trave o contrato com 1 clique.' },
  { icon: Rocket, text: 'Ferramentas premium de aceleração do seu token.' },
  { icon: Megaphone, text: 'Serviços de marketing e divulgação pra decolar.' },
  { icon: Leaf, text: 'Bioeconomia amazônica: parte de cada lançamento volta pra Amazônia.', green: true },
];

export function Ecosystem() {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <section className="relative overflow-hidden border-y border-edge bg-void">
      <div className="mesh-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-5 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">o universo defi da mazari</p>
          <h2 className="font-display mx-auto mt-3 max-w-2xl text-3xl font-bold leading-tight text-ftext sm:text-4xl">
            Rendimento é só o começo.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted">
            A Mazari Fi faz seu dinheiro render. A <b className="text-emerald-400">Nortoken</b> deixa você lançar seu próprio token. E tem mais chegando — tudo conectado, do seu jeito.
          </p>
        </motion.div>

        {/* trilho do ecossistema: 3 produtos conectados */}
        <div className="relative mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-3">
          <div className="absolute left-[16%] right-[16%] top-7 hidden h-px sm:block">
            <div className="flow-line absolute inset-0" />
            {!reduce && (
              <motion.div
                className="absolute top-1/2 h-[3px] w-14 -translate-y-1/2 rounded-full"
                style={{ maskImage: 'linear-gradient(90deg, transparent, #000, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000, transparent)' }}
                animate={{
                  left: ['-10%', '50%', '108%'],
                  backgroundColor: ['#34e29b', '#22d3ee', '#f5b544'],
                  boxShadow: ['0 0 8px rgba(52,226,155,.75)', '0 0 9px rgba(34,211,238,.8)', '0 0 9px rgba(245,181,68,.8)'],
                }}
                transition={{ duration: 3, times: [0, 0.5, 1], repeat: Infinity, repeatDelay: 0.3, ease: 'linear' }}
              />
            )}
          </div>
          <EcoNode tone="lime" label="Mazari Fi" sub="você está aqui" img="/logo-icon.png" />
          <EcoNode tone="emerald" label="Nortoken" sub="lance seu token" cube />
          <EcoNode tone="amber" label="Mazari Wallet" sub="em breve" icon={Wallet} dim />
        </div>

        {/* painel destaque da Nortoken */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="group relative isolate mx-auto mt-12 max-w-3xl overflow-hidden rounded-3xl border border-emerald-500/25 bg-white/[0.03] p-7 backdrop-blur-md sm:p-9"
        >
          <div className="pointer-events-none absolute -inset-px -z-10 rounded-3xl opacity-70 transition-opacity group-hover:opacity-100" style={{ background: 'radial-gradient(520px 260px at 50% -10%, rgba(16,185,129,.16), transparent 70%)' }} />
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <NortokenMark />
            <a
              href="https://nortoken.mazaricorp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-500 px-5 py-3 text-sm font-bold text-[#02181a] transition-transform hover:scale-105"
            >
              Conhecer a Nortoken <ArrowUpRight size={16} />
            </a>
          </div>
          <h3 className="font-display mt-7 max-w-xl text-2xl font-bold leading-tight text-ftext">
            Tem uma ideia de token? A Nortoken lança — do zero à pool, com aceleração de verdade.
          </h3>
          <div className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-start gap-3">
                <f.icon size={18} className={`mt-0.5 shrink-0 ${f.green ? 'text-lime' : 'text-emerald-400'}`} />
                <p className={`text-sm leading-relaxed ${f.green ? 'text-ftext' : 'text-muted'}`}>{f.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function EcoNode({ tone, label, sub, img, cube, icon: Icon, dim }: { tone: 'lime' | 'emerald' | 'amber'; label: string; sub: string; img?: string; cube?: boolean; icon?: typeof Wallet; dim?: boolean }) {
  const ring = tone === 'lime' ? 'border-lime/40 glow-lime' : tone === 'emerald' ? 'border-emerald-500/40' : 'border-amber/40';
  const txt = tone === 'lime' ? 'text-lime' : tone === 'emerald' ? 'text-emerald-400' : 'text-amber';
  return (
    <div className={`flex flex-col items-center text-center ${dim ? 'opacity-70' : ''}`}>
      <div className={`grid h-14 w-14 place-items-center rounded-2xl border bg-ink/70 ${ring}`}>
        {cube ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-500">
            <svg className="h-5 w-5 text-[#02181a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        ) : img ? (
          <img src={img} alt={label} className="h-9 w-9 object-contain" />
        ) : Icon ? (
          <Icon size={22} className={txt} />
        ) : null}
      </div>
      <p className={`font-display mt-2.5 text-sm font-semibold ${dim ? 'text-muted' : 'text-ftext'}`}>{label}</p>
      <p className={`font-mono inline-flex items-center gap-1 text-[10px] ${txt}`}>
        {tone === 'lime' && <Check size={10} />}{sub}
      </p>
    </div>
  );
}
