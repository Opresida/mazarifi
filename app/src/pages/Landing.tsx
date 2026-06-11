import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { motion, useInView } from 'framer-motion';
import Lenis from 'lenis';
import { ArrowRight, ArrowUpRight, Anchor, ShieldCheck, Layers, Sparkles, Lock, Eye } from 'lucide-react';
import { Logo } from '../components/Logo';
import { WalletButton } from '../components/WalletButton';
import { fetchBest } from '../api';
import type { BestPicks } from '../types';
import { Constellation } from '../components/landing/Constellation';

const EASE = [0.16, 1, 0.3, 1] as const;

export function Landing() {
  const [best, setBest] = useState<BestPicks | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetchBest().then(setBest).catch(() => {});
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    // scroll inercial (Lenis) — só sem reduced-motion
    let raf = 0;
    let lenis: Lenis | null = null;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lenis = new Lenis({ duration: 1.1 });
      const loop = (t: number) => { lenis!.raf(t); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); lenis?.destroy(); };
  }, []);

  const bestReturn = best?.lending?.return_15d ?? best?.trade?.return_15d ?? null;

  return (
    <div className="min-h-screen overflow-x-clip">
      {/* S0 — Navbar sticky-shrink */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-lime/15 bg-ink/80 backdrop-blur-xl' : 'border-b border-transparent'}`}>
        <div className={`mx-auto flex max-w-6xl items-center justify-between px-5 transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'}`}>
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#resolve" className="nav-underline hover:text-ftext">Como funciona</a>
            <a href="#cofres" className="nav-underline hover:text-ftext">Cofres</a>
            <a href="#taxas" className="nav-underline hover:text-ftext">Taxas</a>
            <a href="#seguranca" className="nav-underline hover:text-ftext">Segurança</a>
          </nav>
          <div className="flex items-center gap-3">
            {bestReturn != null && (
              <span className="font-mono tnum hidden items-center gap-2 rounded-full border border-edge bg-card/70 px-3 py-1.5 text-[11px] text-muted sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" />
                melhor cofre hoje · <b className="text-lime">rendeu +{bestReturn.toFixed(2)}% em 15d</b>
              </span>
            )}
            <Link href="/dashboard" className="rounded-xl bg-lime px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-lime-bright">Abrir app</Link>
          </div>
        </div>
      </header>

      {/* S1 — Hero (Constelação) */}
      <section className="hero-bg relative overflow-hidden">
        <div className="mesh-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <Reveal>
              <span className="font-mono inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/5 px-3 py-1 text-[11px] text-lime">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" /> DeFi honesto · construído na Base
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="font-display mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-ftext sm:text-6xl">
                Seu dinheiro rende no melhor cofre.{' '}
                <span className="text-lime">Venha ele de onde vier.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                Em qualquer rede — Ethereum, Base, Arbitrum, BNB — com qualquer moeda conhecida. A Mazari <b className="text-ftext">acha onde está, traz e investe</b> pra você. Você só assina; o resto é com a gente.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Magnetic>
                  <Link href="/dashboard" className="cta-liquid flex items-center gap-2 rounded-xl bg-lime px-6 py-3.5 font-semibold text-ink">
                    Começar a render <ArrowRight size={18} />
                  </Link>
                </Magnetic>
                <a href="#resolve" className="flex items-center gap-1.5 rounded-xl border border-edge px-5 py-3.5 font-semibold text-ftext transition-colors hover:border-lime/40 hover:text-lime">
                  Ver como funciona <ArrowRight size={16} />
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="font-mono mt-5 text-[11px] leading-relaxed text-muted-2">
                Taxa de <b className="text-amber">0,30% só na entrada</b>. Saída sempre grátis. Seu dinheiro nunca passa pela gente.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <Constellation />
          </Reveal>
        </div>
      </section>

      {/* S2 — A Mazari resolve */}
      <section id="resolve" className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">a mazari resolve</p>
          <h2 className="font-display mt-3 max-w-2xl text-3xl font-bold leading-tight text-ftext sm:text-4xl">
            Tem dinheiro espalhado? <span className="text-muted">A gente junta tudo.</span>
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            USDC na BNB, ETH na Base, um trocado na Arbitrum? A Mazari <b className="text-ftext">detecta sozinha onde está</b>, traz pra rede certa e investe no cofre — numa assinatura só. Sem ponte manual, sem trocar moeda na mão.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-edge bg-edge sm:grid-cols-3">
          <Beat n="01" title="A gente acha seu dinheiro" desc="Varremos 7 redes e achamos seus ativos conhecidos, onde quer que estejam." />
          <Beat n="02" title="Traz pra rede certa" desc="A melhor rota cross-chain, automática — você não escolhe nada." />
          <Beat n="03" title="Investe no melhor cofre" desc="Monta a posição e te entrega pronta. Você só acompanha o rendimento." />
        </div>
      </section>

      {/* S3 — Honestidade (INVERTIDA / clara) */}
      <section id="taxas" className="bg-bone text-ink">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-700">honestidade radical</p>
            <h2 className="font-display mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
              Tudo que você ganha — e tudo que a gente cobra — numa tela só.
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-zinc-600">
              Quase todo mundo mostra o número bonito e esconde a perda. A gente faz o contrário: mostramos o que <b>rendeu de verdade nos últimos 15 dias</b> (não promessa), já tirando perda, taxa e gás.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            <LightCard icon={Eye} title="Número líquido, sempre" desc="Já descontamos a perda impermanente, as taxas e o gás. O que você vê é o que sobra pra você." />
            <LightCard icon={ShieldCheck} title="Checklist de risco aberto" desc="Cada cofre vem com as verificações de segurança na mesa. Sem letra miúda, sem asterisco." />
            <LightCard icon={Layers} title="Taxa de 0,30%. Só na entrada." desc="Saída sempre grátis. E se não dá pra montar com segurança, a gente fala 'em breve' — não te empurra." />
          </div>
          <p className="font-mono mt-8 inline-flex items-center gap-2 rounded-lg bg-amber/15 px-3 py-1.5 text-[11px] text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" /> Verde é o que você ganha. Âmbar é a gente te avisando. Você sempre sabe qual é qual.
          </p>
        </div>
      </section>

      {/* S4 — Cobertura / motores */}
      <section id="cofres" className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">cobertura</p>
          <h2 className="font-display mt-3 max-w-2xl text-3xl font-bold leading-tight text-ftext sm:text-4xl">
            A gente monta a posição nos maiores protocolos.
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            Aave, Morpho, Compound, Fluid, cofres gerenciados e renda fixa. Se dá pra montar com segurança, a Mazari monta. Se ainda não dá, é <b className="text-amber">"em breve"</b> honesto.
          </p>
        </Reveal>
        <div className="mt-10 flex flex-wrap gap-3">
          {['Aave', 'Morpho', 'Compound', 'Fluid', 'Beefy', 'Pendle', 'Spark', 'Moonwell'].map((p, i) => (
            <Reveal key={p} delay={i * 0.04}>
              <span className="font-mono rounded-xl border border-edge bg-card/60 px-4 py-2.5 text-sm text-ftext transition-colors hover:border-lime/40 hover:text-lime">{p}</span>
            </Reveal>
          ))}
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-edge bg-edge sm:grid-cols-3">
          <BigStat value={7} label="redes de origem" />
          <BigStat value={8} label="protocolos integrados" plus />
          <BigStat value={2} label="redes de investimento (Base + Arbitrum)" />
        </div>
      </section>

      {/* S5 — Não-custodial + segurança */}
      <section id="seguranca" className="relative overflow-hidden border-y border-edge bg-void">
        <div className="mesh-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-2">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">não-custodial</p>
            <h2 className="font-display mt-3 text-3xl font-bold leading-tight text-ftext sm:text-4xl">
              Seu dinheiro nunca passa pela gente.
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-muted">
              Cada movimento é uma transação que <b className="text-ftext">você assina</b> da sua própria carteira. A Mazari é a inteligência que acha o caminho — não o cofre que guarda a chave. Raiz funda, princípio intocado.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureLine icon={Lock} title="Você assina, sempre" desc="Nenhuma operação sem a sua confirmação na carteira." />
              <FeatureLine icon={Anchor} title="Princípio intocado" desc="A gente otimiza a rota; o seu valor é só seu." />
            </div>
          </Reveal>
        </div>
      </section>

      {/* S6 — Gerenciadas + Pendle */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="font-display max-w-2xl text-3xl font-bold leading-tight text-ftext sm:text-4xl">
            Dois jeitos de render, do seu jeito.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl border border-lime/20 bg-gradient-to-b from-lime/5 to-transparent p-7">
              <p className="font-mono text-xs uppercase tracking-wider text-lime">cofre gerenciado</p>
              <h3 className="font-display mt-2 text-xl font-bold text-ftext">A gestão cuida do range sozinha.</h3>
              <p className="mt-3 leading-relaxed text-muted">Você só acompanha. A posição se mantém otimizada sem você fazer nada — com o número real, medido por nós.</p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full rounded-3xl border border-amber/20 bg-gradient-to-b from-amber/5 to-transparent p-7">
              <p className="font-mono text-xs uppercase tracking-wider text-amber">renda fixa · pendle</p>
              <h3 className="font-display mt-2 text-xl font-bold text-ftext">Você trava um rendimento até a data.</h3>
              <p className="mt-3 leading-relaxed text-muted">Sabe exatamente o que vai receber até o vencimento. E mostramos a data na cara — quando ela chega, a gente te avisa.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* S7 — Autopilot "em breve" */}
      <section className="mx-auto max-w-4xl px-5 py-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-amber/25 bg-gradient-to-br from-amber/8 to-transparent p-8 text-center sm:p-12">
            <span className="font-mono inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-[11px] font-bold uppercase text-amber">
              <Sparkles size={12} /> em construção
            </span>
            <h2 className="font-display mt-4 text-2xl font-bold text-ftext sm:text-3xl">Em breve: o rendimento que se ajeita sozinho.</h2>
            <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted">
              Estamos construindo o <b className="text-amber">Autopilot</b> — ele vai trocar seu dinheiro de cofre sozinho quando aparecer um melhor. Ainda não está no ar, e a gente não finge que está. Quando ligar, você é o primeiro a saber.
            </p>
          </div>
        </Reveal>
      </section>

      {/* S8 — CTA final + footer */}
      <section className="border-t border-edge bg-void">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-ftext sm:text-4xl">Deixa o rendimento com a gente.</h2>
            <p className="mt-3 text-muted">Sem cadastro chato. Conecte e veja o ganho real em 10 segundos.</p>
            <div className="mt-7 flex justify-center">
              <Magnetic>
                <Link href="/dashboard" className="cta-liquid flex items-center gap-2 rounded-xl bg-lime px-7 py-4 text-lg font-semibold text-ink">
                  Começar a render <ArrowUpRight size={20} />
                </Link>
              </Magnetic>
            </div>
          </Reveal>
        </div>
        <footer className="mx-auto max-w-6xl px-5 pb-12">
          <div className="flex flex-col items-center justify-between gap-4 border-t border-edge-soft pt-8 sm:flex-row">
            <Logo />
            <p className="font-mono text-[11px] text-muted-2">DeFi honesto. Você no controle. · Construído na Base</p>
          </div>
          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-2">
            Investir em cripto tem risco de perda. Rendimento passado não garante o futuro. A Mazari Fi é uma ferramenta <b>não-custodial</b> — você no controle. © 2026 Mazari Fi.
          </p>
        </footer>
      </section>
    </div>
  );
}

