/**
 * Vocabulário de cor por estado — EST-R02 e EST-R10.
 *
 * A view nunca escreve `bg-amber-50 text-amber-800` direto: escolhe um tom e
 * pede a classe completa aqui. O custo de espalhar isso é conhecido — quando
 * "a cor de pendência" precisa mudar, não existe um lugar para mudá-la e vira
 * varredura na base inteira.
 *
 * As classes estão escritas por extenso de propósito (EST-R01): nome montado
 * por concatenação some silenciosamente no build.
 */

/**
 * Tom, não pigmento. `marca` é o roxo do produto e serve a destaque neutro;
 * os quatro seguintes são significado — e significado não vira cor de marca,
 * senão "positivo" e "em destaque" passam a ser a mesma coisa na tela.
 */
export type Tom = 'neutro' | 'marca' | 'sucesso' | 'atencao' | 'erro' | 'info';

/** Contador do topo das telas: fundo claro + borda + texto legível. */
export const ESTILO_CHIP: Record<Tom, string> = {
  neutro: 'bg-white border-stone-200 text-roxo-900',
  marca: 'bg-roxo-50 border-roxo-200 text-roxo-800',
  sucesso: 'bg-sucesso-50 border-sucesso-200 text-sucesso-900',
  atencao: 'bg-atencao-50 border-atencao-200 text-atencao-800',
  erro: 'bg-erro-50 border-erro-200 text-erro-800',
  info: 'bg-info-50 border-info-200 text-info-800',
};

/** Etiqueta compacta — conselho regulador, prioridade, status de conta. */
export const ESTILO_ETIQUETA: Record<Tom, string> = {
  neutro: 'bg-stone-100 text-stone-600',
  marca: 'bg-roxo-100 text-roxo-700',
  sucesso: 'bg-sucesso-100 text-sucesso-700',
  atencao: 'bg-atencao-100 text-atencao-800',
  erro: 'bg-erro-100 text-erro-700',
  info: 'bg-info-100 text-info-700',
};

/** Bloco de aviso: caixa inteira tingida, com borda. */
export const ESTILO_BLOCO: Record<Tom, string> = {
  neutro: 'bg-stone-50 border-stone-200',
  marca: 'bg-roxo-50 border-roxo-200',
  sucesso: 'bg-sucesso-50 border-sucesso-200',
  atencao: 'bg-atencao-50 border-atencao-200',
  erro: 'bg-erro-50 border-erro-200',
  info: 'bg-info-50 border-info-200',
};

/** Só o traço de cor: bolinha de estado, cabeça de coluna, barra de gráfico. */
export const ESTILO_PONTO: Record<Tom, string> = {
  neutro: 'bg-stone-400',
  marca: 'bg-roxo-500',
  sucesso: 'bg-sucesso-500',
  atencao: 'bg-atencao-400',
  erro: 'bg-erro-400',
  info: 'bg-info-400',
};

/** Ícone ou número solto sobre fundo claro. */
export const ESTILO_TEXTO: Record<Tom, string> = {
  neutro: 'text-stone-500',
  marca: 'text-roxo-600',
  sucesso: 'text-sucesso-600',
  atencao: 'text-atencao-600',
  erro: 'text-erro-600',
  info: 'text-info-600',
};
