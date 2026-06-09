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

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`[mazari-fi api] http://localhost:${PORT}`));
