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
      SELECT pool_key, source, provenance, chain, project, symbol,
             tvl_usd, apy_base, apy_reward, volume_usd_24h, fee_tier,
             risk_score, fee_apr_honest, fee_apy_honest, net_usd, updated_at
      FROM pools
      ORDER BY risk_score DESC NULLS LAST, COALESCE(fee_apr_honest, apy_base, 0) DESC`;
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

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`[mazari-fi api] http://localhost:${PORT}`));
