/** Risk Checklist a partir das flags `risks` do vault (Beefy). Cada flag é "ruim" quando true →
 *  o item passa (✓) quando a flag é `false`. Espelha o checklist da Beefy, em PT. */
export interface RiskItem {
  label: string;
  ok: boolean;
  desc: string;
}

const FLAGS: { key: string; label: string; descOk: string; descBad: string }[] = [
  { key: 'complex', label: 'Estratégia não-complexa', descOk: 'A estratégia não envolve lógica de alta complexidade.', descBad: 'A estratégia é complexa — mais partes móveis, mais risco.' },
  { key: 'curated', label: 'Não depende de curador', descOk: 'Não depende de curadores/terceiros pra gerir o produto.', descBad: 'Depende de um curador/terceiro pra gerir — risco adicional.' },
  { key: 'notAudited', label: 'Auditado', descOk: 'Os protocolos por baixo têm auditorias públicas dos contratos.', descBad: 'Sem auditoria pública conhecida dos contratos por baixo.' },
  { key: 'notBattleTested', label: 'Testado no tempo (battle-tested)', descOk: 'Protocolos rodados por anos com muito valor — consolidados.', descBad: 'Protocolo novo / pouco rodado — menos histórico.' },
  { key: 'notCorrelated', label: 'Ativos correlacionados (menos IL)', descOk: 'Ativo único ou ativos que andam juntos → menos perda impermanente.', descBad: 'Ativos que NÃO andam juntos → mais risco de perda impermanente (IL).' },
  { key: 'notTimelocked', label: 'Timelock nas funções de admin', descOk: 'Funções privilegiadas têm timelock suficiente.', descBad: 'Sem timelock nas funções de admin — mudanças podem ser instantâneas.' },
  { key: 'notVerified', label: 'Contrato verificado', descOk: 'Os contratos por baixo têm o código verificado publicamente.', descBad: 'Contratos não verificados publicamente.' },
  { key: 'synthAsset', label: 'Sem ativo sintético', descOk: 'Sem exposição direta a ativos sintéticos/algorítmicos.', descBad: 'Tem exposição a ativo sintético/algorítmico — risco extra.' },
];

export function beefyChecklist(risks: Record<string, boolean | number> | null | undefined): RiskItem[] {
  if (!risks) return [];
  return FLAGS.filter((f) => f.key in risks).map((f) => {
    const ok = risks[f.key] === false;
    return { label: f.label, ok, desc: ok ? f.descOk : f.descBad };
  });
}
