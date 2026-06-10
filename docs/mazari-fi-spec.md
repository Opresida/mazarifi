# Verso Mazari — Mazari Fi
## Especificação de Monetização v1 FINAL — pronto para execução

> Status: **martelo batido, pacote completo.** Todas as decisões de negócio estão travadas. O que resta são dados que o agente puxa ao vivo (APY real) ou métricas que só existem com tráfego (frequência de rebalance, ticket real) — para esses, há premissas de trabalho definidas. Nenhuma decisão estratégica fica pendente.

---

## 0. Contexto e escopo

Mazari Fi é o otimizador/agregador de yield na **Base**, parte do ecossistema Verso Mazari (Nortoken, Mazari Swap, Mazari Fi, Mazari Wallet).

**Arquitetura de lançamento — Rota B (não-custodial, via terceiro):**
- Roteamento de USDC para vaults gerenciados de terceiros (**Beefy-CLM / Gamma**) via **Enso**.
- O vault de terceiro cuida do range, faz auto-compound e cobra a taxa dele (embutida no APY).
- Sem contrato próprio, sem auditoria — pode ir ao ar agora.

**Rota A (vault próprio) — DEFERIDA.** Exige auditoria. Receitas que dependem dela (performance fee, harvest fee) ficam desligadas na v1, mas o modelo já reserva o encaixe.

**Posicionamento — "honest DeFi" para LatAm.** Princípio inegociável: **nenhuma taxa escondida.** Tudo declarado na tela. O contraste com a Beefy (que esconde a taxa de performance no APY) é o argumento de marca.

---

## 1. Segmentação de usuário

| Segmento | Ticket | % da base (est.) | Como monetiza | Plano |
|---|---|---|---|---|
| **Comum** | ~$500 | ~90% | 100% automático (entrada, swap de rebalance, slippage, rebates) | Free |
| **Power** | $1.500+ (premissa $5.000) | ~10% | Assinatura Pro + automático | Pro |

O comum **não é cliente de assinatura** — não há yield suficiente para cobrar Pro de forma justa. É AUM agregado, funil para virar power, e número para grants/investidores. O power user paga as contas.

---

## 2. Camadas de receita (decisões finais)

### 2.1 Taxa de entrada (Enso) — ATIVA
- **0,30% na entrada (zap-in). Saída 0%.**
- Enso: na chamada da rota, passar `fee = 30` (bps) e `feeReceiver = <tesouro Mazari>` (obrigatório quando há fee). Opcional `referralCode` p/ tracking.
- Racional: taxa única, exposta na tela, recuperada em ~11 dias de rendimento (a 10% líquido). Com saída livre, funciona como **filtro de capital mercenário**. Não é o motor de receita; cobre infra e seleciona o usuário certo.
- Posicionamento: nunca vender como "mais barato que a Beefy" (em Rota B o user paga a taxa da Beefy por baixo + a entrada por cima). É o preço da curadoria, do UX em português e do auto-switch.

### 2.2 Mazari Pro — assinatura escalonada por depósito — ATIVA
**Regra mestra (inegociável):** o Pro nunca custa mais que **35% do lucro líquido anual** do cliente.
**Fórmula do teto (gerar a tabela A PARTIR desta fórmula, não hardcodar):**
```
preço_mensal_máximo(depósito) = 0,35 × depósito × APY_líquido / 12
```
- Alvo: ~28–30% do lucro (margem sob o teto de 35%).
- `APY_líquido` premissa: **10% a.a.** — substituir pelo valor real puxado da API da Beefy por vault (§6). A tabela recalcula sozinha.

| Depósito | Plano | Preço/mês (@10%) | % do lucro (piso) |
|---|---|---|---|
| $0 – $1.500 | Free | $0 | monetizado no automático |
| $1.500 – $3.000 | Pro Start | $4 | 32% |
| $3.000 – $6.000 | Pro Plus | $8 | 32% |
| $6.000 – $12.000 | Pro Prime | $15 | 30% |
| $12.000+ | Pro Max | $25 | ≤25% |

