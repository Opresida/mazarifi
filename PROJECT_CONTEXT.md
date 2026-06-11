# Project Context — Mazari Fi

Documento de contexto profundo (decisões, restrições, convenções) que **não** se deriva do código. Ler ao retomar o projeto.

## Identidade do projeto

- **Produto:** otimizador/agregador de yield em pools de liquidez, EVM multi-chain — **Base + Arbitrum** (o "chain" é config, dá pra adicionar rede sem refatorar). Posicionamento: "melhor rendimento líquido ajustado a risco, mastigado pro leigo".
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
- **Zap via Enso** (aggregator não-custodial) em vez de contrato próprio — evita auditoria/risco e mantém a régua "software, não gestor". **Limite:** o Enso só roteia *alguns* vaults gerenciados (404/422) → tarefa aberta de mapear zappers alternativos (Beefy own zap, LiFi direto, Portals, Odos) e esconder os não-zappáveis.
- **Multi-chain config-driven** (`packages/chain/chains.ts` `CHAINS`) — adicionar rede = uma entrada; ingestor/api/app leem de lá. **Base + Arbitrum** (Optimism/Polygon fora: DefiLlama não rastreia os vaults → futuro via databarn da Beefy).
- **REGRA DE COBERTURA (global):** o objetivo é **sempre montar a posição dentro do vault**. Todo protocolo/token/rede novo só vira **investível** quando existe uma **engine de zap** que (a) monta a posição E (b) **capta nossa taxa de 0,30%** (Enso via `feeReceiver` nativo, OU embrulho na **LiFi `contractCalls` `integrator=Mazari-Fi`** quando o parceiro não tem fee própria — NUNCA mandar a tx do parceiro direto = vazaria receita). Sem engine → fica **"em breve" honesto** (não some). A cobertura é **exibida na front** (vira marketing). Resolvedor plugável: `resolveDestCall` no `services/api` (engines `enso`, `pendle`; Fase 2: erc4626/beefy).
- **Erro de transação = sempre explicado** (conforto): toda falha mostra "o que houve + como resolver + seus fundos estão seguros" (Fase 2 `lib/txError`).
- **Cross-chain via LiFi** (não custódia nova): detecção automática de onde está o USDC + ponte (`Mazari-Fi` integrator, rebate 0,3%) + **depósito em 1 assinatura** (LiFi `contractCalls` executa o zap Enso no destino). Saída de erro segura: se o destino reverter, o USDC fica na rede destino e o user finaliza normal — nada se perde.
- **Engines de zap plugáveis** (`resolveDestCall`): Enso (nativo) + **Pendle** (renda fixa, Hosted SDK v2, embrulho LiFi capta a taxa) + **Portals** (2ª engine, `partner`=tesouro). Gaps nicho que nenhum zapper cobre → "em breve".
- **Monetização (6 camadas, `docs/RECEITA.md`):** ✅ entrada 0,30% + rebate LiFi + **swap 0,2% no auto-switch** (todas → tesouro `0x8ed2…cbd2`); 🔜 Pro (assinatura, falta cobrança); ⏳ slippage 50/50 + performance fee 8-10% (precisam **router próprio = Rota A + auditoria**). Slippage 50/50 NÃO dá com agregador (eles mandam 100% do output pro cliente).
- **Autopilot ASSISTIDO (não autônomo):** somos não-custodiais → o Autopilot **vigia + sugere + troca em 1 clique (o cliente assina)**; mover sozinho = futuro (keeper+auditoria). Só sugere quando compensa (ganho cobre o custo).
- **Saúde da Aplicação (assessoria, doutrina do Humberto):** o cliente assina pra ter **consultoria + conforto** — não larga o dinheiro derreter numa IL. Por posição: performance dia/quinzena/mês, IL, indicador de saúde, e na linha vermelha a análise **ficar-vs-trocar** (a decisão é do cliente; **nada de prever mercado** — só matemática). **Aporte** rastreado (`lib/ledger`, localStorage; durável cross-device = Fase 2 com user DB). Fase 2: re-envio em 3 dias por email/push.
- **Deploy** (`DEPLOY.md`): frontend **Vercel** (`app/vercel.json`, app é standalone Vite), API num servidor long-running (Render/Railway/Fly — Express+Neon), ingestor no cron do GitHub Actions. Secrets só nas env vars do host (nunca no git): DATABASE_URL/ENSO_API_KEY/MAZARI_TREASURY/LIFI_INTEGRATOR/PORTALS_API_KEY/AUTOPILOT_FEE_BPS.
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
- **Swap 0,2%** no auto-switch (hook, só Pro) · **Rebate LiFi 0,3% na ponte — LIGADO** (integrator `Mazari-Fi`, sem API key; tesouro cadastrado em todas as redes EVM no portal.li.fi) · **Slippage 50/50** declarado.
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
