# Mazari Fi — Modelo de Receita

> Como a Mazari Fi ganha dinheiro. Documento de referência do modelo de monetização (spec v2).
> **Princípio inegociável:** honestidade radical — **todas** as taxas aparecem na tela do cliente, inclusive as que a gente **não** ganha.
> Tesouro (recebe todas as taxas): `0x8ed2322492dba29d2d783a7de0c873c51444cbd2`

---

## Resumo rápido

| # | Meio de receita | Status | Quem paga |
|---|---|---|---|
| 1 | Taxa de entrada **0,30%** (zap-in) | ✅ **Ativo** | Todo cliente, ao investir |
| 2 | Rebate da ponte (**LiFi**, ~0,3%) | ✅ **Ativo** | Quem traz dinheiro de outra rede |
| 3 | **Mazari Pro** (assinatura $5–$25/mês) | 🔜 Falta implementar | Cliente Pro (opcional) |
| 4 | **Swap fee 0,2%** no auto-switch | 🔜 Falta implementar (depende do Autopilot) | Cliente Pro |
| 5 | **Slippage 50/50** | 🔜 Falta implementar | Embutido na execução |
| 6 | **Performance fee 8–10%** (Rota A) | ⏳ Futuro (auditoria + jurídico) | Sobre o lucro do cliente |

---

## ✅ O QUE JÁ TEMOS (capta receita hoje)

### 1. Taxa de entrada — 0,30% (zap-in)
- **O que é:** cobrada uma única vez, no momento em que o cliente investe (monta a posição). **Saída sempre 0%.**
- **Como capta:** nativamente pelas engines de zap, todas apontando pro tesouro:
  - **Enso** → `fee=30` (bps) + `feeReceiver=MAZARI_TREASURY`
  - **Portals** → `partner=MAZARI_TREASURY` + `feePercentage`
  - **Pendle** (sem fee própria) → embrulhado na **LiFi `contractCalls`** com `integrator=Mazari-Fi`
- **Estado:** **ATIVO** — tesouro configurado no `services/api/.env` (`MAZARI_TREASURY`), `feeBps 30` verificado ao vivo.
- **Falta:** apenas setar `MAZARI_TREASURY` no **servidor de produção** (não vai no git).

### 2. Rebate da ponte (LiFi) — ~0,3%
- **O que é:** quando o cliente traz dinheiro de outra rede (cross-chain), a Mazari é a **integradora** da ponte e ganha um rebate de cada travessia.
- **Como capta:** `integrator=Mazari-Fi` nas chamadas LiFi (só a string, sem API key). O rebate cai na **rede de origem** da ponte.
- **Estado:** **ATIVO** — `LIFI_INTEGRATOR=Mazari-Fi` no `.env`; tesouro `0x8ed2…cbd2` cadastrado em **todas as redes EVM** no portal.li.fi (menos Hyperliquid). `feePct 0.3` testado.
- **Falta:** setar `LIFI_INTEGRATOR=Mazari-Fi` no **servidor de produção**.

---

## 🔜 O QUE FALTA IMPLEMENTAR (decidido, ainda não no ar)

### 3. Mazari Pro — assinatura
- **O que é:** assinatura mensal que desbloqueia o **Autopilot** (troca automática de pools) e recursos premium.
- **Tiers (âncora APY 5%, degraus de $5), por faixa de depósito:**
  | Depósito | Plano |
  |---|---|
  | $0 – $3.500 | **Basic** ($0, manual) |
  | $3.500 – $7.000 | **Pro $5/mês** |
  | $7.000 – $10.500 | **Pro $10/mês** |
  | $10.500 – $14.000 | **Pro $15/mês** |
  | $14.000 – $17.500 | **Pro $20/mês** |
  | $17.500+ | **Pro $25/mês** |
- **Trava inteligente (rail dinâmico):** o código **nunca** cobra mais que **35% do lucro real** do cliente (calculado com o APY de verdade do vault). Se o lucro não justifica, o preço cai sozinho.
- **Estado:** tiers e fórmula **FECHADOS**. **Falta:** sistema de cobrança + gating (liberar features por carteira Pro) + o rail dinâmico no código.

### 4. Swap fee 0,2% no auto-switch
- **O que é:** quando o **Autopilot** troca o cliente de uma pool pra outra melhor, a Mazari capta 0,2% naquele swap.
- **Condição:** só pra cliente **Pro** (faz parte do Autopilot).
- **Estado:** **Falta** — depende do Autopilot/hook estar construído.

### 5. Slippage 50/50
- **O que é:** quando a execução tem slippage favorável, a Mazari fica com **metade** dele; a outra metade volta pro cliente.
- **Regra de marca:** sempre **declarado na tela** (nunca escondido).
- **Estado:** **Falta** — implementação na execução + UI declarando.

---

## ⏳ FUTURO (precisa auditoria + jurídico antes)

### 6. Performance fee 8–10% (Rota A)
- **O que é:** taxa sobre o **rendimento** (só sobre o que o cliente ganha) — *"só ganhamos quando você ganha"*.
- **Depende de:** a **Rota A** (cofres próprios da Mazari, contratos auditados). Hoje a gente usa **Rota B** (roteia pra vaults de terceiros, que cuidam do range).
- **Estado:** **DEFERIDO** — precisa de contratos próprios + **auditoria** + **gate jurídico/CVM** (taxa sobre rendimento se aproxima de gestão de recursos).

---

## 🧭 O princípio que amarra tudo (honest DeFi)

A gente mostra **TODAS** as taxas na tela do cliente — inclusive as que **não** são nossas:
- A **taxa do gestor terceiro** (ex.: **Beefy ~9,5%** sobre o rendimento, embutida no APY) é **intocável**, **sem revenue-share** pra Mazari, e mesmo assim aparece na cara do cliente.
- Mostrar o que os concorrentes escondem é o **argumento de marca** — a transparência vira conversão.

---

## Pendências de ativação (deploy)

- [ ] `MAZARI_TREASURY=0x8ed2322492dba29d2d783a7de0c873c51444cbd2` no servidor de produção
- [ ] `LIFI_INTEGRATOR=Mazari-Fi` no servidor de produção
- [ ] `PORTALS_API_KEY` no servidor de produção (2ª engine de captura)
- [ ] Construir cobrança + gating do Mazari Pro (receita #3)
- [ ] Construir o Autopilot (destrava receitas #4 e parte do Pro)
- [ ] Implementar slippage 50/50 + UI (#5)
- [ ] Rota A (cofres próprios) + auditoria → destrava a performance fee (#6)

> Referências: `docs/mazari-fi-spec.md` (spec completo), `docs/COSTS.md` (ledger de custos do cliente).