> **APY líquido REAL (verificado, Beefy Base):** perf fee **9,5% uniforme**; estáveis **~3-5%**, blue-chip ~10-30% (volátil), meme = lixo. A 5% os tiers caem ~pela metade. **Tabela não travada** até escolher o APY-âncora dos vaults usados de fato.

**Gating por tier:** cada faixa desbloqueia mais (nº de vaults, frequência do auto-switch, prioridade, suporte). Saldo cruza de faixa → recalcular plano. **Cobrança:** pull on-chain de stablecoin vs off-chain (impl. técnica).

### 2.3 Swap fee via Mazari Swap (hook V4) nos rebalances — ATIVA
- Todo auto-switch do Autopilot (troca de um vault p/ outro) é um swap controlado pela Mazari → rotear pelo **hook próprio (0,2%)**.
- Volume fabricado pela automação → receita on-chain automática. Só Pro tem auto-switch.
- **Limite:** o rebalance *interno* de um vault de terceiro é deles, não captura. Só os swaps que a Mazari executa (zaps + auto-switch entre vaults) passam pelo hook.

### 2.4 Rebates dos trilhos (bridge + roteador) — ATIVA
- **Bridging via LiFi** (agrega Across/Stargate etc.; um feeReceiver, self-service).
- SDK/API/Widget: `integrator` string + `fee` (float; ex. `0.001` = 0,1%). Fee coletado em contrato da LiFi, sacável p/ a carteira (= tesouro). LiFi tem taxa de serviço padrão 25 bps e fica com fatia variável.
- **Setup:** Partner Portal — https://portal.li.fi/signup — integrator string + carteira de coleta + API key.
- Across (ACX): referral pago em ACX por tiers de volume — bônus, não receita base.

### 2.5 Captura de slippage positivo — ATIVA (declarada)
- Execução melhor que o cotado → excedente **50/50 com o cliente**, **informado na tela** (componente obrigatório). Nunca no escuro.

### 2.6 Performance fee (Rota A) — DEFERIDA
- 8–10% sobre o rendimento, só no vault próprio. Desligada até auditoria.

### 2.7 Harvest / call fee — DEFERIDA / mínima
- Rota B: harvest é do vault de terceiro. Rota A: **~0,1% do colhido**, só pra gás do keeper. Não é centro de lucro.

### 2.8 O que NÃO dá para capturar em Rota B (limite explícito)
- **A taxa que a Beefy/Gamma morde do rendimento é intocável** — cai no tesouro deles, sem revenue-share público para frontend. **Não implementar skim.** Tratar como dinheiro da gestora.
- Os três caminhos p/ algo equivalente (fora da v1): (1) rotear p/ gestora com programa de parceiro; (2) negociar revenue-share por BD com volume na mão; (3) virar o vault (Rota A, precisa auditoria).

---

## 3. Seleção do gestor de terceiro (critério de roteamento)
Na Rota B há mais de uma gestora (**Beefy, Gamma, Arrakis**). **Escolher por economia, não só por APY.** Por pool, comparar em 3 eixos:
1. **Taxa** que ela cobra do rendimento (API — §6).
2. **Programa de parceiro / referral** (Beefy não tem público p/ frontend; checar Gamma e Arrakis).
3. **Performance líquida real** (APY após a taxa dela).

Rotear, por pool, para a melhor combinação dos três — melhor p/ o usuário **e** p/ a Mazari.

---

## 4. Tabela-resumo das taxas

