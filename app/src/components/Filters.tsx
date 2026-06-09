import { useState } from 'react';
import { HelpCircle, SlidersHorizontal, X } from 'lucide-react';
import type { Pool } from '../types';
import { poolType, isStable, isBlueChip } from '../lib/pool';
import { safetyBand } from '../lib/format';

type Group = 'tipo' | 'dentro' | 'seguranca' | 'origem';
interface FilterDef {
  id: string;
  group: Group;
  emoji: string;
  label: string;
  help: string;
  match: (p: Pool) => boolean;
}

export const FILTERS: FilterDef[] = [
  { id: 'emprestimo', group: 'tipo', emoji: '🏦', label: 'Empréstimo', help: 'Você empresta 1 moeda e recebe juros. Simples e mais seguro.', match: (p) => poolType(p) === 'emprestimo' },
  { id: 'troca', group: 'tipo', emoji: '🔄', label: 'Pool de troca', help: 'Você vira casa de câmbio de um par e ganha comissão. Tem risco de perda se o preço variar.', match: (p) => poolType(p) === 'troca' },
  { id: 'concentrada', group: 'tipo', emoji: '🎯', label: 'Concentrada', help: 'Como a troca, mas turbinada: rende mais, porém é a mais complexa e arriscada.', match: (p) => poolType(p) === 'concentrada' },
  { id: 'estavel', group: 'dentro', emoji: '🪙', label: 'Moedas estáveis', help: 'Moedas que não balançam (tipo dólar). Quase sem risco de variação.', match: isStable },
  { id: 'bluechip', group: 'dentro', emoji: '💎', label: 'ETH / BTC', help: 'As cripto grandes e consolidadas.', match: isBlueChip },
  { id: 'incentivo', group: 'dentro', emoji: '🎁', label: 'Com incentivo', help: 'Pools que pagam um bônus extra em outro token (ex.: AERO). Rende mais — confira a solidez do token no detalhe.', match: (p) => p.reward_symbol != null },
  { id: 'sem-incentivo', group: 'dentro', emoji: '🧱', label: 'Sem incentivo', help: 'Rendimento "puro" — só a comissão/juros, sem bônus em token volátil. Mais previsível.', match: (p) => p.reward_symbol == null },
  { id: 'seguro', group: 'seguranca', emoji: '🟢', label: 'Seguro', help: 'Nível de segurança alto.', match: (p) => safetyBand(p.risk_score).label === 'Seguro' },
  { id: 'medio', group: 'seguranca', emoji: '🟡', label: 'Médio', help: 'Nível de segurança médio.', match: (p) => safetyBand(p.risk_score).label === 'Médio' },
  { id: 'arriscado', group: 'seguranca', emoji: '🔴', label: 'Arriscado', help: 'Nível de segurança baixo — cuidado.', match: (p) => safetyBand(p.risk_score).label === 'Arriscado' },
  { id: 'nortoken', group: 'origem', emoji: '⬢', label: 'Nortoken', help: 'Pools criadas na nossa plataforma, medidas direto na blockchain — nossa vantagem injusta.', match: (p) => p.source === 'nortoken' },
  { id: 'mercado', group: 'origem', emoji: '🌐', label: 'Mercado', help: 'Pools do mercado aberto (Aave, Uniswap, Aerodrome…), trazidas do DefiLlama.', match: (p) => p.source === 'external' },
];

const GROUP_TITLE: Record<Group, string> = { tipo: 'Como funciona', dentro: 'O que tem dentro', seguranca: 'Segurança', origem: 'Origem' };
const GROUPS: Group[] = ['tipo', 'dentro', 'seguranca', 'origem'];

/** Filtra as pools: AND entre grupos, OR dentro do grupo. */
export function applyFilters(pools: Pool[], active: Set<string>): Pool[] {
  if (active.size === 0) return pools;
  const byGroup = new Map<Group, FilterDef[]>();
  for (const f of FILTERS) {
    if (active.has(f.id)) byGroup.set(f.group, [...(byGroup.get(f.group) ?? []), f]);
  }
  return pools.filter((p) => [...byGroup.values()].every((defs) => defs.some((d) => d.match(p))));
}

export function Filters({
  active,
  onToggle,
  onClear,
  count,
}: {
  active: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  count: number;
}) {
  const [help, setHelp] = useState(false);
  return (
    <div className="rounded-2xl border border-edge bg-gradient-to-b from-card/80 to-card/40 p-3 sm:p-4">
      {/* header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ftext">
            <SlidersHorizontal size={15} className="text-lime" /> Filtros
          </span>
          <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted">{count} {count === 1 ? 'opção' : 'opções'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setHelp((h) => !h)}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${help ? 'bg-iris/15 text-iris-bright' : 'text-muted hover:text-ftext'}`}
          >
            <HelpCircle size={13} /> {help ? 'Ocultar' : 'O que é?'}
          </button>
          {active.size > 0 && (
            <button onClick={onClear} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-2 transition-colors hover:bg-rose/10 hover:text-rose">
              <X size={12} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* grupos */}
      <div className="flex flex-col gap-3">
        {GROUPS.map((g) => {
          const defs = FILTERS.filter((f) => f.group === g);
          return (
            <div key={g}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-2">{GROUP_TITLE[g]}</p>
              <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                {defs.map((f) => {
                  const on = active.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => onToggle(f.id)}
                      title={f.help}
                      className={`group shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95 ${
                        on
                          ? 'border-lime/60 bg-lime/15 text-lime shadow-[0_0_18px_rgba(52,226,155,0.20)]'
                          : 'border-edge bg-ink/50 text-muted hover:border-lime/30 hover:text-ftext'
                      }`}
                    >
                      <span className="text-sm leading-none">{f.emoji}</span>
                      {f.label}
                    </button>
                  );
                })}
              </div>
              {help && (
                <ul className="mt-1.5 space-y-1 rounded-xl bg-ink/40 p-2.5">
                  {defs.map((f) => (
                    <li key={f.id} className="text-[11px] leading-relaxed text-muted-2">
                      <span className="text-muted">{f.emoji} {f.label}:</span> {f.help}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
