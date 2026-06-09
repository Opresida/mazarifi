import type { ComponentType } from 'react';
import { Link } from 'wouter';
import { Target, ShieldCheck, Zap, Bot, ArrowRight } from 'lucide-react';
import { Logo } from '../components/Logo';
import { WalletButton } from '../components/WalletButton';

export function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="hidden text-sm text-muted hover:text-ftext sm:block">
            Ver opções
          </Link>
          <WalletButton />
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pb-12 pt-10 text-center sm:pt-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-edge bg-card px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-lime" /> Transparência total · Retorno real
        </span>
        <h1 className="font-display mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-ftext sm:text-5xl">
          Otimizador de rendimento de <span className="text-lime">pools de liquidez</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          As maiores taxas anuais (APY) em várias redes — com foco, segurança e eficiência. Em linguagem facilitada:
          você entende tudo em <strong className="text-ftext">10 segundos</strong>.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl bg-lime px-5 py-3 font-semibold text-ink transition-colors hover:bg-lime-bright"
          >
            Ver as melhores opções <ArrowRight size={18} />
          </Link>
          <WalletButton />
        </div>
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          <Pillar icon={Target} label="Foco" />
          <Pillar icon={ShieldCheck} label="Segurança" />
          <Pillar icon={Zap} label="Eficiência" />
          <Pillar icon={Bot} label="100% automático" soon />
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="font-display text-center text-2xl font-bold text-ftext">Como funciona</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Step n={1} title="Conecte sua carteira" desc="Seu dinheiro continua com você — a gente não guarda nada." />
          <Step n={2} title="Veja o ganho REAL" desc="Cada opção já vem com as perdas descontadas e o nível de segurança." />
          <Step n={3} title="Aplique no que faz sentido" desc="Escolha pelo que importa: quanto rende de verdade e quão seguro é." />
        </div>
      </section>

      {/* Por que confiar */}
      <section className="mx-auto max-w-3xl px-5 py-12 text-center">
        <h2 className="font-display text-2xl font-bold text-ftext">Por que confiar na Mazari Fi</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted">
          Quase todo mundo te mostra o número bonito e <strong className="text-ftext">esconde a perda</strong>. A gente faz
          o contrário: mostra o <strong className="text-lime">líquido</strong> — o que sobra depois de tudo. Se uma
          "oportunidade de 20%" na verdade dá prejuízo, você vê isso aqui <strong className="text-ftext">primeiro</strong>.
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-5 py-12">
        <h2 className="font-display mb-6 text-center text-2xl font-bold text-ftext">Perguntas rápidas</h2>
        <Faq q="Preciso entender de cripto?" a="Não. A gente traduz tudo pra linguagem do dia a dia." />
        <Faq q="Vocês guardam meu dinheiro?" a="Não. Ele fica na sua carteira, sempre sob seu controle." />
        <Faq q="É garantido?" a="Não. Mostramos uma estimativa honesta, com o risco e as perdas na cara." />
        <Faq q="Quanto custa?" a="Grátis pra acompanhar as melhores opções." />
      </section>

      {/* CTA + footer */}
      <section className="mx-auto max-w-3xl px-5 pb-16 text-center">
        <div className="glow-lime rounded-3xl border border-edge bg-card/70 p-8">
          <h3 className="font-display text-2xl font-bold text-ftext">Pronto pra ver o ganho real?</h3>
          <p className="mt-2 text-muted">Sem cadastro chato. Conecte e veja em 10 segundos.</p>
          <div className="mt-5 flex justify-center">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl bg-lime px-5 py-3 font-semibold text-ink hover:bg-lime-bright"
            >
              Ver as melhores opções <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <p className="mt-8 text-xs text-muted-2">© 2026 Mazari Fi · Built on Base · Transparência total. Retorno real.</p>
      </section>
    </div>
  );
}

function Pillar({ icon: Icon, label, soon }: { icon: ComponentType<{ size?: number; className?: string }>; label: string; soon?: boolean }) {
  return (
    <div className="rounded-2xl border border-edge bg-card/60 p-3 text-center">
      <Icon size={20} className="mx-auto text-lime" />
      <p className="mt-1.5 text-sm font-medium text-ftext">{label}</p>
      {soon && <span className="mt-1 inline-block rounded bg-iris/15 px-1.5 text-[9px] font-bold uppercase text-iris-bright">em breve</span>}
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-edge bg-card/60 p-5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-lime/12 font-display font-bold text-lime ring-1 ring-lime/20">
        {n}
      </div>
      <h3 className="mt-3 font-display font-semibold text-ftext">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-b border-edge-soft py-4">
      <p className="font-medium text-ftext">{q}</p>
      <p className="mt-1 text-sm text-muted">{a}</p>
    </div>
  );
}
