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

## 🔨 Próximo (pendências honestas — prioridade)

- [ ] **Casamento EXATO da pool no zap** — hoje casa por par (pode pegar pool de baixa liquidez / CL). Mostra o impacto, mas precisa mirar a pool certa.
- [ ] **Gestão de range (CL)** — NÃO resolvida. Só sinalizamos "assume in-range". Se o preço sai da faixa, para de render e não rebalanceamos. Solução = **Fase 2 (keeper)** ou só mirar **vaults de CL gerenciados**. Por ora preferir lending/full-range.
- [ ] **Landing redesign** — desatualizada ("100% automático: em breve" mas o zap já existe) e pobre de prova/visual. Tarefa com design-chief + copy-chief.
- [ ] **Teste E2E real** ($1-5): depositar → acompanhar → sacar.

## ⏳ Roadmap

- [ ] **Fase 1.5 — Imposto BR** (`core/tax-br`: GCAP, isenção R$35k/mês, Grupo 08) — relatório auxiliar + disclaimer
- [ ] **Fase 2 — Keeper** (rebalance do range, não saca; EOA→Safe+módulo) — depende de pools Nortoken reais
- [ ] **Fase 3 — Performance fee** 8-10% sobre o rendimento (receita) + zap de outros tokens (não só USDC) + claim de reward
- [ ] **Multi-chain** (Arbitrum/Optimism) + filtro de redes
- [ ] **Memes/Correlacionadas** nos filtros (quando houver dado confiável)

## 🔒 Segurança (antes de deploy/usuários) — ver `docs/SECURITY-TODO.md`

- [ ] Auth real no `/api/admin/*` (Sign-In with Ethereum) — hoje só dados agregados públicos
- [ ] CORS restrito + rate limiting + validação de schema (zod) das APIs externas
- [ ] Mover allowlist de admin pro backend

## Pré-requisitos do Humberto

- [x] Secrets no GitHub: `DATABASE_URL`, `ETHERSCAN_API_KEY` · chave Enso no `.env` do api
- [ ] Carteira admin real na `ADMIN_ALLOWLIST` (`app/src/lib/wallet.ts`)
