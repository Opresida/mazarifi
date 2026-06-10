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
      WHERE (lower(project) ~ ${ZAPPABLE_RE} OR source = 'nortoken')
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
        AND exposure = 'single' AND COALESCE(tvl_usd, 0) >= ${MIN_TVL} AND lower(project) ~ ${ZAPPABLE_RE}
      ORDER BY (CASE WHEN vol_low > 0 AND vol_high <= vol_low * 3 THEN 0 ELSE 1 END), net_annual_15d DESC
      LIMIT 1`;
    const [trade] = await sql`
      SELECT * FROM pools
      WHERE return_15d IS NOT NULL AND return_15d > 0 AND risk_score >= 60
        AND exposure = 'multi' AND COALESCE(tvl_usd, 0) >= ${MIN_TVL} AND lower(project) ~ ${ZAPPABLE_RE}
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
const BASE_RPC = process.env.BASE_RPC || 'https://mainnet.base.org';
const ensoHeaders = () => ({ Authorization: `Bearer ${process.env.ENSO_API_KEY}` });

// Receita: taxa da Mazari (integrador Enso) — 0,30% na ENTRADA, saída 0% (spec §2.1). Sem MAZARI_TREASURY, sem taxa (graceful).
const ZAP_FEE_BPS = process.env.ZAP_FEE_BPS || '30'; // 30 bps = 0,30%
const MAZARI_TREASURY = process.env.MAZARI_TREASURY; // endereço que recebe a taxa

/** Lê allowance de um ERC20 (server-side, RPC confiável — evita a RPC instável da carteira). token=USDC por padrão. */
app.get('/api/zap/allowance', async (req, res) => {
  try {
    const owner = String(req.query.owner ?? '');
    const spender = String(req.query.spender ?? '');
    const token = /^0x[0-9a-fA-F]{40}$/.test(String(req.query.token ?? '')) ? String(req.query.token) : USDC_BASE;
    if (!/^0x[0-9a-fA-F]{40}$/.test(owner) || !/^0x[0-9a-fA-F]{40}$/.test(spender)) return res.status(400).json({ error: 'endereço inválido' });
    const pad = (h: string) => h.replace(/^0x/, '').toLowerCase().padStart(64, '0');
    const data = '0xdd62ed3e' + pad(owner) + pad(spender); // allowance(owner,spender)
    const r = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: token, data }, 'latest'] }),
    });
    const j = (await r.json()) as { result?: string };
    res.json({ allowance: j.result ?? '0x0' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'erro interno' });
  }
});

/** "Minhas posições": lê a carteira (Enso) e filtra as POSIÇÕES DeFi (LP/vault) com valor. */
app.get('/api/positions', async (req, res) => {
  try {
    if (!process.env.ENSO_API_KEY) return res.json({ positions: [] });
    const address = String(req.query.address ?? '');
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return res.status(400).json({ error: 'endereço inválido' });
    const br = await fetch(`${ENSO}/wallet/balances?chainId=8453&eoaAddress=${address}&useEoa=true`, { headers: ensoHeaders() });
    if (!br.ok) return res.json({ positions: [] });
    const balances = (await br.json()) as Array<{ token: string; amount: string; decimals: number; price: number; symbol?: string; name?: string; logoUri?: string }>;
    const candidates = balances
      .map((b) => ({ ...b, valueUsd: (Number(b.amount) / 10 ** b.decimals) * (b.price || 0) }))
      .filter((b) => b.valueUsd >= 1 && b.token.toLowerCase() !== USDC_BASE.toLowerCase())
      .sort((a, b) => b.valueUsd - a.valueUsd)
      .slice(0, 15);
    const checked = await Promise.all(
      candidates.map(async (b) => {
        try {
          const mr = await fetch(`${ENSO}/tokens?chainId=8453&address=${b.token}`, { headers: ensoHeaders() });
          const mj = (await mr.json()) as { data?: Array<{ type?: string; protocolSlug?: string }> };
          const meta = mj.data?.[0];
          if (!meta || !(meta.type === 'defi' || meta.protocolSlug)) return null;
          return { token: b.token, symbol: b.symbol ?? null, name: b.name ?? null, valueUsd: b.valueUsd, amount: b.amount, decimals: b.decimals, protocol: meta.protocolSlug ?? null, logoUri: b.logoUri ?? null };
        } catch {
          return null;
        }
      }),
    );
    res.json({ positions: checked.filter(Boolean) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'erro interno' });
  }
});

