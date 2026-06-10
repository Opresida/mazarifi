# Verso Mazari — Mazari Fi
## Especificação de Monetização v2 FINAL — decisão fechada

> Status: **fechado para execução.** Todas as decisões de pricing e receita estão travadas. O que resta são dados que o agente puxa ao vivo (APY por vault) e métricas que só existem com tráfego (frequência de rebalance, ticket real), para os quais há premissas de trabalho definidas.

---

## 0. Contexto e escopo

Mazari Fi é o otimizador/agregador de yield na **Base**, parte do ecossistema Verso Mazari (Nortoken, Mazari Swap, Mazari Fi, Mazari Wallet).

**Arquitetura de lançamento — Rota B (não-custodial, via terceiro):** roteamento de USDC para vaults gerenciados de terceiros (Beefy-CLM / Gamma) via **Enso**. O vault de terceiro cuida do range, faz auto-compound e cobra a taxa dele (embutida no APY). Sem contrato próprio, sem auditoria — vai ao ar agora.

**Rota A (vault próprio) — DEFERIDA** (exige auditoria). Performance fee e harvest fee ficam desligados na v2, com o encaixe já reservado.

**Posicionamento — "honest DeFi" para LatAm.** Princípio inegociável: nenhuma taxa escondida; tudo declarado na tela.

---

## 1. Modelo de pricing — a decisão central

**Não existe "free gameável", mas o uso básico é aberto.** Dois níveis:
- **Basic ($0 de assinatura):** depositar, render e escolher vault no **modo manual**. Sem auto-switch. **Não é faixa gratuita a ser gameada** — splitar em várias carteiras não desbloqueia nada e ainda paga a entrada de 0,30% em cada carteira. Monetizado 100% nas taxas automáticas.
- **Pro (assinatura paga, por carteira):** desbloqueia o **Autopilot** (auto-switch — o diferencial), mais vaults e prioridade. Cobrança **por carteira** → split é contraproducente (N carteiras = N assinaturas).

**Por que não um piso de uso pago ($5/$10 pra todos):** um usuário de $500 a 5% rende ~$25/ano; cobrar $60–$120/ano o deixa no negativo → ele não paga (perdemos a entrada + o AUM) ou paga e sai falando mal. A massa se monetiza no automático, não no paywall. Nº de usuários e AUM são a moeda dos grants.

**Por que o Pro começa em $5 (não $10):** abrir o Pro barato converte o usuário médio (a partir de ~$1.7k a 10% / ~$3.4k a 5%), não só o grande. Degraus curtos de $5 até o teto de $25.

**Por que teto de 35% (não 45%):** em Rota B o usuário já paga ~9,5% da Beefy por baixo. A 45% somado, ele ficaria com ~50% do bruto — incompatível com "honest DeFi". A 35%, fica com ~59%. Alavanca de receita = volume/escala, não apertar o teto.

**Por que âncora de 5%:** é o APY líquido real seguro (stablecoins na Base). Ancorar a tabela publicada em 5% garante que ela nunca fure os 35% pra ninguém — quem está em vault de APY maior só paga uma fração menor do lucro.

---

## 2. Segmentação de usuário

| Segmento | Ticket | % da base (estim.) | Como monetiza | Nível |
|---|---|---|---|---|
| **Comum** | ~$500 | ~90% | 100% automático (entrada, swap, slippage, rebates) | Basic |
| **Power** | $3.500+ (premissa $5.000) | ~10% | Assinatura Pro + automático | Pro |

---

## 3. Camadas de receita (decisões finais)

### 3.1 Taxa de entrada (Enso) — ATIVA
- **0,30% na entrada (zap-in). Saída 0%.** Enso: `fee = 30` (bps), `feeReceiver = <tesouro>`, `referralCode` opcional.
- Taxa única, exposta na tela, recuperada em ~11 dias. Saída livre filtra capital mercenário. Aplica-se a Basic e Pro.

