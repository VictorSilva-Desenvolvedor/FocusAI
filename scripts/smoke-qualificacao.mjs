/**
 * Smoke da qualificação por voz. Escreve no banco — só roda no de teste.
 *
 *   FOCUS_AMBIENTE=teste npm run smoke:qualificacao
 *
 * Ao contrário de `smoke:rls`, que só provoca recusas e não deixa rastro, este
 * grava ligação e muda o estado do lead. Como `INV-13` torna o registro da
 * qualificação imutável, o que ele escreve não se apaga — daí a recusa em rodar
 * fora do ambiente onde `npm run banco:reiniciar` devolve tudo.
 *
 * O que se afirma aqui é o que nenhuma tela alcança: que o evento da ferramenta
 * de voz vira estado no banco pelas regras do banco, e não pelo que o corpo do
 * webhook mandar (`API-R14`).
 */
import { createClient } from '@supabase/supabase-js';
import { lerSegredos, exigir } from './segredos.mjs';

if (process.env.FOCUS_AMBIENTE !== 'teste') {
  console.error('Este smoke escreve e o que ele grava não se apaga (INV-13).');
  console.error('Rode com FOCUS_AMBIENTE=teste, contra o banco que `banco:reiniciar` devolve.');
  process.exit(1);
}

const ARQUIVO = '.secrets/supabase-teste.env';
const env = lerSegredos(ARQUIVO);
exigir(env, ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'], ARQUIVO);

const servico = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const resultados = [];
const ok = (n, cond, extra = '') =>
  resultados.push(`${cond ? 'PASS' : 'FALHA'}  ${n}${extra ? ` — ${extra}` : ''}`);

// Da seed: `novo`, sem nenhuma ligação ainda.
const DENISE = 'b0000000-0000-4000-8000-00000000000e';
// Da seed: já vendido ao Prev Fácil.
const VENDIDO = 'b0000000-0000-4000-8000-000000000008';

const chamar = (args) => servico.rpc('registrar_qualificacao', args);
const lead = async (id) =>
  (await servico.from('leads').select('status, resumo_qualificacao, tem_gravacao').eq('id', id).single()).data;
const ligacoes = async (id) =>
  (await servico.from('ligacoes').select('tentativa, resultado').eq('lead_id', id)).data ?? [];

// --- primeira tentativa: não atendeu ---------------------------------------
const t1 = await chamar({
  p_lead_id: DENISE, p_chamada_id: 'call-t1',
  p_resultado: 'nao_atendeu', p_motivo_encerramento: 'customer-did-not-answer',
});
ok('primeira tentativa é registrada', t1.data?.ok === true && t1.data?.tentativa === 1, JSON.stringify(t1.data));
ok('lead que não atendeu não vai para qualificado', (await lead(DENISE)).status === 'nao_atendeu');

// --- API-R13: o mesmo evento chega de novo ----------------------------------
const repetido = await chamar({
  p_lead_id: DENISE, p_chamada_id: 'call-t1', p_resultado: 'nao_atendeu',
});
ok('evento repetido é aceito sem gravar de novo', repetido.data?.repetido === true, JSON.stringify(repetido.data));
ok('e não vira segunda tentativa', (await ligacoes(DENISE)).length === 1, `${(await ligacoes(DENISE)).length} ligação(ões)`);

// --- QUA-R02: três tentativas e o lead sai da fila --------------------------
await chamar({ p_lead_id: DENISE, p_chamada_id: 'call-t2', p_resultado: 'nao_atendeu' });
const meio = await lead(DENISE);
ok('na segunda tentativa ainda continua na fila', meio.status === 'nao_atendeu', meio.status);

const t3 = await chamar({ p_lead_id: DENISE, p_chamada_id: 'call-t3', p_resultado: 'nao_atendeu' });
ok('QUA-R02 · a terceira sem contato encerra o lead', (await lead(DENISE)).status === 'expirado', `tentativa ${t3.data?.tentativa}`);

// --- o caminho bom: qualificado, com gravação -------------------------------
const CLEBER = 'b0000000-0000-4000-8000-00000000000f';
const bom = await chamar({
  p_lead_id: CLEBER, p_chamada_id: 'call-ok',
  p_resultado: 'qualificado',
  p_resumo: 'Confirmou contrato de consignado ativo e disse que o advogado liga.',
  p_gravacao_url: 'https://exemplo.invalido/gravacao.wav',
  p_duracao_segundos: 214.5,
});
const depois = await lead(CLEBER);
ok('qualificado leva o lead a qualificado', bom.data?.ok === true && depois.status === 'qualificado', depois.status);
ok('o resumo da ligação vira o resumo do lead', /consignado ativo/.test(depois.resumo_qualificacao ?? ''));
ok('QUA-R03 · a gravação é registrada', depois.tem_gravacao === true);

/*
 * O lead qualificado NÃO entra no catálogo: falta a hora marcada, e é ela que
 * o advogado compra. Enquanto a Helena agendar só no Google Calendar, este é o
 * teto — e é o que a pergunta em aberto sobre `reuniao_em` resolve.
 */
ok('qualificado ainda não é agendado', depois.status !== 'agendado');

// --- INV-13: lead vendido não tem a qualificação reescrita ------------------
const emVendido = await chamar({
  p_lead_id: VENDIDO, p_chamada_id: 'call-vendido', p_resultado: 'qualificado',
  p_resumo: 'tentativa de reescrever o que respondeu perante a OAB',
});
ok('INV-13 · lead vendido recusa nova qualificação', emVendido.data?.ok === false, emVendido.data?.motivo);

// --- INV-13: a ligação registrada é imutável --------------------------------
const { data: umaLigacao } = await servico.from('ligacoes').select('id').eq('chamada_id', 'call-ok').single();
const { error: tentouAlterar } = await servico
  .from('ligacoes').update({ resumo: 'reescrito' }).eq('id', umaLigacao.id);
ok('INV-13 · nem com privilégio elevado a ligação é alterada', !!tentouAlterar, tentouAlterar?.message?.slice(0, 46));

// --- lead inexistente --------------------------------------------------------
const inexistente = await chamar({
  p_lead_id: '00000000-0000-4000-8000-000000000000', p_chamada_id: 'call-fantasma',
  p_resultado: 'qualificado',
});
ok('lead inexistente é recusado com motivo', inexistente.data?.ok === false, inexistente.data?.motivo);

// --- o agendamento: o que transforma lead em produto ------------------------

const agendar = (args) => servico.rpc('registrar_agendamento', args);
const daqui = (dias) => new Date(Date.now() + dias * 86_400_000).toISOString();

/*
 * LED-R01 — o Cleber foi qualificado acima, mas a seed o deixou com só um dos
 * dois filtros de juros abusivos respondido. Publicar assim anunciaria caso que
 * o advogado recusa na primeira leitura.
 */
const semFiltro = await agendar({
  p_lead_id: CLEBER, p_chamada_id: 'call-ok', p_reuniao_em: daqui(3),
});
ok('LED-R01 · não publica com filtro de elegibilidade pendente',
  semFiltro.data?.ok === false, semFiltro.data?.motivo?.slice(0, 60));

await servico.from('leads')
  .update({ elegibilidade: { tem_contrato: true, confirmou_agendamento: true } })
  .eq('id', CLEBER);

// Horário no passado é quase sempre fuso trocado, e o lead entraria já vencido.
const noPassado = await agendar({
  p_lead_id: CLEBER, p_chamada_id: 'call-passado', p_reuniao_em: daqui(-1),
});
ok('reunião no passado é recusada', noPassado.data?.ok === false, noPassado.data?.motivo);

const marcou = await agendar({
  p_lead_id: CLEBER, p_chamada_id: 'call-ok', p_reuniao_em: daqui(3),
});
const publicado = await lead(CLEBER);
ok('com os filtros confirmados, o lead é publicado', marcou.data?.ok === true && publicado.status === 'agendado', publicado.status);
ok('CRE-R03 · o preço é congelado na publicação',
  marcou.data?.custo_creditos === 4 && Number(marcou.data?.preco_avulso) === 350,
  `${marcou.data?.custo_creditos} créditos · R$ ${marcou.data?.preco_avulso}`);

/*
 * A prova de que a cadeia fecha: um advogado de SP que atua em juros abusivos
 * enxerga este lead no catálogo. É a mesma política que o smoke:rls exerce, do
 * lado de quem compra.
 */
const { createClient: criar } = await import('@supabase/supabase-js');
const { readFileSync } = await import('node:fs');
const publicavel = readFileSync('.env.teste.local', 'utf8')
  .match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.+)/)[1].trim();
const gomes = criar(env.SUPABASE_URL, publicavel, { auth: { persistSession: false } });
await gomes.auth.signInWithPassword({ email: 'advogado2@focus.ai', password: env.SUPABASE_SENHA_TESTE });
const { data: catalogo } = await gomes.from('leads').select('id, status').eq('id', CLEBER);
ok('o lead agendado aparece no catálogo do advogado da tese e da região',
  (catalogo ?? []).length === 1, `${(catalogo ?? []).length} linha(s)`);

// INV-10 — reagendar lead vendido não o recoloca no catálogo.
const vendidoDeNovo = await agendar({
  p_lead_id: VENDIDO, p_chamada_id: 'call-revender', p_reuniao_em: daqui(5),
});
ok('INV-10 · lead vendido não volta ao catálogo por reagendamento',
  vendidoDeNovo.data?.ok === false, vendidoDeNovo.data?.motivo);

console.log(resultados.join('\n'));
const falhas = resultados.filter((r) => r.startsWith('FALHA')).length;
console.log(`\n${resultados.length - falhas}/${resultados.length} passaram`);
process.exit(falhas > 0 ? 1 : 0);
