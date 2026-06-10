# TODO — Mazari Fi

> Atualizar após cada funcionalidade aprovada. Honestidade: o que está feito, o que falta, e os gaps que **não fingimos** ter resolvido.

## ✅ Feito

**Inteligência (Fase 1)**
- [x] `core` (il/apy/gas/token/risk/scoreboard/migration) + 40 golden tests
- [x] `chain` (readers viem, gás Base, Etherscan verified) · `ingestor` (DefiLlama + Nortoken → Neon) · `api` · `app`
- [x] Rendimento **realizado 15d líquido de IL** + faixa de volatilidade + selo "concentrada"
- [x] **2 destaques** (melhor empréstimo vs melhor pool) + projetor (gás + slippage + break-even)
- [x] **Custos transparentes** (swap + gás ao vivo + slippage) + `docs/COSTS.md`
- [x] **Integridade do token de incentivo** (Sólido/Razoável/Cuidado) — informar, não assustar
- [x] **Filtros leigos** (tipo/categoria/segurança/origem/com-incentivo) + glossário "?"
- [x] **Cron 20 min** (GitHub Actions) + limpeza de pools obsoletas
- [x] **Página do ativo** `/pool/:key` + **radar de migração** + **checklist** honesto (auto/curado/pendente)

**Execução (não-custodial, via Enso)**
- [x] **Depositar** USDC → monta a pool (`DepositPanel`, 1 tx assinada, confirmação honesta)
- [x] **Ver posições** (`/minhas-aplicacoes`) + **Sacar** pra USDC (`WithdrawCard`)
- [x] Botão "Acompanhar minhas aplicações" pós-depósito · nav com rotas reais

**Multi-chain + Cross-chain (commits cea12f7 · 4ef0daf · 0a5af96)**
- [x] **MULTI-CHAIN Base + Arbitrum** — config central `packages/chain/chains.ts` (`CHAINS`); ingestor/api/app parametrizados por chain; gás+`network` por chain; 108 pools + 12 gerenciadas (dobrou). Optimism/Polygon fora (DefiLlama não rastreia os vaults).
- [x] **Ponte de USDC (LiFi)** com **detecção automática** — `/api/usdc-balances` + `/api/bridge/quote`; o `DepositPanel` acha o USDC do user e sugere trazer da rede certa sozinho.
- [x] **Rebate LiFi LIGADO** — `LIFI_INTEGRATOR=Mazari-Fi` (sem API key, só a string) → 0,3% pro tesouro na ponte.
- [x] **Depósito cross-chain em 1 ASSINATURA** — `/api/bridge/deposit-quote` (LiFi contractCalls + zap Enso no destino); 1 tx faz ponte + entra no vault. `buildEnsoZap` reutilizável. Testado (quote): Base→vault wstETH/WETH Arb supported.

## 🔨 AMANHÃ (prioridade) — 2026-06-11

- [ ] **TESTE COM VALOR REAL** ($2-5): depósito cross-chain 1 clique (USDC Base → vault Arb roteável) — confirmar que o destino **não reverte** on-chain (o quote só prova a estrutura). Se reverter → validar o fallback (USDC fica na rede destino → depósito normal).
- [ ] **Mapear zappabilidade dos vaults + zappers ALTERNATIVOS ao Enso** — o Enso roteia só **~2 de 6** vaults Arb (404/422 nos outros, e muda dinamicamente — ex.: WBTC/USDC funcionava e parou). Pesquisar/testar quem cobre o que o Enso não cobre:
  - **Beefy own zap** (zap router da própria Beefy — por definição cobre TODOS os vaults Beefy) ← candidato #1
  - **LiFi contractCalls chamando o `deposit()` do vault direto** (sem Enso) · **Portals.fi** · **Odos** · **1inch** · **Gamma/Arrakis deposit direto**
  - Construir um **resolvedor de zap plugável** (Enso default → fallback) por vault/chain. Meta: cobertura ~100% das gerenciadas curadas.
- [ ] **Esconder do ranking as gerenciadas NÃO-zappáveis** (pra não frustrar o leigo) — depois do mapeamento acima.

## 🔨 Pendências honestas (média prioridade)

- [ ] **Casamento EXATO da pool no zap** — hoje casa por par (pode pegar pool de baixa liquidez / CL). Mostra o impacto, mas precisa mirar a pool certa.
- [ ] **Gestão de range (CL)** — resolvida via **vaults gerenciados Beefy-CLM** (o vault cuida do range). Pools cruas de CL: só sinalizamos "assume in-range".
- [ ] **Landing redesign** — desatualizada ("100% automático: em breve" mas o zap já existe) e pobre de prova/visual. Tarefa com design-chief + copy-chief.
- [ ] **Cross-chain numa assinatura: hoje a estimativa de saída da LiFi vem ~0** — mostramos o valor pelo USDC que chega (ok), mas vale revisitar se a LiFi melhorar.

## ⏳ Roadmap

- [ ] **Fase 1.5 — Imposto BR** (`core/tax-br`: GCAP, isenção R$35k/mês, Grupo 08) — relatório auxiliar + disclaimer
- [ ] **Fase 2 — Keeper** (rebalance do range, não saca; EOA→Safe+módulo) — depende de pools Nortoken reais
- [ ] **Autopilot/Pro** — auto-switch entre vaults (hook 0,2%, só Pro) + cobrança/gating da assinatura (rail 35% do lucro, âncora 5%)
- [ ] **Fase 3 — Performance fee** 8-10% sobre o rendimento (receita) + zap de outros tokens (não só USDC) + claim de reward
- [ ] **Optimism/Polygon** — destravadas pela **databarn da Beefy** (free, cobre os vaults que o DefiLlama não rastreia)
- [ ] **Memes/Correlacionadas** nos filtros (quando houver dado confiável)

## 🔒 Segurança (antes de deploy/usuários) — ver `docs/SECURITY-TODO.md`

- [ ] Auth real no `/api/admin/*` (Sign-In with Ethereum) — hoje só dados agregados públicos
- [ ] CORS restrito + rate limiting + validação de schema (zod) das APIs externas
- [ ] Mover allowlist de admin pro backend

## Pré-requisitos do Humberto

- [x] Secrets no GitHub: `DATABASE_URL`, `ETHERSCAN_API_KEY` · chave Enso no `.env` do api
- [x] Portal LiFi: tesouro `0x8ed2…cbd2` em todas as redes EVM + integrator string `Mazari-Fi` → `LIFI_INTEGRATOR`
- [ ] Carteira admin real na `ADMIN_ALLOWLIST` (`app/src/lib/wallet.ts`)
- [ ] **Deploy:** setar no servidor `MAZARI_TREASURY` + `LIFI_INTEGRATOR=Mazari-Fi` (+ `ARBITRUM_RPC` opcional) — não vão no git
