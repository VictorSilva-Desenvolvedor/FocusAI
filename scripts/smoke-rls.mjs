/**
 * Smoke test da política de acesso. Roda contra o Supabase, não contra o
 * navegador — e é essa a diferença que importa.
 *
 * Os outros três smokes exercitam a tela: provam que a máscara aparece, que o
 * botão some, que o aviso surge. Nenhum deles alcança a pergunta que decide o
 * sistema, que é se o dado sai do banco para quem não devia. `contatoVisivel()`
 * pode estar perfeito e o telefone chegar mesmo assim, escondido só na
 * renderização e visível no devtools.
 *
 * Aqui cada verificação abre uma sessão real, com a chave publicável — a mesma
 * que o navegador usa — e pergunta ao banco.
 *
 * Precisa de `.secrets/supabase.env` e `.env.local` preenchidos, e das contas
 * criadas por `npm run contas:teste`.
 *
 *   npm run smoke:rls                        # projeto de trabalho
 *   FOCUS_AMBIENTE=teste npm run smoke:rls   # banco de teste
 *
 * Não escreve nada que fique: as duas tentativas de escrita existem para serem
 * recusadas, e é a recusa que se afirma. Roda contra qualquer um dos dois.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { lerSegredos, exigir } from './segredos.mjs';

/*
 * `FOCUS_AMBIENTE=teste npm run smoke:rls` roda contra o banco de teste, onde a
 * seed é reaplicável. Sem a variável, segue o projeto de trabalho.
 *
 * A chave publicável é a do navegador de propósito: é ela que faz a política da
 * tabela valer. Com a chave secreta o teste passaria sempre, porque ela ignora
 * a RLS inteira — mediria o oposto do que promete (`API-R02`).
 */
const AMBIENTE = process.env.FOCUS_AMBIENTE ?? null;
const SEGREDOS = AMBIENTE ? `.secrets/supabase-${AMBIENTE}.env` : '.secrets/supabase.env';
const ENV_VITE = AMBIENTE ? `.env.${AMBIENTE}.local` : '.env.local';

const env = lerSegredos(SEGREDOS);
exigir(
  env,
  ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SENHA_TESTE', 'SUPABASE_SENHA_ADMIN'],
  SEGREDOS,
);

if (!existsSync(ENV_VITE)) {
  console.error(`Falta ${ENV_VITE}, que é de onde sai a chave publicável.`);
  console.error('Ela é a do navegador — a mesma que Project Settings › API mostra como publishable.');
  process.exit(1);
}
const achado = readFileSync(ENV_VITE, 'utf8').match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.+)/);
if (!achado) {
  console.error(`Falta VITE_SUPABASE_PUBLISHABLE_KEY em ${ENV_VITE}.`);
  process.exit(1);
}
const PUBLICAVEL = achado[1].trim();

/*
 * As contas, como `contas-de-teste.mjs` as cria hoje.
 *
 * Eram `prevfacil@`, `teixeira@` e `adm@` — nomes que o script de contas deixou
 * de criar quando mudou. No projeto de trabalho elas ainda existem por herança,
 * então o erro só apareceu quando um banco novo foi montado do zero. Nome de
 * conta fixado em dois lugares diverge no primeiro que mudar.
 */
const ADM = 'victorpaulodev@focus.ai';
const CONTA_PREV_FACIL = 'advogado@focus.ai';
const CONTA_TEIXEIRA = 'advogado3@focus.ai';

const PREV_FACIL = 'a0000000-0000-4000-8000-000000000001';
const GOMES = 'a0000000-0000-4000-8000-000000000002';
const LEAD_CATALOGO_GO = 'b0000000-0000-4000-8000-000000000001';
const LEAD_COMPRADO_PREV = 'b0000000-0000-4000-8000-000000000008';
const LEAD_COMPRADO_GOMES = 'b0000000-0000-4000-8000-000000000009';
const LEAD_CATALOGO_SP = 'b0000000-0000-4000-8000-000000000004';
const LEAD_ATENDIDO_PREV = 'b0000000-0000-4000-8000-000000000007';

const resultados = [];
const ok = (n, cond, extra = '') =>
  resultados.push(`${cond ? 'PASS' : 'FALHA'}  ${n}${extra ? ` — ${extra}` : ''}`);

/*
 * A senha vinha de `SUPABASE_SENHA_DEMO`, que não existe em arquivo nenhum: o
 * login era tentado com `undefined` e o provedor respondia "Invalid login
 * credentials" — mensagem que não distingue senha errada de variável vazia, e
 * por isso o defeito passou por conta inexistente durante muito tempo.
 *
 * A conta de administrador tem senha própria; as demais dividem a mesma, igual
 * a `senhaDe()` em entrar.mjs.
 */
