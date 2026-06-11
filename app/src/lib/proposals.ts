/** Estado das propostas do Autopilot — in-app (localStorage). Se o cliente disse "não agora",
 *  a gente respeita por 3 dias e volta com uma nova análise depois. (Re-envio por email = Fase 2, com o user DB.) */
const KEY = 'mz_proposals';
const RE_PROPOSE_DAYS = 3;

type Book = Record<string, Record<string, { declinedAt: number }>>; // { [addr]: { [chain:token]: {declinedAt} } }

function addr(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('mz_addr')?.toLowerCase() ?? null;
}
function slot(token: string, chain: string): string {
  return `${chain}:${token.toLowerCase()}`;
}
function load(): Book {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Book;
  } catch {
    return {};
  }
}
function save(b: Book): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(b));
}

/** Cliente clicou "não agora" — segura essa proposta por 3 dias. */
export function decline(token: string, chain: string): void {
  const a = addr();
  if (!a) return;
  const b = load();
  (b[a] ??= {})[slot(token, chain)] = { declinedAt: Date.now() };
  save(b);
  window.dispatchEvent(new Event('mz-proposals'));
}

/** A proposta deve aparecer agora? (true se nunca recusou OU já passaram 3 dias da recusa = re-propor com nova análise) */
export function shouldShow(token: string, chain: string): boolean {
  const a = addr();
  if (!a) return true;
  const rec = load()[a]?.[slot(token, chain)];
  if (!rec) return true;
  return Date.now() - rec.declinedAt >= RE_PROPOSE_DAYS * 86400_000;
}

/** Já foi recusada alguma vez? (pra rotular "nova análise" no re-envio) */
export function wasDeclined(token: string, chain: string): boolean {
  const a = addr();
  if (!a) return false;
  return !!load()[a]?.[slot(token, chain)];
}
