# Project Context — Mazari Fi

Documento de contexto profundo (decisões, restrições, convenções) que **não** se deriva do código. Ler ao retomar o projeto.

## Identidade do projeto

- **Produto:** otimizador/agregador de yield em pools de liquidez, EVM-first na **Base**. Posicionamento: "melhor rendimento líquido ajustado a risco, mastigado pro leigo".
- **Repo:** `Opresida/mazarifi` (público → GitHub Actions grátis). Local: `C:\Users\user\mazarifi`.
- **Dono:** Humberto. Time: Humberto + Claude (sem terceiros no código).
- **Marca:** Mazari Fi é produto da MAZARI (empresa-mãe). Identidade visual **"Ink & Lime"**.

## Restrições inegociáveis

- **Nunca commitar `.env`/segredos** (DATABASE_URL, ENSO_API_KEY, ETHERSCAN_API_KEY) — já gitignored; verificar antes de cada commit.
- **pnpm-only** (sem npm/yarn). `pnpm typecheck` é o gate de "concluído". **vitest** no core.
- **USDC-only no zap v1** (sem fiat/PIX). Depósito/saque **não-custodial** — o usuário assina; a Mazari nunca custodia.
- **Não abrir Simple Browser / browser embutido** — só informar a URL localhost (Humberto usa ANTIGRAVITY).
- **Honestidade > otimismo cego.** Toda mudança vem com explicação por analogia do dia a dia.
- **Cada projeto tem design único** — não replicar anatomia visual de outros clientes.

## Decisões tomadas (e o porquê)

- **Moeda US$** nas telas (dados nativos em dólar, sem cotação defasada).
- **Janela de 15 dias REALIZADA** (não APY projetado) — após descobrir que o número-herói de uma pool volátil enganava (52,9% → variava 37-106%/semana).
- **fee × incentivo separados** — `feeAprPct = apyBase7d/apyBase`, NUNCA `apy` total (evita contar emissão como fee, ex.: Aerodrome).
- **Gás ao vivo** (Base RPC grátis) + **integridade do reward** (DefiLlama mcap + Etherscan verified) — porque o custo mais traiçoeiro não é o gás (centavos), é o **incentivo "papel"**.
- **Zap via Enso** (aggregator não-custodial) em vez de contrato próprio — evita auditoria/risco e mantém a régua "software, não gestor".
- **`/cybersecurity:ceo-pentest-complete` NÃO se aplica** ao nosso código (é pra alvos públicos reais); auditoria de código foi feita com mentalidade OWASP.

## Régua regulatória (CVM)

| Fase | Risco | Por quê |
|---|---|---|
| 1 Inteligência | Mínimo | read-only, zero custódia |
| Zap (atual) | Baixo | não-custodial (user assina); software que monta a tx, não gestor |
| 2 Keeper | Médio | rebalance NÃO saca; EOA→Safe+módulo antes da mainnet |
| 3 Performance fee | Alto | parece gestão → gate jurídico |

## Monetização (futuro)

- Fase 1: grátis (funil). Pro (~US$10-15/mês via Stripe) **adiado** — cobrar por informação é prematuro.
- Receita real = **performance fee 8-10% sobre o rendimento** (Fase 3) + zap fee. "Só ganhamos quando você ganha."

## Documentos canônicos (manter atualizados)

- [`README.md`](README.md) — porta de entrada + como rodar
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — arquitetura técnica
- [`CONTEXT.md`](CONTEXT.md) — o problema, a tese, as fases
- [`TODO.md`](TODO.md) — feito / pendente / gaps honestos
- [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) — este (decisões/restrições)
- [`docs/COSTS.md`](docs/COSTS.md) — ledger de custos (modelado/sinalizado/deferido)
- [`docs/SECURITY-TODO.md`](docs/SECURITY-TODO.md) — segurança deferida
- [`docs/UI-CLAREZA.md`](docs/UI-CLAREZA.md) — diretriz de clareza radical + glossário

> Regra: **atualizar estes docs após cada funcionalidade aprovada.**