### 3.2 Mazari Pro — assinatura escalonada por depósito — ATIVA
**Regra mestra (inegociável):** o Pro nunca custa mais que **35% do lucro líquido anual** do cliente.
**Fórmula (gerar a tabela a partir dela, não hardcodar):**
```
preço_mensal_máximo(depósito) = 0,35 × depósito × APY_líquido / 12
```
`APY_líquido` âncora da tabela publicada: **5%** (real seguro, confirmado).

**Tabela final (âncora 5%, ~34% do lucro no piso, degraus de $5):**

| Depósito | Nível | Pro/mês | % do lucro no piso |
|---|---|---|---|
| $0 – $3.500 | Basic | $0 | — (automático) |
| $3.500 – $7.000 | Pro | $5 | ~34% |
| $7.000 – $10.500 | Pro | $10 | ~34% |
| $10.500 – $14.000 | Pro | $15 | ~34% |
| $14.000 – $17.500 | Pro | $20 | ~34% |
| $17.500+ | Pro | $25 | ≤34% |

- **Cobrança por carteira** (anti-Sybil). Gating de features por nível; recalcular ao cruzar de faixa.
- **Rail dinâmico (segurança):** o código calcula o teto com o **APY real do vault do usuário** e nunca cobra acima de 35% desse valor — mesmo que a tabela publicada use 5%. Zero violação em qualquer cenário + abre a porta pra tiers maiores em vault de alto APY.
- Cobrança técnica (on-chain pull vs off-chain): impl., não negócio.

### 3.3 Swap fee via Mazari Swap (hook V4) — ATIVA
- Cada auto-switch do Autopilot é um swap controlado pela Mazari → rotear pelo **hook próprio (0,2%)**. Volume fabricado pela automação. Só Pro tem auto-switch. Hook já pronto.
- Limite: o rebalance interno do vault de terceiro é deles. Só os swaps que a Mazari executa (zaps + auto-switch) passam pelo hook.

### 3.4 Rebates dos trilhos (via LiFi) — ATIVA
- Bridging via LiFi (agrega pontes; um feeReceiver; self-service). Passar `integrator` + `fee` (float). LiFi tem taxa padrão 25 bps + fatia variável.
- Setup: Partner Portal — https://portal.li.fi/signup — integrator string + carteira de coleta (= tesouro) + API key. Fee de integrador baixo e declarado; preferir share de parceiro.

### 3.5 Captura de slippage positivo — ATIVA (declarada)
- Excedente de execução **50/50 com o cliente**, **informado na tela** (componente obrigatório). Nunca no escuro.

### 3.6 Performance fee (Rota A) — DEFERIDA
- 8–10% sobre o rendimento, só no vault próprio. Desligada até auditoria.

### 3.7 Harvest / call fee — DEFERIDA / mínima
- Rota B: é do vault de terceiro. Rota A: ~0,1% do colhido, só pra gás do keeper. Não é centro de lucro.

### 3.8 Limite explícito — não capturável em Rota B
- A taxa de ~**9,5% que a Beefy morde** (uniforme nos 243 vaults da Base; `totalApy` já vem líquido) é intocável — fica no contrato do vault. **Não implementar skim** sobre rendimento de terceiro. Caminhos futuros: gestora com programa de parceiro, revenue-share por BD, ou Rota A.

---

## 4. Seleção do gestor de terceiro (critério de roteamento)
Há mais de uma gestora (Beefy, Gamma, Arrakis). **Escolher por economia, não só por APY.** Por pool, comparar: (1) taxa cobrada do rendimento; (2) programa de parceiro/referral (Beefy não tem público; checar Gamma e Arrakis); (3) performance líquida real. Rotear pra melhor combinação dos três.

---

## 5. Tabela-resumo das taxas