async function comoUsuario(email) {
  const cliente = createClient(env.SUPABASE_URL, PUBLICAVEL, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const senha = email === ADM ? env.SUPABASE_SENHA_ADMIN : env.SUPABASE_SENHA_TESTE;
  const { error } = await cliente.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return cliente;
}

// --- LED-R06: o advogado vê o próprio recorte, nunca a carteira alheia -------

const prev = await comoUsuario(CONTA_PREV_FACIL);
const { data: leads } = await prev.from('leads').select('id, tese, uf, comprado_por');

ok('LED-R06 · nenhum lead de outra UF', leads.every((l) => l.uf === 'GO'),
  `ufs vistas: ${[...new Set(leads.map((l) => l.uf))].join(', ')}`);
ok('LED-R06 · nenhum lead de tese fora da atuação',
  leads.every((l) => ['polo_passivo', 'vinculo_empregaticio'].includes(l.tese)));
ok('LED-R06 · nenhum lead da carteira de outro',
  leads.every((l) => !l.comprado_por || l.comprado_por === PREV_FACIL));

// --- INV-11: o contato é o produto ------------------------------------------

const { data: naoComprado } = await prev
  .from('leads_contato').select('telefone').eq('lead_id', LEAD_CATALOGO_GO);
ok('INV-11 · contato de lead não comprado não sai do banco',
  (naoComprado ?? []).length === 0, `${(naoComprado ?? []).length} linha(s)`);

const { data: comprado } = await prev
  .from('leads_contato').select('telefone').eq('lead_id', LEAD_COMPRADO_PREV);
ok('INV-11 · contato do lead comprado é liberado', (comprado ?? []).length === 1);

// --- Isolamento do extrato ---------------------------------------------------

const { data: extratoAlheio } = await prev
  .from('movimentos_creditos').select('id').eq('advogado_id', GOMES);
ok('CRE · extrato de outro advogado não sai', (extratoAlheio ?? []).length === 0);

// --- INV-10: um lead, um comprador ------------------------------------------

const { data: compraAlheia } = await prev.rpc('comprar_lead', { p_lead_id: LEAD_COMPRADO_GOMES });
ok('INV-10 · não compra lead que já tem dono', compraAlheia?.ok === false, compraAlheia?.motivo);

// --- CRE-R04: sem saldo não compra ------------------------------------------

const teixeira = await comoUsuario(CONTA_TEIXEIRA);
const { data: semSaldo } = await teixeira.rpc('comprar_lead', { p_lead_id: LEAD_CATALOGO_SP });
ok('CRE-R04 · saldo zerado recusa a compra', semSaldo?.ok === false, semSaldo?.motivo);

// --- O time interno opera ----------------------------------------------------

const adm = await comoUsuario(ADM);
const { data: todos } = await adm.from('leads').select('id');
const { data: contatos } = await adm.from('leads_contato').select('lead_id');
ok('Time interno enxerga o catálogo inteiro', todos.length > 0, `${todos.length} leads`);
ok('Time interno enxerga os contatos', contatos.length === todos.length);

// --- INV-13: o carimbo da venda é imutável ----------------------------------

const { error: carimbo } = await adm
  .from('leads').update({ comprado_por: GOMES }).eq('id', LEAD_ATENDIDO_PREV);
ok('INV-13 · reescrever o comprador é recusado', !!carimbo, carimbo?.message?.slice(0, 50));

// --- INV-15: o extrato é livro-caixa ----------------------------------------

/*
 * Duas camadas, e elas falham de formas diferentes — por isso as duas são
 * verificadas.
 *
 * Pela sessão comum, quem barra é a política: não existe política de UPDATE em
 * `movimentos_creditos`, então a RLS não casa linha nenhuma e a chamada volta
 * SEM erro, tendo alterado nada. Esperar exceção aqui é o engano fácil: o teste
 * quebra e sugere furo onde o comportamento está correto. O que se afirma é o
 * efeito — o valor continua o mesmo.
 *
 * O gatilho é a camada de baixo, e só entra em cena na escrita privilegiada,
 * que ignora toda política (`API-R03`). É o caso da função de borda que recebe
 * webhook: lá não há RLS para segurar, e sem o gatilho um movimento seria
 * reescrito sem deixar rastro.
 */
const { data: movimento } = await adm
  .from('movimentos_creditos').select('id, creditos').eq('advogado_id', PREV_FACIL).limit(1);
const alvo = movimento[0];

await adm.from('movimentos_creditos').update({ creditos: 999 }).eq('id', alvo.id);
const { data: depois } = await adm
  .from('movimentos_creditos').select('creditos').eq('id', alvo.id).single();
ok('INV-15 · sessão comum não altera o extrato',
  depois.creditos === alvo.creditos, `${alvo.creditos} → ${depois.creditos}`);

const servico = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: comPrivilegio } = await servico
  .from('movimentos_creditos').update({ creditos: 999 }).eq('id', alvo.id);
ok('INV-15 · nem com privilégio elevado o extrato é alterado',
  !!comPrivilegio, comPrivilegio?.message?.slice(0, 50));

console.log(resultados.join('\n'));
const falhas = resultados.filter((r) => r.startsWith('FALHA')).length;
console.log(`\n${resultados.length - falhas}/${resultados.length} passaram`);
process.exit(falhas > 0 ? 1 : 0);
