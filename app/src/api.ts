import type { Pool, Stats, AdminMetrics, BestPicks } from './types';

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

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const r = await fetch('/api/admin/metrics');
  if (!r.ok) throw new Error(`API /admin/metrics ${r.status}`);
  return r.json();
}
