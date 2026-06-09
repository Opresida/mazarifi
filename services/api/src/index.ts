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
      ORDER BY risk_score DESC NULLS LAST, COALESCE(net_apr, apy_base, 0) DESC`;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
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
    res.status(500).json({ error: String(e) });
  }
});

/** Melhor opção AGORA: melhor rendimento líquido entre as razoavelmente seguras. */
app.get('/api/best', async (_req, res) => {
  try {
    const [best] = await sql`
      SELECT * FROM pools
      WHERE net_apr IS NOT NULL AND net_apr > 0 AND risk_score >= 60
      ORDER BY net_apr DESC LIMIT 1`;
    res.json(best ?? null);
  } catch (e) {
    res.status(500).json({ error: String(e) });
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
    res.status(500).json({ error: String(e) });
  }
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`[mazari-fi api] http://localhost:${PORT}`));