| Camada | Valor | Sobre | Status | Automática |
|---|---|---|---|---|
| Entrada (Enso) | **0,30%** (30 bps) | depósito | Ativa | Sim |
| Saída | 0% | — | Ativa | — |
| Pro | $0–$25/mês | tier por depósito | Ativa | Recorrente |
| Swap rebalance (hook) | 0,2% | volume de auto-switch | Ativa | Sim |
| Rebates (LiFi) | integrador + share parceiro | volume bridge/swap | Ativa | Sim |
| Slippage positivo | 50% do excedente | execução | Ativa (declarada) | Sim |
| Performance fee | 8–10% | rendimento | Deferida (Rota A) | — |
| Harvest | ~0,1% | colhido | Deferida (Rota A) | — |

---

## 5. Projeção de receita — cenário de lançamento
**Premissas:** 1.000 usuários · 90/10 · comum $500 / power $5.000 · Rota A desligada · APY 10% · entrada 0,30% · turnover comum 1,8× / power 1,2× · auto-switch 12×/ano · conversão Pro do power ~50%.

| Camada | Comum (900) | Power (100) | Total/ano |
|---|---|---|---|
| Entrada (Enso) 0,30% | $2.430 | $1.800 | ~$4.230 |
| Pro | $0 (Free) | $4.800 | ~$4.800 |
| Swap rebalance (hook) | — | $1.800 | ~$1.800 |
| Rebates dos trilhos | — | — | ~$1.200 |
| Slippage (metade) | — | — | ~$350 |
| **Total** | | | **~$12.400/ano** |

Com $950k de AUM é fase de prova — cobre infra, não paga time. A ~10× a escala (~$9,5M AUM) → ~$120k/ano. O dinheiro grande liga com a Rota A (perf fee sobre AUM).

---

## 6. Integrações e dados — referência de implementação

### 6.1 Beefy — APY e taxa real por vault
- Total: `https://api.beefy.finance/apy`
- Detalhe: `https://api.beefy.finance/apy/breakdown` → por vault: `vaultApr`, `beefyPerformanceFee`, `lpFee`, `tradingApr`, `vaultApy`, `totalApy`.
- Taxa de performance **varia por vault** — usar `beefyPerformanceFee` real. (Verificado: Base = 9,5% uniforme; `totalApy` já líquido.)
- Tarefa: filtrar vaults da **Base**, montar {vault, totalApy, beefyPerformanceFee}, calcular APY líquido real → alimenta tiers (§2.2) e seleção de gestora (§3).

### 6.2 Enso — taxa de entrada
- `fee` (bps; `30`), `feeReceiver` (= tesouro; obrigatório com fee), `referralCode` (opcional).

### 6.3 LiFi — bridging + rebate
- Partner Portal: https://portal.li.fi/signup — integrator string + carteira de coleta (= tesouro) + API key. Passar `integrator` + `fee`.

### 6.4 Gamma / Arrakis — gestoras alternativas
- Puxar APY + estrutura de taxa via APIs/docs próprias; checar programas de parceiro (§3).

---

## 7. Premissas de trabalho e tarefas do agente
**Premissas travadas (placeholders até dado real):** APY líquido 10% · auto-switch 12×/ano · ticket power $5.000.

**Tarefas do agente (dados ao vivo):**
1. ✅ Puxar APY + `beefyPerformanceFee` da Base (Beefy API) e calcular APY líquido real. *(feito: 9,5% uniforme; estáveis ~3-5%)*
2. Comparar Beefy vs Gamma vs Arrakis por pool (3 eixos do §3).
3. Recalcular a tabela de tiers do Pro com o APY líquido real (fórmula §2.2).

**Implementação técnica:**
- Roteamento Enso (fee 30 bps, feeReceiver = tesouro). ✅
- Roteamento dos auto-switches pelo hook Mazari Swap.
- LiFi via Partner Portal (fee de integrador, feeReceiver = tesouro).
- Split 50/50 de slippage + componente de UI.
- Gating de tiers do Pro + transição ao cruzar de faixa + mecânica de cobrança.
- UI de transparência: breakdown completo de taxas na tela, **incluindo a taxa do vault de terceiro**.
