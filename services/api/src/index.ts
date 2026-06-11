import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import { CHAINS, CHAIN_LIST, SOURCE_CHAINS, SOURCE_CHAIN_LIST, SOURCE_TOKENS, sourceTokenSet, NATIVE_TOKEN } from '@mazarifi/chain';

/** Config da chain DESTINO (pool) pelo nome; fallback Base. */
const chainOf = (name: unknown) => CHAINS[String(name ?? 'Base')] ?? CHAINS.Base;
/** Config da chain ORIGEM (de onde vem o dinheiro — ampla); fallback Base. */
const srcOf = (name: unknown) => SOURCE_CHAINS[String(name ?? 'Base')] ?? SOURCE_CHAINS.Base;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente (.env)');
const sql = neon(process.env.DATABASE_URL);

const app = express();
app.use(cors());

/** Ranking honesto — CEGO À ORIGEM: ordena por risco, depois rendimento. `source` NÃO interfere. */
app.get('/api/pools', async (_req, res) => {
  try {
    // DOUTRINA DO PRODUTO: só listamos onde AGREGAMOS valor — empréstimo (parking seguro, sem IL) OU
    // gerenciada (cuidamos do range). Fora: LP/CL CRU (troca/concentrada direta) = exposição sem gestão = "Uniswap com pedágio".
    const rows = await sql`
      SELECT * FROM pools
      WHERE ((lower(project) ~ ${ZAPPABLE_RE} AND (exposure = 'single' OR raw->>'managed' = 'true')) OR source = 'nortoken')
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
        AND raw->>'managed' = 'true' AND COALESCE(tvl_usd, 0) >= ${MIN_TVL} AND lower(project) ~ ${ZAPPABLE_RE}
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
const ensoHeaders = () => ({ Authorization: `Bearer ${process.env.ENSO_API_KEY}` });

// Receita: taxa da Mazari (integrador Enso) — 0,30% na ENTRADA, saída 0% (spec §2.1). Sem MAZARI_TREASURY, sem taxa (graceful).
const ZAP_FEE_BPS = process.env.ZAP_FEE_BPS || '30'; // 30 bps = 0,30%
const MAZARI_TREASURY = process.env.MAZARI_TREASURY; // endereço que recebe a taxa

// Ponte cross-chain (LiFi) — funciona sem key; o REBATE precisa do Partner Portal (LIFI_INTEGRATOR) — graceful.
const LIFI = 'https://li.quest/v1';
const LIFI_INTEGRATOR = process.env.LIFI_INTEGRATOR; // string do Partner Portal (ativa o rebate)
const LIFI_FEE = process.env.LIFI_FEE || '0.003'; // 0,3% (declarado na tela)

/** Lê allowance de um ERC20 (server-side, RPC confiável — evita a RPC instável da carteira). token=USDC por padrão. */
app.get('/api/zap/allowance', async (req, res) => {
  try {
    const src = srcOf(req.query.chain); // RPC funciona em qualquer rede (origem ou destino)
    const owner = String(req.query.owner ?? '');
    const spender = String(req.query.spender ?? '');
    const token = /^0x[0-9a-fA-F]{40}$/.test(String(req.query.token ?? '')) ? String(req.query.token) : chainOf(req.query.chain).usdc;
    if (!/^0x[0-9a-fA-F]{40}$/.test(owner) || !/^0x[0-9a-fA-F]{40}$/.test(spender)) return res.status(400).json({ error: 'endereço inválido' });
    const pad = (h: string) => h.replace(/^0x/, '').toLowerCase().padStart(64, '0');
    const data = '0xdd62ed3e' + pad(owner) + pad(spender); // allowance(owner,spender)
    const r = await fetch(src.rpc, {
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

// O Enso devolve o ativo nativo com esse sentinela; mapeamos pro nativo da LiFi (0x0000…).
const ENSO_NATIVE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

/** FONTES DE FUNDO: o que o usuário tem de ATIVO CONHECIDO em QUALQUER rede de origem (a Mazari traz e investe). */
app.get('/api/funding-sources', async (req, res) => {
  try {
    if (!process.env.ENSO_API_KEY) return res.json({ sources: [] });
    const address = String(req.query.address ?? '');
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return res.status(400).json({ error: 'endereço inválido' });
    const perChain = await Promise.all(
      SOURCE_CHAIN_LIST.map(async (cfg) => {
        try {
          const allow = sourceTokenSet(cfg.chainId);
          if (allow.size === 0) return [];
          const br = await fetch(`${ENSO}/wallet/balances?chainId=${cfg.chainId}&eoaAddress=${address}&useEoa=true`, { headers: ensoHeaders() });
          if (!br.ok) return [];
          const balances = (await br.json()) as Array<{ token: string; amount: string; decimals: number; price: number; symbol?: string }>;
          const out: Array<{ chain: string; token: string; symbol: string; amountUsd: number; amount: string; decimals: number }> = [];
          for (const b of balances) {
            let addr = (b.token || '').toLowerCase();
            if (addr === ENSO_NATIVE || addr === NATIVE_TOKEN) addr = NATIVE_TOKEN; // normaliza nativo
            const known = allow.get(addr);
            if (!known) continue; // só ativos conhecidos/padrão (allowlist)
            const amountUsd = (Number(b.amount) / 10 ** known.decimals) * (b.price || 0);
            if (amountUsd < 1) continue;
            out.push({ chain: cfg.name, token: known.address, symbol: known.symbol, amountUsd, amount: b.amount, decimals: known.decimals });
          }
          return out;
        } catch {
          return [];
        }
      }),
    );
    const sources = perChain.flat().sort((a, b) => b.amountUsd - a.amountUsd);
    res.json({ sources });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'erro interno' });
  }
});

/** Ponte de QUALQUER ativo conhecido (origem) → USDC na rede da pool (LiFi swap+bridge, melhor rota). */
app.get('/api/bridge/quote', async (req, res) => {
  try {
    const fromCfg = srcOf(req.query.fromChain);
    const toCfg = chainOf(req.query.toChain);
    const fromAddress = String(req.query.fromAddress ?? '');
    const fromToken = String(req.query.fromToken ?? '');
    const fromAmount = String(req.query.fromAmount ?? '');
    if (!/^0x[0-9a-fA-F]{40}$/.test(fromAddress) || !/^0x[0-9a-fA-F]{40}$/.test(fromToken) || !/^\d+$/.test(fromAmount)) return res.status(400).json({ error: 'parâmetros faltando' });
    if (fromCfg.chainId === toCfg.chainId) return res.json({ supported: false, reason: 'mesma rede' });
    const q = new URLSearchParams({
      fromChain: String(fromCfg.chainId),
      toChain: String(toCfg.chainId),
      fromToken,
      toToken: toCfg.usdc,
      fromAddress,
      fromAmount,
    });
    const feePct = LIFI_INTEGRATOR ? Number(LIFI_FEE) * 100 : 0;
    if (LIFI_INTEGRATOR) {
      q.set('integrator', LIFI_INTEGRATOR);
      q.set('fee', LIFI_FEE);
    }
    const r = await fetch(`${LIFI}/quote?${q.toString()}`);
    if (!r.ok) return res.json({ supported: false, reason: `LiFi ${r.status}` });
    const d = (await r.json()) as {
      transactionRequest?: { to?: string; data?: string; value?: string };
      estimate?: { toAmount?: string; approvalAddress?: string; executionDuration?: number };
      tool?: string;
    };
    const tx = d.transactionRequest;
    if (!tx?.to || !tx.data) return res.json({ supported: false, reason: 'sem rota' });
    res.json({
      supported: true,
      to: tx.to,
      data: tx.data,
      value: tx.value ?? '0',
      spender: d.estimate?.approvalAddress ?? tx.to,
      toAmount: d.estimate?.toAmount ?? null,
      durationS: d.estimate?.executionDuration ?? null,
      tool: d.tool ?? null,
      feePct,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'erro interno' });
  }
});

/** DEPÓSITO CROSS-CHAIN em 1 ASSINATURA: a LiFi faz a ponte E executa o zap do Enso no vault do destino. */
app.get('/api/bridge/deposit-quote', async (req, res) => {
  try {
    if (process.env.ZAP_ENABLED !== 'true' || !process.env.ENSO_API_KEY) return res.json({ supported: false, reason: 'zap desativado' });
    const poolKey = String(req.query.poolKey ?? '');
    const fromAddress = String(req.query.fromAddress ?? '');
    const fromToken = String(req.query.fromToken ?? '');
    const fromAmount = String(req.query.fromAmount ?? '');
    if (!poolKey || !/^0x[0-9a-fA-F]{40}$/.test(fromAddress) || !/^0x[0-9a-fA-F]{40}$/.test(fromToken) || !/^\d+$/.test(fromAmount)) return res.status(400).json({ error: 'parâmetros faltando' });

    const [pool] = await sql`SELECT project, chain, raw FROM pools WHERE pool_key = ${poolKey} LIMIT 1`;
    if (!pool) return res.json({ supported: false, reason: 'pool não encontrada' });
    const toCfg = chainOf(pool.chain);
    const fromCfg = srcOf(req.query.fromChain);
    if (fromCfg.chainId === toCfg.chainId) return res.json({ supported: false, reason: 'mesma rede' });

    // 1) cota a ponte (ativo origem → USDC destino) só pra saber QUANTO USDC chega (a saída do contractCall não é confiável).
    const bq = new URLSearchParams({ fromChain: String(fromCfg.chainId), toChain: String(toCfg.chainId), fromToken, toToken: toCfg.usdc, fromAddress, fromAmount });
    if (LIFI_INTEGRATOR) { bq.set('integrator', LIFI_INTEGRATOR); bq.set('fee', LIFI_FEE); }
    const br = await fetch(`${LIFI}/quote?${bq.toString()}`);
    if (!br.ok) return res.json({ supported: false, reason: `LiFi ${br.status}` });
    const bd = (await br.json()) as { estimate?: { toAmount?: string } };
    const delivered = BigInt(bd.estimate?.toAmount ?? '0');
    if (delivered <= 0n) return res.json({ supported: false, reason: 'ponte sem rota' });

    // 2) calldata da posição no destino (engine certa: Enso OU Pendle), p/ um pouco ABAIXO do entregue (folga → não reverte).
    const destAmount = ((delivered * 998n) / 1000n).toString();
    const z = await resolveDestCall(pool as { project: string; raw: EnsoRaw }, toCfg, destAmount, fromAddress);
    if ('error' in z) return res.json({ supported: false, reason: z.error });

    // 3) LiFi contractCalls: swap+ponte do ativo origem + executa o zap Enso no destino → 1 tx assinável na origem.
    const body = {
      fromChain: String(fromCfg.chainId), fromToken, fromAddress,
      toChain: String(toCfg.chainId), toToken: toCfg.usdc, toAmount: destAmount,
      ...(LIFI_INTEGRATOR ? { integrator: LIFI_INTEGRATOR, fee: LIFI_FEE } : {}),
      contractCalls: [{ fromAmount: destAmount, fromTokenAddress: toCfg.usdc, toContractAddress: z.to, toContractCallData: z.data, toContractGasLimit: '950000' }],
    };
    const cr = await fetch(`${LIFI}/quote/contractCalls`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!cr.ok) return res.json({ supported: false, reason: `LiFi contractCalls ${cr.status}` });
    const cd = (await cr.json()) as { transactionRequest?: { to?: string; data?: string; value?: string }; estimate?: { approvalAddress?: string; executionDuration?: number }; tool?: string };
    const tx = cd.transactionRequest;
    if (!tx?.to || !tx.data) return res.json({ supported: false, reason: 'sem rota cross-deposit' });
    res.json({
      supported: true,
      to: tx.to,
      data: tx.data,
      value: tx.value ?? '0',
      spender: cd.estimate?.approvalAddress ?? tx.to,
      durationS: cd.estimate?.executionDuration ?? null,
      tool: cd.tool ?? null,
      depositUsd: Number(destAmount) / 1e6,
      vaultSymbol: z.lpSymbol,
      engine: z.engine,
      feePct: LIFI_INTEGRATOR ? Number(LIFI_FEE) * 100 : 0,
    });
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
    // Posições em TODAS as chains suportadas (cada uma com o seu chainId).
    const perChain = await Promise.all(
      CHAIN_LIST.map(async (cfg) => {
        try {
          const br = await fetch(`${ENSO}/wallet/balances?chainId=${cfg.chainId}&eoaAddress=${address}&useEoa=true`, { headers: ensoHeaders() });
          if (!br.ok) return [];
          const balances = (await br.json()) as Array<{ token: string; amount: string; decimals: number; price: number; symbol?: string; name?: string; logoUri?: string }>;
          const candidates = balances
            .map((b) => ({ ...b, valueUsd: (Number(b.amount) / 10 ** b.decimals) * (b.price || 0) }))
            .filter((b) => b.valueUsd >= 1 && b.token.toLowerCase() !== cfg.usdc.toLowerCase())
            .sort((a, b) => b.valueUsd - a.valueUsd)
            .slice(0, 15);
          return await Promise.all(
            candidates.map(async (b) => {
              try {
                const mr = await fetch(`${ENSO}/tokens?chainId=${cfg.chainId}&address=${b.token}`, { headers: ensoHeaders() });
                const mj = (await mr.json()) as { data?: Array<{ type?: string; protocolSlug?: string }> };
                const meta = mj.data?.[0];
                if (!meta || !(meta.type === 'defi' || meta.protocolSlug)) return null;
                return { token: b.token, symbol: b.symbol ?? null, name: b.name ?? null, valueUsd: b.valueUsd, amount: b.amount, decimals: b.decimals, protocol: meta.protocolSlug ?? null, logoUri: b.logoUri ?? null, chain: cfg.name };
              } catch {
                return null;
              }
            }),
          );
        } catch {
          return [];
        }
      }),
    );
    res.json({ positions: perChain.flat().filter(Boolean) });
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
    const cfg = chainOf(req.query.chain);
    // SAÍDA 0% (spec §2.1) — a taxa Mazari é só na ENTRADA (zap-in). Saque sem fee.
    const rq = new URLSearchParams({ chainId: String(cfg.chainId), fromAddress, receiver: fromAddress, amountIn: amount, tokenIn: token, tokenOut: cfg.usdc, routingStrategy: 'router', slippage: String(slippageBps) });
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
const ZAPPABLE_RE = 'aerodrome|uniswap|sushiswap|morpho|gauntlet|curve|balancer|aave|spark|moonwell|fluid|compound|pendle|beefy';

type EnsoZap = { to: string; data: string; value: string; spender: string; amountOut?: string; gas?: string; priceImpact?: number; lpTarget: string; lpSymbol: string | null; feeBps: number };
type PendleRaw = { market: string; pt: string; expiry: string };
type EnsoRaw = { vaultAddress?: string; assets?: string[]; underlyingTokens?: string[]; pendle?: PendleRaw } | null;

/** Resolve o LP/vault alvo + monta a rota Enso (USDC da chain → posição) com a taxa Mazari 0,30%.
 *  `amountBase` = USDC em 6 casas (string); `receiver` = quem recebe a posição. Reusado pelo zap e pelo cross-deposit. */
async function buildEnsoZap(
  pool: { project: string; raw: EnsoRaw },
  cfg: ReturnType<typeof chainOf>,
  amountBase: string,
  receiver: string,
  slippageBps = 50,
): Promise<EnsoZap | { error: string }> {
  let lp: { address: string; symbol?: string | null } | undefined;
  const managedVault = pool.raw?.vaultAddress;
  if (managedVault) {
    lp = { address: managedVault, symbol: pool.raw?.assets?.join('/') ?? null };
  } else {
    const slug = ensoSlug(pool.project);
    const underlying = pool.raw?.underlyingTokens ?? [];
    if (!slug || underlying.length === 0) return { error: 'protocolo sem zap' };
    const tq = new URLSearchParams({ chainId: String(cfg.chainId), protocolSlug: slug, page: '1' });
    for (const u of underlying) tq.append('underlyingTokens', u);
    const tr = await fetch(`${ENSO}/tokens?${tq.toString()}`, { headers: ensoHeaders() });
    const tj = (await tr.json()) as { data?: Array<{ address: string; symbol?: string | null }> };
    lp = tj.data?.[0];
  }
  if (!lp?.address) return { error: 'posição não encontrada no Enso' };

  const rq = new URLSearchParams({
    chainId: String(cfg.chainId),
    fromAddress: receiver,
    receiver,
    amountIn: amountBase,
    tokenIn: cfg.usdc,
    tokenOut: lp.address,
    routingStrategy: 'router',
    slippage: String(slippageBps),
  });
  const feeBps = MAZARI_TREASURY ? Number(ZAP_FEE_BPS) : 0;
  if (MAZARI_TREASURY) {
    rq.set('fee', ZAP_FEE_BPS);
    rq.set('feeReceiver', MAZARI_TREASURY);
  }
  const rr = await fetch(`${ENSO}/shortcuts/route?${rq.toString()}`, { headers: ensoHeaders() });
  if (!rr.ok) return { error: `Enso route ${rr.status}` };
  const d = (await rr.json()) as { tx?: { to?: string; data?: string; value?: string }; amountOut?: string; gas?: string; priceImpact?: number };
  if (!d.tx?.to || !d.tx.data) return { error: 'Enso sem tx' };
  return { to: d.tx.to, data: d.tx.data, value: d.tx.value ?? '0', spender: d.tx.to, amountOut: d.amountOut, gas: d.gas, priceImpact: d.priceImpact ?? 0, lpTarget: lp.address, lpSymbol: lp.symbol ?? null, feeBps };
}

// ── Engine PENDLE: calldata "USDC → PT" via Pendle Hosted SDK v2 (vai pro router Pendle; NÃO capta nossa taxa → tem que ir embrulhado na LiFi). ──
const PENDLE_SDK = 'https://api-v2.pendle.finance/core/v2/sdk';
async function buildPendleCall(cfg: ReturnType<typeof chainOf>, pendle: PendleRaw, amountBase: string, receiver: string, slippage = 0.01): Promise<{ to: string; data: string; spender: string; lpSymbol: string } | { error: string }> {
  try {
    const q = new URLSearchParams({ receiver, slippage: String(slippage), tokenIn: cfg.usdc, tokenOut: pendle.pt, amountIn: amountBase, enableAggregator: 'true' });
    const r = await fetch(`${PENDLE_SDK}/${cfg.chainId}/markets/${pendle.market}/swap?${q.toString()}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return { error: `Pendle ${r.status}` };
    const j = (await r.json()) as { tx?: { to?: string; data?: string }; tokenApprovals?: Array<{ token?: string; spender?: string }> };
    if (!j.tx?.to || !j.tx.data) return { error: 'Pendle sem tx' };
    return { to: j.tx.to, data: j.tx.data, spender: j.tx.to, lpSymbol: 'PT (rende fixo)' };
  } catch {
    return { error: 'Pendle indisponível' };
  }
}

// Calldata de DESTINO (a posição a montar) por engine. `captures='enso'` já tem nossa taxa; `captures='lifi'` precisa do embrulho LiFi.
type DestCall = { to: string; data: string; value: string; spender: string; engine: string; captures: 'enso' | 'lifi'; lpSymbol: string | null; amountOut?: string; gas?: string; priceImpact?: number; feeBps?: number };
async function resolveDestCall(pool: { project: string; raw: EnsoRaw }, cfg: ReturnType<typeof chainOf>, amountBase: string, receiver: string): Promise<DestCall | { error: string }> {
  // Pendle: tem market casado → engine Pendle (embrulho LiFi capta a taxa).
  if (pool.raw?.pendle?.market && pool.raw.pendle.pt) {
    const p = await buildPendleCall(cfg, pool.raw.pendle, amountBase, receiver);
    if (!('error' in p)) return { to: p.to, data: p.data, value: '0', spender: p.spender, engine: 'pendle', captures: 'lifi', lpSymbol: p.lpSymbol };
    // se Pendle falhar, cai pro Enso (raro)
  }
  const z = await buildEnsoZap(pool, cfg, amountBase, receiver);
  if ('error' in z) return z;
  return { ...z, engine: 'enso', captures: 'enso', amountOut: z.amountOut, lpSymbol: z.lpSymbol };
}

/** LiFi `/quote` ativo→USDC (mesma rede ou cross) só pra saber o USDC ENTREGUE (a saída do contractCall não é confiável). */
async function lifiDeliveredUsdc(fromChainId: number, toChainId: number, fromToken: string, toUsdc: string, fromAmount: string, fromAddress: string): Promise<bigint> {
  const q = new URLSearchParams({ fromChain: String(fromChainId), toChain: String(toChainId), fromToken, toToken: toUsdc, fromAddress, fromAmount });
  if (LIFI_INTEGRATOR) { q.set('integrator', LIFI_INTEGRATOR); q.set('fee', LIFI_FEE); }
  const r = await fetch(`${LIFI}/quote?${q.toString()}`);
  if (!r.ok) return 0n;
  const d = (await r.json()) as { estimate?: { toAmount?: string } };
  return BigInt(d.estimate?.toAmount ?? '0');
}

/** LiFi contractCalls: embrulha o calldata de destino captando NOSSA taxa (`Mazari-Fi`). Funciona same-chain e cross-chain. */
async function lifiContractTx(fromChainId: number, toChainId: number, fromToken: string, toUsdc: string, fromAddress: string, destAmount: string, destTo: string, destData: string) {
  const body = {
    fromChain: String(fromChainId), fromToken, fromAddress,
    toChain: String(toChainId), toToken: toUsdc, toAmount: destAmount,
    ...(LIFI_INTEGRATOR ? { integrator: LIFI_INTEGRATOR, fee: LIFI_FEE } : {}),
    contractCalls: [{ fromAmount: destAmount, fromTokenAddress: toUsdc, toContractAddress: destTo, toContractCallData: destData, toContractGasLimit: '950000' }],
  };
  const r = await fetch(`${LIFI}/quote/contractCalls`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) return null;
  const cd = (await r.json()) as { transactionRequest?: { to?: string; data?: string; value?: string }; estimate?: { approvalAddress?: string; executionDuration?: number }; tool?: string };
  const tx = cd.transactionRequest;
  if (!tx?.to || !tx.data) return null;
  return { to: tx.to, data: tx.data, value: tx.value ?? '0', spender: cd.estimate?.approvalAddress ?? tx.to, durationS: cd.estimate?.executionDuration ?? null, tool: cd.tool ?? null };
}

app.get('/api/zap/quote', async (req, res) => {
  try {
    if (process.env.ZAP_ENABLED !== 'true' || !process.env.ENSO_API_KEY) return res.json({ supported: false, reason: 'zap desativado' });
    const poolKey = String(req.query.poolKey ?? '');
    const amountUsdc = Number(req.query.amountUsdc ?? 0);
    const fromAddress = String(req.query.fromAddress ?? '');
    const slippageBps = Number(req.query.slippageBps) || 50;
    if (!poolKey || !(amountUsdc > 0) || !fromAddress) return res.status(400).json({ error: 'parâmetros faltando' });

    const [pool] = await sql`SELECT project, chain, raw FROM pools WHERE pool_key = ${poolKey} LIMIT 1`;
    if (!pool) return res.json({ supported: false, reason: 'pool não encontrada' });
    const cfg = chainOf(pool.chain);
    const amountIn = BigInt(Math.floor(amountUsdc * 1e6)).toString(); // USDC = 6 casas
    const pr = pool as { project: string; raw: EnsoRaw };

    // Engine ENSO (capta a taxa nativa) → tx direta, mais barata.
    if (!pr.raw?.pendle?.market) {
      const z = await buildEnsoZap(pr, cfg, amountIn, fromAddress, slippageBps);
      if ('error' in z) return res.json({ supported: false, reason: z.error });
      return res.json({ supported: true, engine: 'enso', lpTarget: z.lpTarget, lpSymbol: z.lpSymbol, tokenIn: cfg.usdc, amountIn, to: z.to, data: z.data, value: z.value, spender: z.spender, amountOut: z.amountOut, gas: z.gas, priceImpact: z.priceImpact ?? 0, feeBps: z.feeBps });
    }

    // Engine PENDLE → mesma rede, embrulhada na LiFi pra CAPTAR NOSSA TAXA (a tx do Pendle não captaria).
    // (USDC→USDC no /quote não tem rota; vamos direto no contractCalls com folga p/ nossa fee + fixed fee da LiFi.)
    const destAmount = ((BigInt(amountIn) * 98n) / 100n).toString();
    const call = await buildPendleCall(cfg, pr.raw.pendle, destAmount, fromAddress);
    if ('error' in call) return res.json({ supported: false, reason: call.error });
    const tx = await lifiContractTx(cfg.chainId, cfg.chainId, cfg.usdc, cfg.usdc, fromAddress, destAmount, call.to, call.data);
    if (!tx) return res.json({ supported: false, reason: 'falha ao captar a taxa (LiFi)' });
    res.json({
      supported: true,
      engine: 'pendle',
      lpSymbol: call.lpSymbol,
      tokenIn: cfg.usdc,
      amountIn,
      to: tx.to,
      data: tx.data,
      value: tx.value,
      spender: tx.spender, // approve do USDC vai pro LiFi (que capta nossa taxa)
      priceImpact: 0,
      feeBps: LIFI_INTEGRATOR ? Number(LIFI_FEE) * 100 : 0,
      expiry: pr.raw.pendle.expiry,
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

/** Estado da rede POR CHAIN: gás AO VIVO + ETH. `?chain=Base` → 1 linha; sem param → mapa por chain. */
app.get('/api/network', async (req, res) => {
  try {
    if (req.query.chain) {
      const [n] = await sql`SELECT * FROM network WHERE chain = ${String(req.query.chain)}`;
      return res.json(n ?? null);
    }
    const rows = await sql`SELECT * FROM network`;
    const map: Record<string, unknown> = {};
    for (const r of rows) map[(r as { chain: string }).chain] = r;
    res.json(map);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'erro interno' });
  }
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`[mazari-fi api] http://localhost:${PORT}`));
