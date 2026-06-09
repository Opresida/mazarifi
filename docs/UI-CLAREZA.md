# Mazari Fi — Diretriz de UI: Clareza Radical

> O produto É a transparência. Qualquer pessoa (leiga, sem cripto) bate o olho e em **<10s** entende
> a melhor opção e **quanto vai ganhar**. Honestidade inegociável: sempre o rendimento **LÍQUIDO**
> (já tirando perdas/taxas), nunca o número bonito. Risco sempre na cara.

## Glossário (técnico → claro) — nenhum termo técnico como rótulo principal
| Técnico | Na tela |
|---|---|
| Pool | **Oportunidade** |
| net yield / rendimento líquido | **Quanto sobra pra você** |
| TVL | **Já aplicado aqui** |
| APY / APR | **Quanto rende por ano (estimativa)** |
| IL (impermanent loss) | **Risco de perda quando o preço varia** (tooltip) |
| Score de risco | **Nível de segurança**: Seguro / Médio / Arriscado |
| Yield | **Rendimento** |

## Regras
1. **Zero jargão como rótulo** — termo técnico só em tooltip/explicação secundária.
2. **Dinheiro real (US$)** — projetar ganho por dia/mês/ano a partir de um valor digitado; "estimativa, não garantia".
3. **Melhor opção no topo** + frase-porquê em PT claro usando SÓ dados reais (rendimento líquido + segurança + quanto já tem aplicado — nunca inventar idade que não temos).
4. **Mobile-first**, ≤3 infos por card (rende · segurança · aplicado), mínimo de cliques.
5. **Honestidade** — sempre o líquido (IL/risco/taxas); risco na cara; nunca prometer ganho garantido.

## Identidade "Ink & Lime"
Fundo ink `#0A0B14`; primária verde `#34E29B`; secundárias íris `#7C6FF0` / ouro `#F5B544`. Risco: Seguro `#34E29B` · Médio `#F5B544` · Arriscado `#FB7185`. Display Space Grotesk + corpo Inter.

## Superfícies
- `/` **Landing** (venda) — hero "Otimizador de rendimento de pools de liquidez".
- `/dashboard` **Usuário** (linguagem leiga, mobile-first) — login por carteira.
- `/admin` **Admin** (operação; allowlist) — real onde há + números de exemplo MARCADOS "demonstração".
