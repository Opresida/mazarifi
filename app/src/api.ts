import type { Pool, Stats, AdminMetrics, BestPicks, NetworkInfo, Position, PoolChartData } from './types';

export async function fetchPools(): Promise<Pool[]> {
  const r = await fetch('/api/pools');
  if (!r.ok) throw new Error(`API /pools ${r.status}`);
  return r.json();
}

export async function fetchStats(): Promise<Stats> {
  const r = await fetch('/api/stats');
  if (!r.ok) throw new Error(`API /stats ${r.status}`);
  return r.json();
}

export async function fetchBest(): Promise<BestPicks> {
  const r = await fetch('/api/best');
  if (!r.ok) throw new Error(`API /best ${r.status}`);
  return r.json();
}

export async function fetchPool(key: string): Promise<Pool | null> {
  const r = await fetch(`/api/pool/${encodeURIComponent(key)}`);
  if (!r.ok) throw new Error(`API /pool ${r.status}`);
  return r.json();
}

export async function fetchPoolChart(key: string): Promise<PoolChartData> {
  const r = await fetch(`/api/pool/${encodeURIComponent(key)}/chart`);
  if (!r.ok) throw new Error(`API /pool/chart ${r.status}`);
  return r.json();
}

export async function fetchPositions(address: string): Promise<Position[]> {
  const r = await fetch(`/api/positions?address=${address}`);
  if (!r.ok) throw new Error(`API /positions ${r.status}`);
  const j = await r.json();
  return j.positions ?? [];
}

export async function fetchNetwork(): Promise<NetworkInfo | null> {
  const r = await fetch('/api/network');
  if (!r.ok) throw new Error(`API /network ${r.status}`);
  return r.json();
}

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const r = await fetch('/api/admin/metrics');
  if (!r.ok) throw new Error(`API /admin/metrics ${r.status}`);
  return r.json();
}
