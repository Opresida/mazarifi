import type { ComponentType, ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Logo } from './Logo';

export interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  badge?: number;
}

export function Shell({ nav, topRight, children }: { nav: NavItem[]; topRight?: ReactNode; children: ReactNode }) {
  const [loc] = useLocation();
  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-edge bg-ink-2/60 p-4 md:flex">
        <Link href="/" className="mb-7 block">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((it) => {
            const active = loc === it.path;
            const Icon = it.icon;
            return (
              <Link
                key={it.path}
                href={it.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-lime/12 text-lime ring-1 ring-lime/20' : 'text-muted hover:bg-card hover:text-ftext'
                }`}
              >
                <Icon size={18} />
                {it.label}
                {it.badge ? <span className="ml-auto rounded-full bg-lime/20 px-1.5 text-[10px] text-lime">{it.badge}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto text-[10px] tracking-wide text-muted-2">Built on Base · Transparência total</div>
      </aside>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-edge bg-ink/80 px-4 py-3 backdrop-blur md:px-6">
          <Link href="/" className="md:hidden">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-2">{topRight}</div>
        </header>
        <main className="px-4 py-5 pb-24 md:px-6 md:py-6 md:pb-8">{children}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-edge bg-ink/95 backdrop-blur md:hidden">
        {nav.slice(0, 4).map((it) => {
          const active = loc === it.path;
          const Icon = it.icon;
          return (
            <Link
              key={it.path}
              href={it.path}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${active ? 'text-lime' : 'text-muted'}`}
            >
              <Icon size={18} />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
