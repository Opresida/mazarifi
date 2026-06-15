import type { Pool, Stats, AdminMetrics, BestPicks, NetworkMap, Position, PoolChartData } from './types';

/** GET com retry (backoff 1,5s/3s) — resiliência a blip de rede / API acordando (cold start do Render). */
async function fetchJson<T>(url: string, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return (await r.json()) as T;
      lastErr = new Error(`${url} ${r.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (i < tries - 1) await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  throw lastErr ?? new Error(`falha em ${url}`);
}

export function fetchPools(): Promise<Pool[]> {
  return fetchJson('/api/pools');
}

export function fetchStats(): Promise<Stats> {
  return fetchJson('/api/stats');
}

export function fetchBest(): Promise<BestPicks> {
  return fetchJson('/api/best');
}

export function fetchPool(key: string): Promise<Pool | null> {
  return fetchJson(`/api/pool/${encodeURIComponent(key)}`);
}

export function fetchPoolChart(key: string): Promise<PoolChartData> {
  return fetchJson(`/api/pool/${encodeURIComponent(key)}/chart`);
}

export async function fetchPositions(address: string): Promise<Position[]> {
  const j = await fetchJson<{ positions?: Position[] }>(`/api/positions?address=${address}`);
  return j.positions ?? [];
}

export function fetchNetwork(): Promise<NetworkMap | null> {
  return fetchJson('/api/network');
}

export function fetchAdminMetrics(): Promise<AdminMetrics> {
  return fetchJson('/api/admin/metrics');
}