| Camada | Valor | Sobre | Status | Automática |
|---|---|---|---|---|
| Entrada (Enso) | 0,30% (30 bps) | depósito | Ativa | Sim |
| Saída | 0% | — | Ativa | — |
| Pro | $0 (Basic) / $5–$25 | tier por depósito, por carteira | Ativa | Recorrente |
| Swap rebalance (hook) | 0,2% | volume de auto-switch | Ativa | Sim |
| Rebates (via LiFi) | fee integrador + share | volume bridge/swap | Ativa | Sim |
| Slippage positivo | 50% do excedente | execução | Ativa (declarada) | Sim |
| Performance fee | 8–10% | rendimento | Deferida (Rota A) | — |
| Harvest | ~0,1% | colhido | Deferida (Rota A) | — |

---

## 6. Projeção de receita — cenário de lançamento
**Premissas:** 1.000 usuários · 90/10 · comum $500 (Basic) / power $5.000 (Pro $5) · Rota A desligada · APY líquido 5% · entrada 0,30% · turnover 1,8× / 1,2× · auto-switch 12×/ano · conversão Pro do power ~50%.

| Camada | Comum (900) | Power (100) | Total/ano |
|---|---|---|---|
| Entrada (Enso) 0,30% | $2.430 | $1.800 | ~$4.230 |
| Pro (assinatura) | $0 (Basic) | $3.000 | ~$3.000 |
| Swap rebalance (hook) | — | $1.800 | ~$1.800 |
| Rebates (via LiFi) | — | — | ~$1.200 |
| Slippage (metade) | — | — | ~$350 |
| **Total** | | | **~$10.600/ano** |

Fase de prova — cobre infra, não paga time. A ~10× a escala → ~$110k/ano. O salto grande vem com a Rota A (perf fee sobre AUM).

---

## 7. Princípios de transparência (honest DeFi)
Toda taxa visível na tela. Mostrar inclusive o que o vault de terceiro cobra (~9,5%) pra contrastar. Slippage dividido e declarado. Saída sempre livre (0%). Sem piso de uso pago — o pequeno nunca paga mais do que rende.

---

## 8. Integrações — referência de implementação
**Beefy (APY + taxa por vault):** `https://api.beefy.finance/apy` e `/apy/breakdown` (`vaultApr`, `beefyPerformanceFee`, `lpFee`, `tradingApr`, `vaultApy`, `totalApy`). Filtrar Base. Confirmado: 9,5% uniforme; `totalApy` já líquido.
**Enso (entrada):** `fee = 30` (bps), `feeReceiver` (= tesouro, obrigatório com fee), `referralCode` (opcional). Tesouro: `0x8ed2322492dba29d2d783a7de0c873c51444cbd2`.
**LiFi (bridge + rebate):** Partner Portal https://portal.li.fi/signup — integrator string + carteira de coleta + API key; passar `integrator` + `fee`.
**Gamma / Arrakis:** puxar APY + estrutura de taxa e checar programas de parceiro (§4).

---

## 9. Premissas de trabalho e tarefas do agente
**Travadas (placeholders até dado real):** APY líquido âncora 5% (real seguro, confirmado) · auto-switch 12×/ano · ticket power $5.000.

**Tarefas do agente (dados ao vivo):**
1. Puxar APY + `beefyPerformanceFee` dos vaults da Base e calcular APY líquido real por vault.
2. Comparar Beefy vs Gamma vs Arrakis por pool (3 eixos da §4).
3. Manter a fórmula dos 35% como fonte da verdade; a tabela publicada usa âncora 5%.

**Implementação técnica:**
- Roteamento Enso (fee 30 bps, feeReceiver = tesouro). ✅
- Auto-switches pelo hook Mazari Swap (0,2%).
- LiFi via Partner Portal.
- Split 50/50 de slippage + UI.
- Cobrança do Pro **por carteira**, gating por nível, transição ao cruzar de faixa, **rail dinâmico de 35% pelo APY real**.
- UI de transparência: breakdown completo, incluindo a taxa do vault de terceiro.
