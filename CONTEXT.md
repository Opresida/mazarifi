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

## Ordem de build (decidida pelo Humberto)

1. **Fase 1 — Inteligência (read-only):** ranking honesto + custos + integridade. ✅ feito.
1.5. **Imposto BR:** relatório de ganho de capital (GCAP, isenção R$35k/mês). ⏳
2. **Fase 2 — Keeper (passivo Nortoken):** bot que rebalanceia o range (não saca). Resolve a gestão de range. ⏳
3. **Fase 3 — Agregador / receita:** performance fee 8-10% sobre o rendimento; o zap é o primeiro pedaço. ⏳

## Regras inegociáveis

- Exibir **SEMPRE** o líquido (fee + incentivo − IL − custos), nunca o número bonito sozinho.
- Score **cego à origem** (pool Nortoken sem bônus).
- **Não-custodial**: o usuário assina; a Mazari é software, não gestor/custodiante (régua CVM mínima na Fase 1).
- **Não fingir precisão**: o que não medimos é marcado como "pendente" (ex.: range CL, concentração de holders).
- Honestidade > otimismo cego. Explicar por analogia do dia a dia.

## Quem

Humberto (dono) + Claude. Diretriz de UI canônica em [`docs/UI-CLAREZA.md`](docs/UI-CLAREZA.md). Ledger de custos em [`docs/COSTS.md`](docs/COSTS.md).
