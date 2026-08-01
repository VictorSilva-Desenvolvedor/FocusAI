const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatarData(iso: string | null): string {
  if (!iso) return '—';
  return dataCurta.format(new Date(iso));
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return '—';
  return dataHora.format(new Date(iso));
}

/** "há 3 dias", "agora há pouco". Sempre no passado. */
export function tempoRelativo(iso: string | null): string {
  if (!iso) return 'nunca';

  const diffMs = Date.now() - new Date(iso).getTime();
  const minutos = Math.floor(diffMs / 60_000);

  if (minutos < 1) return 'agora há pouco';
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;

  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;

  const anos = Math.floor(meses / 12);
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}
