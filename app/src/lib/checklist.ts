import type { Pool } from '../types';
import { safetyBand } from './format';

export interface CheckItem {
  label: string;
  status: 'ok' | 'warn' | 'na';
  note: string;
  source: 'auto' | 'curado' | 'pendente';
}

const KNOWN_PROTOCOLS = ['aerodrome', 'uniswap', 'curve', 'balancer', 'morpho', 'aave', 'compound', 'pendle', 'velodrome', 'sushiswap', 'pancakeswap', 'fluid', 'spark', 'moonwell'];
// Ativos reais conhecidos (não sintéticos/algorítmicos)
const SAFE_ASSETS = ['USDC', 'USDT', 'DAI', 'USDS', 'GHO', 'FRAX', 'PYUSD', 'USDE', 'EURC', 'ETH', 'WETH', 'BTC', 'CBBTC', 'WBTC', 'WSTETH', 'WEETH', 'CBETH'];

const known = (p: Pool) => KNOWN_PROTOCOLS.some((k) => p.project.toLowerCase().includes(k));
const tokensOf = (p: Pool) => p.symbol.toUpperCase().split(/[-/ ]/).filter(Boolean);

/** Checklist honesto: marca o que é auto, curado e pendente — não finge checar tudo (estilo Beefy, em PT). */
export function buildChecklist(p: Pool): CheckItem[] {
  const items: CheckItem[] = [];
  const single = p.exposure === 'single';

  items.push({
    label: 'Risco de perda quando o preço varia (IL)',
    status: single ? 'ok' : 'warn',
    note: single ? 'Empréstimo de 1 moeda — sem perda impermanente.' : 'É um par — pode ter perda impermanente se os preços se afastarem.',
    source: 'auto',
  });

  const band = safetyBand(p.risk_score);
  items.push({
    label: 'Nível de segurança',
    status: band.label === 'Seguro' ? 'ok' : 'warn',
    note: `${band.label} (nota ${p.risk_score ?? '—'}/100, cega à origem).`,
    source: 'auto',
  });

  if (p.reward_symbol) {
    const ri = p.reward_integrity;
    items.push({
      label: `Token de incentivo (${p.reward_symbol}) sólido`,
      status: ri?.label === 'Sólido' ? 'ok' : 'warn',
      note: ri ? `${ri.label}${ri.verified ? ' · contrato verificado' : ''}${ri.knownProtocol ? ' · protocolo conhecido' : ''}.` : 'Tem incentivo — confira a solidez do token.',
      source: 'auto',
    });
  } else {
    items.push({ label: 'Token de incentivo', status: 'na', note: 'Não tem incentivo — rendimento puro de fee/juros.', source: 'auto' });
  }

  const k = known(p);
  items.push({
    label: 'Protocolo consolidado e auditado',
    status: k ? 'ok' : 'warn',
    note: k ? `${p.project} é um protocolo conhecido e battle-tested.` : 'Protocolo fora da nossa lista de consolidados — pesquise antes de entrar.',
    source: 'curado',
  });

  const allSafe = tokensOf(p).every((t) => SAFE_ASSETS.includes(t) || SAFE_ASSETS.some((s) => t.includes(s)));
  items.push({
    label: 'Sem ativo sintético/algorítmico',
    status: allSafe ? 'ok' : 'na',
    note: allSafe ? 'Ativos reais conhecidos (stables / ETH / BTC).' : 'Tem ativo fora da lista conhecida — não checado automaticamente.',
    source: allSafe ? 'curado' : 'pendente',
  });

  items.push({ label: 'Distribuição de supply (holders)', status: 'na', note: 'Não checado — exige dado de holders (curadoria futura).', source: 'pendente' });
  items.push({ label: 'Timelocks nas funções de admin', status: 'na', note: 'Não checado por protocolo (curadoria futura).', source: 'pendente' });

  return items;
}