/** SAQUE (zap-out): monta a tx "posição → USDC" pro usuário ASSINAR (não-custodial). */
app.get('/api/zap/withdraw', async (req, res) => {
  try {
    if (process.env.ZAP_ENABLED !== 'true' || !process.env.ENSO_API_KEY) return res.json({ supported: false, reason: 'zap desativado' });
    const token = String(req.query.token ?? '');
    const amount = String(req.query.amount ?? '');
    const fromAddress = String(req.query.fromAddress ?? '');
    const slippageBps = Number(req.query.slippageBps) || 50;
    if (!/^0x[0-9a-fA-F]{40}$/.test(token) || !amount || !fromAddress) return res.status(400).json({ error: 'parâmetros faltando' });
    // SAÍDA 0% (spec §2.1) — a taxa Mazari é só na ENTRADA (zap-in). Saque sem fee.
    const rq = new URLSearchParams({ chainId: '8453', fromAddress, receiver: fromAddress, amountIn: amount, tokenIn: token, tokenOut: USDC_BASE, routingStrategy: 'router', slippage: String(slippageBps) });
    const rr = await fetch(`${ENSO}/shortcuts/route?${rq.toString()}`, { headers: ensoHeaders() });
    if (!rr.ok) return res.json({ supported: false, reason: `Enso route ${rr.status}` });
    const d = (await rr.json()) as { tx?: { to?: string; data?: string; value?: string }; amountOut?: string; gas?: string; priceImpact?: number };
    res.json({ supported: true, to: d.tx?.to, data: d.tx?.data, value: d.tx?.value ?? '0', spender: d.tx?.to, amountOut: d.amountOut, gas: d.gas, priceImpact: d.priceImpact ?? 0, feeBps: 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'erro interno' });
  }
});

function ensoSlug(project: string): string | null {
  const p = project.toLowerCase();
  if (p.includes('aerodrome')) return 'aerodrome';
  if (p.includes('uniswap-v3') || p.includes('uniswap-v4')) return 'uniswap-v3';
  if (p.includes('uniswap-v2') || p.includes('sushiswap')) return 'uniswap-v2';
  if (p.includes('morpho') || p.includes('gauntlet')) return 'morpho-blue-vaults'; // gauntlet = curador Morpho
  if (p.includes('curve')) return 'curve-dex';
  if (p.includes('balancer-v3')) return 'balancer-v3';
  if (p.includes('balancer')) return 'balancer-v2';
  if (p.includes('aave')) return 'aave-v3';
  if (p.includes('spark')) return 'spark-lend';
  if (p.includes('moonwell')) return 'moonwell';
  if (p.includes('fluid')) return 'fluid-lending';
  if (p.includes('compound')) return 'compound-v3';
  if (p.includes('pendle')) return 'pendle-markets';
  return null;
}

// Projetos que conseguimos ZAPAR (executar/monetizar) — sincronizado com ensoSlug. Usado pra esconder o resto do ranking.
const ZAPPABLE_RE = 'aerodrome|uniswap|sushiswap|morpho|gauntlet|curve|balancer|aave|spark|moonwell|fluid|compound|pendle';

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
    // Taxa Mazari 0,30% na ENTRADA (spec §2.1) — Enso desconta do USDC e manda pro tesouro. Sem treasury → sem taxa.
    const feeBps = MAZARI_TREASURY ? Number(ZAP_FEE_BPS) : 0;
    if (MAZARI_TREASURY) {
      rq.set('fee', ZAP_FEE_BPS);
      rq.set('feeReceiver', MAZARI_TREASURY);
    }
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
      feeBps,
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

/** Histórico da pool (estilo Beefy): rendimento + TVL (DefiLlama /chart) + preço do par (ratio dos 2 tokens). */
app.get('/api/pool/:key/chart', async (req, res) => {
  try {
    const key = req.params.key;
    const [pool] = await sql`SELECT raw FROM pools WHERE pool_key = ${key} LIMIT 1`;
    if (!pool) return res.json({ apy: [], tvl: [] });

    const apy: Array<{ t: number; v: number }> = [];
    const tvl: Array<{ t: number; v: number }> = [];
    const id = key.startsWith('external:') ? key.slice('external:'.length) : null;
    if (id) {
      const r = await fetch(`https://yields.llama.fi/chart/${id}`);
      if (r.ok) {
        const j = (await r.json()) as { data?: Array<{ timestamp: string; tvlUsd?: number | null; apy?: number | null; apyBase?: number | null }> };
        for (const d of (j.data ?? []).slice(-30)) {
          const t = new Date(d.timestamp).getTime();
          if (d.tvlUsd != null) tvl.push({ t, v: d.tvlUsd });
          const a = d.apyBase ?? d.apy;
          if (a != null) apy.push({ t, v: a });
        }
      }
    }

    // Preço do par (Position Price): ratio token0/token1 do histórico de preço (coins).
    let price: Array<{ t: number; v: number }> | undefined;
    const underlying = (pool.raw?.underlyingTokens ?? []) as string[];
    if (underlying.length === 2 && underlying[0].toLowerCase() !== underlying[1].toLowerCase()) {
      const a0 = `base:${underlying[0].toLowerCase()}`;
      const a1 = `base:${underlying[1].toLowerCase()}`;
      const r = await fetch(`https://coins.llama.fi/chart/${a0},${a1}?span=30&period=1d`);
      if (r.ok) {
        const j = (await r.json()) as { coins?: Record<string, { prices?: Array<{ timestamp: number; price: number }> }> };
        const c0 = j.coins?.[a0]?.prices ?? [];
        const c1 = new Map((j.coins?.[a1]?.prices ?? []).map((p) => [Math.round(p.timestamp / 86400), p.price]));
        const series: Array<{ t: number; v: number }> = [];
        for (const p of c0) {
          const p1 = c1.get(Math.round(p.timestamp / 86400));
          if (p1 && p1 > 0 && p.price > 0) series.push({ t: p.timestamp * 1000, v: p.price / p1 });
        }
        if (series.length >= 3) price = series;
      }
    }
    res.json({ price, apy, tvl });
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