/* ── helpers de movimento ── */
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function Magnetic({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={ref}
      className="inline-block"
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      }}
      onMouseLeave={() => { if (ref.current) ref.current.style.transform = 'translate(0,0)'; }}
      style={{ transition: 'transform .25s cubic-bezier(.16,1,.3,1)' }}
    >
      {children}
    </motion.div>
  );
}

function CountUp({ to, plus }: { to: number; plus?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0, start: number | null = null;
    const step = (t: number) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / 1000);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref} className="tnum">{Math.round(v)}{plus ? '+' : ''}</span>;
}

/* ── blocos ── */
function Beat({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="bg-ink p-7">
      <span className="font-mono text-sm text-lime">{n}</span>
      <h3 className="font-display mt-3 text-lg font-semibold text-ftext">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  );
}

function BigStat({ value, label, plus }: { value: number; label: string; plus?: boolean }) {
  return (
    <div className="bg-ink p-7 text-center">
      <p className="font-display font-mono text-5xl font-bold text-lime"><CountUp to={value} plus={plus} /></p>
      <p className="mt-2 text-sm text-muted">{label}</p>
    </div>
  );
}

function LightCard({ icon: Icon, title, desc }: { icon: typeof Eye; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-zinc-300 bg-white/60 p-5">
      <Icon size={20} className="text-emerald-700" />
      <h3 className="font-display mt-3 font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{desc}</p>
    </div>
  );
}

function FeatureLine({ icon: Icon, title, desc }: { icon: typeof Lock; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-edge bg-card/50 p-5">
      <Icon size={18} className="text-lime" />
      <h3 className="font-display mt-2.5 font-semibold text-ftext">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  );
}
