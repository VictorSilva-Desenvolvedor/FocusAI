/**
 * Envia para a Conversions API da Meta os eventos que estão na fila.
 *
 *   npm run meta:eventos
 *
 * A fila é `public.eventos_meta`, alimentada por gatilho quando o lead muda de
 * estado. Este script não decide nada: pede o evento já montado ao banco
 * (`eventos_meta_pendentes`), posta, e carimba o resultado. Toda a regra —
 * normalização de telefone, hash, `action_source`, janela de sete dias — mora
 * na migration, onde se procura por ela pelo ID (`CMP-R01` a `CMP-R06`).
 *
 * É também o lado "reconciliação" de `API-R12`: rodando periodicamente, ele
 * reenvia o que falhou na primeira tentativa. Evento que a Meta já recebeu não
 * conta duas vezes — a deduplicação é por `event_id`, e o `event_id` é estável.
 *
 * Roda fora do navegador, com privilégio elevado (`API-R01`, `API-R03`).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function carregar(arquivo) {
  try {
    return Object.fromEntries(
      readFileSync(arquivo, 'utf8')
        .split('\n')
        .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
        .map((l) => {
          const i = l.indexOf('=');
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );
  } catch {
    console.error(`Falta ${arquivo}. Veja .secrets/LEIAME.md.`);
    process.exit(1);
  }
}

const supabaseEnv = carregar('.secrets/supabase.env');
const metaEnv = carregar('.secrets/meta.env');

for (const [chave, arquivo] of [
  ['SUPABASE_URL', '.secrets/supabase.env'],
  ['SUPABASE_SECRET_KEY', '.secrets/supabase.env'],
]) {
  if (!supabaseEnv[chave]) {
    console.error(`Falta ${chave} em ${arquivo}.`);
    process.exit(1);
  }
}

for (const chave of ['META_PIXEL_ID', 'META_CAPI_TOKEN']) {
  if (!metaEnv[chave]) {
    console.error(`Falta ${chave} em .secrets/meta.env.`);
    process.exit(1);
  }
}

/*
 * Versão presa de propósito. Chamada sem versão cai na mais antiga ainda no ar,
 * que é justamente a que vai sair — e sair sem aviso, no meio de uma campanha.
 * Confira a versão corrente no Gerenciador de Eventos antes de subir.
 */
const VERSAO = metaEnv.META_GRAPH_VERSAO || 'v23.0';
const ENDERECO = `https://graph.facebook.com/${VERSAO}/${metaEnv.META_PIXEL_ID}/events`;

const supabase = createClient(supabaseEnv.SUPABASE_URL, supabaseEnv.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const { data: vencidos, error: erroVencidos } = await supabase.rpc(
  'abandonar_eventos_meta_vencidos',
);

if (erroVencidos) {
  console.error('Falha ao varrer os eventos vencidos:', erroVencidos.message);
  process.exit(1);
}

if (vencidos > 0) {
  console.warn(
    `${vencidos} evento(s) abandonado(s) por passar da janela de sete dias (CMP-R04).`,
  );
}

const { data: pendentes, error: erroFila } = await supabase.rpc('eventos_meta_pendentes', {
  p_limite: 200,
});

if (erroFila) {
  console.error('Falha ao ler a fila:', erroFila.message);
  process.exit(1);
}

if (!pendentes?.length) {
  console.log('Nada na fila.');
  process.exit(0);
}

let enviados = 0;
let falhas = 0;

/*
 * Um evento por requisição, embora a API aceite lote. Em lote, uma recusa
 * responde erro para a chamada inteira e não diz qual item foi recusado — e o
 * que se perde é justamente saber qual conversão não chegou. O volume aqui é
 * de dezenas por dia, não de milhares.
 */
for (const pendente of pendentes) {
  const corpo = {
    data: [pendente.payload],
    ...(metaEnv.META_TEST_EVENT_CODE ? { test_event_code: metaEnv.META_TEST_EVENT_CODE } : {}),
  };

  let erro = null;

  try {
    const resposta = await fetch(`${ENDERECO}?access_token=${metaEnv.META_CAPI_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });

    const retorno = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      erro = `HTTP ${resposta.status}: ${retorno?.error?.message ?? JSON.stringify(retorno).slice(0, 200)}`;
    }
  } catch (falha) {
    erro = String(falha.message ?? falha);
  }

  /*
   * Se o carimbo falhar depois de a Meta ter aceitado, a próxima execução
   * reenvia — e a Meta descarta pelo `event_id`. Errar para o lado de reenviar
   * é o lado seguro: o outro perde a conversão em silêncio.
   */
  const { error: erroCarimbo } = await supabase.rpc('marcar_evento_meta', {
    p_id: pendente.id,
    p_erro: erro,
  });

  if (erroCarimbo) {
    console.error(`Evento ${pendente.id} não foi carimbado:`, erroCarimbo.message);
  }

  if (erro) {
    falhas += 1;
    console.error(`${pendente.evento} · lead ${pendente.lead_id}: ${erro}`);
  } else {
    enviados += 1;
    console.log(`${pendente.evento} · lead ${pendente.lead_id}: enviado.`);
  }
}

console.log(`\n${enviados} enviado(s), ${falhas} com falha.`);

/* Falha silenciosa é o que `API-R10` proíbe: quem agenda este script precisa
 * enxergar o erro no código de saída. */
process.exit(falhas > 0 ? 1 : 0);
