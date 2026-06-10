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

## Monetização (spec **v2** FINAL — `docs/mazari-fi-spec.md`)

Modelo TRAVADO. **Rota B** (vault de terceiro). **Basic vs Pro:**
- **Basic ($0):** depositar/render/escolher vault no **manual** (sem auto-switch). Monetizado só nas taxas automáticas.
- **Pro (pago, POR CARTEIRA):** desbloqueia o **Autopilot** (auto-switch) + mais vaults + prioridade. Por carteira = anti-split.
- **Entrada (Enso): 0,30% (30 bps), saída 0%.** ✅ **ATIVA** — `feeReceiver = 0x8ed2322492dba29d2d783a7de0c873c51444cbd2` (tesouro, no `api/.env`). Aplica a Basic e Pro.
- **Tabela Pro FINAL (âncora 5%, degraus de $5, ≤35% do lucro):** Basic $0–$3.500 → Pro **$5** ($3.5–7k) · **$10** ($7–10.5k) · **$15** ($10.5–14k) · **$20** ($14–17.5k) · **$25** ($17.5k+). Fórmula-verdade: `preço_mês = 0,35 × dep × APY_líq / 12`. **Rail dinâmico:** o código cobra no máx 35% do lucro com o **APY REAL do vault** (publicada usa 5%). Por que 5%: APY seguro real (estáveis Base). Por que 35% (não 45%): user já paga ~9,5% da Beefy por baixo.
- **Swap 0,2%** no auto-switch (hook, só Pro) · **Rebates LiFi** · **Slippage 50/50** declarado.
- **Perf fee 8-10% + harvest:** Rota A (deferida, precisa auditoria). **Limite Rota B:** taxa do vault (~9,5%) **intocável** (sem revenue-share público) — mostrar, não skimmar.
- Princípio: **honest DeFi — nenhuma taxa escondida** (tudo na tela, inclusive a do parceiro). **Saída sempre 0%.**

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
