/** Razão de aporte (cost-basis) por posição — não-custodial, em localStorage (mesmo padrão de mz_addr/mz_pro).
 *  Serve pra o Autopilot saber se a posição está abaixo do que o cliente colocou (no vermelho) antes de sugerir trocar.
 *  v1 por-dispositivo; versão durável/cross-device vem com o user DB (ver docs/RECEITA.md #3). */
const KEY = 'mz_ledger';

export interface Aporte {
  costUsd: number; // total que entrou (acumula múltiplos aportes na mesma posição)
  ts: number; // quando entrou (1º aporte)
}
type Book = Record<string, Record<string, Aporte>>; // { [addr]: { "[chain]:[tokenLower]": Aporte } }

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
function save(book: Book): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(book));
}

/** Registra um aporte (acumula no token; guarda o ts do primeiro). Sem custo válido → ignora. */
export function recordDeposit(token: string | undefined | null, chain: string, costUsd: number): void {
  const a = addr();
  if (!a || !token || !/^0x[0-9a-fA-F]{40}$/.test(token) || !(costUsd > 0)) return;
  const book = load();
  const byAddr = (book[a] ??= {});
  const k = slot(token, chain);
  const prev = byAddr[k];
  byAddr[k] = { costUsd: (prev?.costUsd ?? 0) + costUsd, ts: prev?.ts ?? Date.now() };
  save(book);
}

/** Limpa o aporte de uma posição (saída total / troca). */
export function clearPosition(token: string | undefined | null, chain: string): void {
  const a = addr();
  if (!a || !token) return;
  const book = load();
  if (book[a]) {
    delete book[a][slot(token, chain)];
    save(book);
  }
}

/** Aporte registrado de uma posição (ou null se não temos — aí o Autopilot é conservador). */
export function costBasis(token: string, chain: string): Aporte | null {
  const a = addr();
  if (!a) return null;
  return load()[a]?.[slot(token, chain)] ?? null;
}
