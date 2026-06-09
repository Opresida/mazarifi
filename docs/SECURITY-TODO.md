# Mazari Fi — Segurança: itens DEFERIDOS (não esquecer)

> Itens da auditoria que **não são risco real na Fase 1** (read-only, sem dados de usuário, sem dinheiro movido),
> mas que **DEVEM** ser feitos antes de marcos específicos. Documentados pra não descobrir "1 por 1".

## ⛔ ANTES de ter usuários / dados de usuário reais
- **Autenticar `/api/admin/*` no BACKEND.** Hoje `/api/admin/metrics` é público (só devolve agregados PÚBLICOS de pools + o admin usa números demo → sem exposição real). Quando houver usuários/ganhos/tickets reais: **Sign-In with Ethereum** (nonce + `personal_sign` + verificação no backend) + middleware que valida a carteira admin. O gate de carteira no front (`lib/wallet.ts` `ADMIN_ALLOWLIST`) é **só UX** — localStorage é forjável; **segurança real é no servidor**.
- **Tirar dados de usuário de qualquer resposta sem auth.**

## ⛔ ANTES de DEPLOY público (Vercel/host)
- **CORS:** restringir `origin` ao domínio do app (hoje `cors()` aceita qualquer origem). Em `services/api/src/index.ts`.
- **Rate limiting** na API (ex.: express-rate-limit) pra não abusarem do proxy.
- **Mover `ADMIN_ALLOWLIST`** pra env/config do backend (hoje hardcoded no front — é endereço público, ok, mas melhor centralizar).
- **Não logar dados sensíveis** em observabilidade (sanitizar `console.error`).

## 🔧 ROBUSTEZ (quando escalar volume)
- **Validação de schema (zod)** das respostas do DefiLlama (`/pools`, `/chart`, `/coins`) — hoje confiamos no shape via `as`. Se o DefiLlama mudar, falha silenciosa.
- **Retry com backoff** nos `fetch` externos (transientes).
- **getLogs paginado** (`sources/nortoken.ts`): hoje janela fixa de 1900 blocos. Se o cron tiver gap > ~2000 blocos, perde `SwapTracked`. Guardar `lastBlock` processado em tabela e paginar.
- **Validar formato dos endereços** retornados por `window.ethereum` (regex hex) antes de salvar.

## ✅ JÁ CORRIGIDO (hardening de 2026-06-09)
- Erro 500 da API não vaza mais a connection string (mensagem genérica + log só no servidor).
- Limpeza de pools obsoletas no Neon (delete pós-rodada das externas não-atualizadas).
- `Number(BigInt)` → `formatUnits` (precisão); preço do ETH real (não constante 3000).
- `MoneyProjector`/`projectEarnings` sem Infinity/NaN; hero sem "undefined%".
- Estados de erro nas telas; ingest não cai se 1 API externa falhar.

## ✅ Verificado SEGURO (auditoria)
- **SQL injection:** todas as queries usam tagged template `sql\`\`` (Neon) / Drizzle — parametrizado, sem concatenação.
- **Contratos:** `packages/chain` é 100% read-only (`readContract`/`getLogs`), nenhuma transação.
- **`core`:** funções puras com guardas (`ilFullRange` r>0, `aprToApy` n>0).
