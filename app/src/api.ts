import type { Pool, Stats } from './types';

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
