# Contexto — Mazari Fi

## O problema

DeFi promete rendimento alto, mas o número que aparece (APY) quase sempre é **bruto e enganoso**: não desconta a **perda impermanente**, conta **incentivo frágil** (token que pode despencar) como se fosse garantido, e ignora **gás, swap e slippage**. Pra um brasileiro iniciante, é jargão + cilada.

## A nossa resposta

**Honestidade radical + linguagem de gente.** O número que vai pro usuário é o **líquido realizado** ("essa pool rendeu X% nos últimos 15 dias", já tirando o IL), com **todos os custos na cara** e o **risco traduzido** (Seguro/Médio/Arriscado). Se uma "oportunidade de 20%" na verdade dá prejuízo, o usuário vê isso **primeiro**.

E desde a comparação com a Beefy, entendemos que o valor real não é só **informar** — é **executar**. Então fechamos o ciclo: **depositar → ver → sacar**, tudo **não-custodial** (o usuário assina; a gente nunca guarda o dinheiro).

## Onde estamos vs o mercado (sincero)

- **Ganhamos no "como":** mais honestos que a Beefy (decompomos custo, checamos a solidez do token de incentivo, mostramos o piso sem incentivo) e **muito** mais acessíveis pro leigo brasileiro.
- **Perdíamos no "o quê":** a Beefy **move dinheiro** (auto-compounding); a gente só informava. Com o **zap não-custodial** (via Enso) já depositamos/sacamos — falta auto-gestão (range/keeper).
- O moat não é o ranking (isso é commodity grátis: DefiLlama, vaults.fyi). É a soma de **(1) ângulo leigo/BR + (2) pools Nortoken próprias medidas + (3) execução honesta**.

## A vantagem injusta: Nortoken

Todo token Nortoken nasce **medido on-chain** (o hook emite `SwapTracked` → volume/fees reais) e com **liquidez travada** (keeper = Mazari), que vira a ponte pra gestão automática (Fase 2). Hoje as pools Nortoken são **testnet (demo)**; viram reais quando o Nortoken escalar.

## Arquitetura de lançamento — Rota B (spec `docs/mazari-fi-spec.md`)

**Rota B (AGORA, não-custodial):** roteamos USDC **direto** pro protocolo (Aave/Morpho/Aerodrome/etc.) via **Enso**. **Sem contrato/keeper próprio** → sem auditoria, vai ao ar já.
**Rota A (depois, deferida):** cofres próprios (performance fee 8-10%) — precisa auditoria.
> O **keeper** (`rebalance` do lock) é **só pras pools Nortoken** (nossa liquidez travada), NÃO pras externas.

> ⚠️ **Seleção de gestora (§4) — INVESTIGADA e ENGAVETADA na Base (2026-06):** a ideia era rotear pra vault gerenciado (Beefy-CLM/Gamma) que cuida do range. **Achado ao vivo:** os **CLM da Beefy na Base são minúsculos** (maior ~$2,5k TVL → inviável); os **standard viáveis** (TVL≥$200k) são quase só **Morpho USDC**, que já roteamos **direto e melhor** (a Beefy só tira 9,5% à toa); **Enso não cobre Gamma/Arrakis**. Conclusão: **na Base o direto ganha do gerenciado** — não metemos intermediário que piora. **Gestão de range segue como gap honesto** (sinalizamos "concentrada/assume in-range"). Revisitar gestora só em **multi-chain** (Arbitrum/OP têm CLM com TVL real) ou na **Rota A**. `sources/beefy.ts` foi escrito e revertido (recriar fácil quando revisitar).

**Receita (spec §2):** 0,30% na entrada (Enso) · Pro (assinatura por tier de depósito) · 0,2% no swap de auto-switch (hook, só Pro) · rebates LiFi · slippage 50/50 declarado. Perf fee = Rota A.

## Ordem de build
1. **Fase 1 — Inteligência (read-only):** ranking honesto + custos + integridade. ✅
2. **Zap Rota B (atual):** depositar/sacar via Enso (taxa **0,30% na entrada**, saída grátis). ✅
3. **Imposto BR (1.5)** · **Pro tiers** · **LiFi** · **Rota A**. ⏳ (seleção de gestora: engavetada na Base — ver nota acima; revisitar multi-chain/Rota A)

## Regras inegociáveis

- Exibir **SEMPRE** o líquido (fee + incentivo − IL − custos), nunca o número bonito sozinho.
- Score **cego à origem** (pool Nortoken sem bônus).
- **Não-custodial**: o usuário assina; a Mazari é software, não gestor/custodiante (régua CVM mínima na Fase 1).
- **Não fingir precisão**: o que não medimos é marcado como "pendente" (ex.: range CL, concentração de holders).
- Honestidade > otimismo cego. Explicar por analogia do dia a dia.

## Quem

Humberto (dono) + Claude. Diretriz de UI canônica em [`docs/UI-CLAREZA.md`](docs/UI-CLAREZA.md). Ledger de custos em [`docs/COSTS.md`](docs/COSTS.md).
