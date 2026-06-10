# Mazari Fi — Ledger de custos (o que entra no rendimento "líquido")

> O produto é honestidade radical: o número que vai pro usuário tem que descontar os custos reais.
> Este é o mapa COMPLETO — **modelado / sinalizado / deferido** — pra nada escapar silenciosamente.

## ✅ MODELADO (entra na conta hoje)
| Custo | Onde | Como |
|---|---|---|
| **Fee + incentivo** (receita) | `core/apy.windowReturn`, ingestor | fee realizado (DefiLlama `/chart`) + reward; **não** descontados (é a receita do LP) |
| **Perda impermanente (IL)** | `core/il.ilFullRange`, ingestor | IL real do histórico de preço (coins API, 15d); 0 p/ single/stable |
| **Swap de entrada/saída** | `core/apy.entryExitCostPct` + `app/MoneyProjector` | ≈ `feeTier` round-trip (montar+desmontar o par); empréstimo = 0 |
| **Gás de rede** | `core/gas` + ingestor (tabela `network`) + projetor | **AO VIVO** (Base mainnet RPC grátis) × gas units típicas por tipo (lending 250k / troca 450k / concentrada 650k) × ETH/USD. Flat em $, pesa em valor pequeno |
| **Slippage / impacto no preço** | `lib/money.priceImpactPct` (aviso) | aprox. constant-product `(amount/2)/tvl`; **aviso** quando o valor é grande pra pool (não número fingido) |

## ⚠️ SINALIZADO na UI (custo real, sem fingir número exato)
- **Incentivo é "papel":** a recompensa vem em OUTRO token → pra realizar você **vende** (mais swap+slippage+gás). Em vez de assustar sempre, **checamos a solidez do token** (`reward_integrity`): **mcap + liquidez (DefiLlama, grátis) + idade + verificado (Etherscan, chave grátis opcional) + protocolo conhecido** → veredito **Sólido / Razoável / Cuidado**. AERO = Sólido ($312M, 99% liquidez). Mostramos sempre o **piso** (fee − IL, sem incentivo) como número conservador.
  - **"Auditado" é honesto:** auditoria é **off-chain** (PDF de firma) — **não** afirmamos automaticamente. Marcamos "protocolo conhecido" (lista curada) e orientamos conferir no site do projeto.
- **CL fora do range:** pools concentradas assumem posição **dentro do range**; fora dele = 0 fee. Sinalizado com selo "concentrada / assume in-range".
- **Lockup / carência de saída:** alguns protocolos seguram o saque — sinalizar quando o dado existir.

## ⏭️ DEFERIDO (com razão clara)
- **Fee da Mazari** (receita da execução): **$0 no depósito · 0,5% no saque** — taxa de integrador via **Enso** (descontada do que você recebe, vai pro tesouro Mazari), mostrada na confirmação do saque. Você pode entrar/sair **manual de graça** (handoff). Performance fee sobre o rendimento = Fase 3.
- **Fees de vault parceiro** (Beefy/Yearn/40-acres/yo-protocol): o `apyBase` do DefiLlama normalmente **já é líquido** das fees do vault (rendimento ao depositante). Anotado; se algum vier bruto, descontar.
- **Imposto (GCAP BR):** Fase 1.5 — módulo `core/tax-br` (isenção R$35k/mês, Grupo 08), relatório AUXILIAR + disclaimer.
- **Bridge pra Base:** assumimos fundos **já na Base**. Custo de bridge fica fora (nota).
- **Rebalance** (posição gerenciada): só na Fase 2 (keeper) — gás + swap por rebalance.

## ❗ NÃO é problema (verificado)
- **Compounding/capitalização:** o headline usa **`return_15d` realizado** + anualização **simples** (×365/15). NÃO assumimos capitalização diária grátis → sem otimismo escondido.
- **Gas units estimadas:** o **preço** do gás é ao vivo; as **units** são típicas (rotulado como estimativa). Na Base o gás é centavos, então é mais transparência que precisão.
