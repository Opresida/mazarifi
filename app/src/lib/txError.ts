/** Traduz erros de transação pra linguagem de gente: o que houve + como resolver + tranquilizar.
 *  Conforto é a marca — o usuário nunca vê stack trace, sempre uma saída clara. */
export function friendlyError(e: unknown): string {
  const code = (e as { code?: number })?.code;
  const raw = ((e as Error)?.message ?? String(e ?? '')).toLowerCase();

  if (code === 4001 || raw.includes('user rejected') || raw.includes('user denied') || raw.includes('cancel'))
    return 'Você cancelou — nada foi enviado, seu dinheiro está intacto na carteira.';
  if (raw.includes('insufficient funds') || raw.includes('insufficient balance') || raw.includes('exceeds balance'))
    return 'Saldo insuficiente pra cobrir o valor + o gás da rede. Reduza o valor, ou adicione um pouco do token nativo (ETH/BNB/etc.) pro gás, e tente de novo.';
  if (raw.includes('allowance') || raw.includes('not approved'))
    return 'Falta aprovar o token primeiro — clique de novo e confirme a aprovação na carteira (é o 1º passo, rápido).';
  if (raw.includes('slippage') || raw.includes('reverted') || raw.includes('execution reverted') || raw.includes('price impact'))
    return 'A rede oscilou e a transação não passou. Tente de novo em instantes — seus fundos estão seguros, nada saiu da sua carteira.';
  if (raw.includes('chain') && (raw.includes('switch') || raw.includes('mismatch') || raw.includes('wrong')))
    return 'A carteira está em outra rede. Troque pra rede certa (a gente pede automático) e tente de novo.';
  if (raw.includes('nonce') || raw.includes('replacement') || raw.includes('already known'))
    return 'Tem uma transação anterior ainda processando. Espere ela confirmar e tente de novo.';
  return 'Não deu pra concluir agora. Tente de novo em instantes — seus fundos continuam seguros, nada foi movido.';
}
