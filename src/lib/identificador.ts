/**
 * Identificador estável a partir de um nome, para os dados semeados.
 *
 * O acento é removido **antes** de trocar o que não é letra por hífen. Sem
 * essa etapa, "Prev Fácil Advogados" vira `prev-f-cil-advogados`: o `á` cai no
 * mesmo balde que o espaço, e o identificador ganha um hífen no meio da
 * palavra. Como as seeds se referenciam por id — o lead aponta para o advogado
 * que o comprou, o extrato aponta para o lead —, um hífen a mais quebra o elo
 * em silêncio e a tela aparece vazia sem erro nenhum.
 */
export function identificador(nome: string, limite = 26): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, limite);
}
