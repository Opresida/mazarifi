import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import type { Pool } from '../types';
import { poolType, isStable, isBlueChip } from '../lib/pool';
import { safetyBand } from '../lib/format';

type Group = 'tipo' | 'dentro' | 'seguranca';
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
  { id: 'seguro', group: 'seguranca', emoji: '🟢', label: 'Seguro', help: 'Nível de segurança alto.', match: (p) => safetyBand(p.risk_score).label === 'Seguro' },
  { id: 'medio', group: 'seguranca', emoji: '🟡', label: 'Médio', help: 'Nível de segurança médio.', match: (p) => safetyBand(p.risk_score).label === 'Médio' },
  { id: 'arriscado', group: 'seguranca', emoji: '🔴', label: 'Arriscado', help: 'Nível de segurança baixo — cuidado.', match: (p) => safetyBand(p.risk_score).label === 'Arriscado' },
];

const GROUP_TITLE: Record<Group, string> = { tipo: 'Como funciona', dentro: 'O que tem dentro', seguranca: 'Segurança' };
const GROUPS: Group[] = ['tipo', 'dentro', 'seguranca'];

/** Filtra as pools: AND entre grupos, OR dentro do grupo. */
export function applyFilters(pools: Pool[], active: Set<string>): Pool[] {
  if (active.size === 0) return pools;
  const byGroup = new Map<Group, FilterDef[]>();
  for (const f of FILTERS) {
    if (active.has(f.id)) byGroup.set(f.group, [...(byGroup.get(f.group) ?? []), f]);
  }
  return pools.filter((p) => [...byGroup.values()].every((defs) => defs.some((d) => d.match(p))));
}

export function Filters({ active, onToggle, onClear }: { active: Set<string>; onToggle: (id: string) => void; onClear: () => void }) {
  const [help, setHelp] = useState(false);
  return (
    <div className="rounded-2xl border border-edge bg-card/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => setHelp((h) => !h)} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ftext">
          <HelpCircle size={13} /> {help ? 'Ocultar explicações' : 'O que é cada filtro?'}
        </button>
        {active.size > 0 && (
          <button onClick={onClear} className="inline-flex items-center gap-1 text-xs text-muted-2 hover:text-rose">
            <X size={12} /> Limpar
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        {GROUPS.map((g) => {
          const defs = FILTERS.filter((f) => f.group === g);
          return (
            <div key={g}>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-2">{GROUP_TITLE[g]}</p>
              <div className="flex flex-wrap gap-1.5">
                {defs.map((f) => {
                  const on = active.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => onToggle(f.id)}
                      title={f.help}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${on ? 'border-lime/50 bg-lime/12 text-lime' : 'border-edge text-muted hover:text-ftext'}`}
                    >
                      {f.emoji} {f.label}
                    </button>
                  );
                })}
              </div>
              {help && (
                <ul className="mt-1 space-y-0.5">
                  {defs.map((f) => (
                    <li key={f.id} className="text-[10px] leading-relaxed text-muted-2">
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
