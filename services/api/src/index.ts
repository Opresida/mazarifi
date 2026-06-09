import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente (.env)');
const sql = neon(process.env.DATABASE_URL);

const app = express();
app.use(cors());

/** Ranking honesto — CEGO À ORIGEM: ordena por risco, depois rendimento. `source` NÃO interfere. */
app.get('/api/pools', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT * FROM pools
      ORDER BY risk_score DESC NULLS LAST, COALESCE(net_annual_15d, apy_base, 0) DESC`;
    res.json(rows);
  } catch (e) {
    console.error(e); // detalhe só no log do servidor — nunca no corpo da resposta (evita vazar a connection string)
    res.status(500).json({ error: 'erro interno' });
  }
});

/** Estatísticas globais (header do painel). */
app.get('/api/stats', async (_req, res) => {
  try {
    const [s] = await sql`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE source='nortoken')::int AS nortoken,
             count(*) FILTER (WHERE source='external')::int AS external,
             COALESCE(sum(tvl_usd),0)::float8 AS tvl_total,
             max(updated_at) AS updated_at
      FROM pools`;
    res.json(s);
  } catch (e) {
    console.error(e); // detalhe só no log do servidor — nunca no corpo da resposta (evita vazar a connection string)
    res.status(500).json({ error: 'erro interno' });
  }
});

/** Melhores opções AGORA — DOIS destaques (empréstimo vs pool de troca), ambos:
 *  rendimento real >0, razoavelmente seguros, PREFERINDO baixa volatilidade (não destaca spike),
 *  e com TVL mínimo (não destaca pool testnet de TVL irrisória como "melhor pra aplicar"). */
const MIN_TVL = 50000;
app.get('/api/best', async (_req, res) => {
  try {
    const [lending] = await sql`
      SELECT * FROM pools
      WHERE return_15d IS NOT NULL AND return_15d > 0 AND risk_score >= 65
        AND exposure = 'single' AND COALESCE(tvl_usd, 0) >= ${MIN_TVL}
      ORDER BY (CASE WHEN vol_low > 0 AND vol_high <= vol_low * 3 THEN 0 ELSE 1 END), net_annual_15d DESC
      LIMIT 1`;
    const [trade] = await sql`
      SELECT * FROM pools
      WHERE return_15d IS NOT NULL AND return_15d > 0 AND risk_score >= 60
        AND exposure = 'multi' AND COALESCE(tvl_usd, 0) >= ${MIN_TVL}
      ORDER BY (CASE WHEN vol_low > 0 AND vol_high <= vol_low * 3 THEN 0 ELSE 1 END), net_annual_15d DESC
      LIMIT 1`;
    res.json({ lending: lending ?? null, trade: trade ?? null });
  } catch (e) {
    console.error(e); // detalhe só no log do servidor — nunca no corpo da resposta (evita vazar a connection string)
    res.status(500).json({ error: 'erro interno' });
  }
});

/** Métricas do admin — agregados REAIS (o resto do admin usa números de exemplo marcados). */
app.get('/api/admin/metrics', async (_req, res) => {
  try {
    const byChain = await sql`
      SELECT chain, count(*)::int AS pools, COALESCE(sum(tvl_usd),0)::float8 AS tvl
      FROM pools GROUP BY chain ORDER BY tvl DESC`;
    const byRisk = await sql`
      SELECT CASE WHEN risk_score >= 75 THEN 'Seguro' WHEN risk_score >= 50 THEN 'Médio' ELSE 'Arriscado' END AS band,
             count(*)::int AS n
      FROM pools WHERE risk_score IS NOT NULL GROUP BY band`;
    const [agg] = await sql`
      SELECT count(*)::int AS pools, COALESCE(sum(tvl_usd),0)::float8 AS tvl_total,
             COALESCE(avg(risk_score),0)::float8 AS avg_risk, max(updated_at) AS updated_at
      FROM pools`;
    res.json({ ...agg, byChain, byRisk });
  } catch (e) {
    console.error(e); // detalhe só no log do servidor — nunca no corpo da resposta (evita vazar a connection string)
    res.status(500).json({ error: 'erro interno' });
  }
});

/** ZAP não-custodial via Enso: monta a tx "USDC → posição da pool" pro usuário ASSINAR (fundos nunca passam pela Mazari).
 *  A chave Enso fica SÓ aqui no servidor. ZAP_ENABLED=off → desativa (kill-switch). */
const ENSO = 'https://api.enso.finance/api/v1';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const ensoHeaders = () => ({ Authorization: `Bearer ${process.env.ENSO_API_KEY}` });

function ensoSlug(project: string): string | null {
  const p = project.toLowerCase();
  if (p.includes('aerodrome')) return 'aerodrome';
  if (p.includes('uniswap-v3') || p.includes('uniswap-v4')) return 'uniswap-v3';
  if (p.includes('morpho')) return 'morpho-blue-vaults';
  if (p.includes('curve')) return 'curve-dex';
  if (p.includes('balancer')) return 'balancer-v2';
  if (p.includes('uniswap-v2') || p.includes('sushiswap')) return 'uniswap-v2';
  return null;
}

app.get('/api/zap/quote', async (req, res) => {
  try {
    if (process.env.ZAP_ENABLED !== 'true' || !process.env.ENSO_API_KEY) return res.json({ supported: false, reason: 'zap desativado' });
    const poolKey = String(req.query.poolKey ?? '');
    const amountUsdc = Number(req.query.amountUsdc ?? 0);
    const fromAddress = String(req.query.fromAddress ?? '');
    const slippageBps = Number(req.query.slippageBps) || 50;
    if (!poolKey || !(amountUsdc > 0) || !fromAddress) return res.status(400).json({ error: 'parâmetros faltando' });

    const [pool] = await sql`SELECT project, raw FROM pools WHERE pool_key = ${poolKey} LIMIT 1`;
    if (!pool) return res.json({ supported: false, reason: 'pool não encontrada' });
    const slug = ensoSlug(pool.project);
    const underlying: string[] = (pool.raw?.underlyingTokens ?? []) as string[];
    if (!slug || underlying.length === 0) return res.json({ supported: false, reason: 'protocolo sem zap' });

    // resolve a posição (LP/vault) alvo no Enso pelos tokens do par
    const tq = new URLSearchParams({ chainId: '8453', protocolSlug: slug, page: '1' });
    for (const u of underlying) tq.append('underlyingTokens', u);
    const tr = await fetch(`${ENSO}/tokens?${tq.toString()}`, { headers: ensoHeaders() });
    const tj = (await tr.json()) as { data?: Array<{ address: string; symbol?: string | null }> };
    const lp = tj.data?.[0];
    if (!lp?.address) return res.json({ supported: false, reason: 'posição não encontrada no Enso' });

    const amountIn = BigInt(Math.floor(amountUsdc * 1e6)).toString(); // USDC = 6 casas
    const rq = new URLSearchParams({
      chainId: '8453',
      fromAddress,
      receiver: fromAddress,
      amountIn,
      tokenIn: USDC_BASE,
      tokenOut: lp.address,
      routingStrategy: 'router',
      slippage: String(slippageBps),
    });
    const rr = await fetch(`${ENSO}/shortcuts/route?${rq.toString()}`, { headers: ensoHeaders() });
    if (!rr.ok) return res.json({ supported: false, reason: `Enso route ${rr.status}` });
    const d = (await rr.json()) as { tx?: { to?: string; data?: string; value?: string }; amountOut?: string; gas?: string; priceImpact?: number };

    res.json({
      supported: true,
      lpTarget: lp.address,
      lpSymbol: lp.symbol ?? null,
      tokenIn: USDC_BASE,
      amountIn,
      to: d.tx?.to,
      data: d.tx?.data,
      value: d.tx?.value ?? '0',
      spender: d.tx?.to, // approve do USDC vai pro router do Enso
      amountOut: d.amountOut,
      gas: d.gas,
      priceImpact: d.priceImpact ?? 0,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'erro interno' });
  }
});

/** Uma pool específica (página do ativo). key = pool_key (ex.: external:0x...). */
app.get('/api/pool/:key', async (req, res) => {
  try {
    const [pool] = await sql`SELECT * FROM pools WHERE pool_key = ${req.params.key} LIMIT 1`;
    res.json(pool ?? null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'erro interno' });
  }
});

/** Estado da rede: gás AO VIVO da Base + preço do ETH (1 linha). */
app.get('/api/network', async (_req, res) => {
  try {
    const [n] = await sql`SELECT * FROM network WHERE id = 1`;
    res.json(n ?? null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'erro interno' });
  }
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`[mazari-fi api] http://localhost:${PORT}`));
