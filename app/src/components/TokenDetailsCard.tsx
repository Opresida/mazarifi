import { ExternalLink, FileCode } from 'lucide-react';
import type { Pool } from '../types';
import { assetRows } from '../lib/tokens';
import { Card } from './atoms';

/** Detalhes de cada ativo da pool: site oficial + contrato (BaseScan). Estilo "Assets" da Beefy. */
export function TokenDetailsCard({ pool }: { pool: Pool }) {
  const rows = assetRows(pool).filter((r) => r.explorer || r.site);
  if (rows.length === 0) return null;
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-ftext">Ativos</p>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.symbol} className="flex items-center justify-between gap-2 rounded-xl border border-edge bg-ink/40 px-3 py-2">
            <span className="font-display font-semibold text-ftext">{r.symbol}</span>
            <div className="flex items-center gap-2 text-xs">
              {r.site && (
                <a href={r.site} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-edge px-2 py-1 text-muted transition-colors hover:border-lime/30 hover:text-ftext">
                  <ExternalLink size={12} /> Site
                </a>
              )}
              {r.explorer && (
                <a href={r.explorer} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-edge px-2 py-1 text-muted transition-colors hover:border-lime/30 hover:text-ftext">
                  <FileCode size={12} /> Contrato
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
