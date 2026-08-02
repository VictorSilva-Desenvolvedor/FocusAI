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
 * de demonstração criadas.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.secrets/supabase.env', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const PUBLICAVEL = readFileSync('.env.local', 'utf8')
  .match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.+)/)[1]
  .trim();

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

async function comoUsuario(email) {
  const cliente = createClient(env.SUPABASE_URL, PUBLICAVEL, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await cliente.auth.signInWithPassword({
    email,
    password: env.SUPABASE_SENHA_DEMO,
  });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return cliente;
}

// --- LED-R06: o advogado vê o próprio recorte, nunca a carteira alheia -------

const prev = await comoUsuario('prevfacil@focus.ai');
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

const teixeira = await comoUsuario('teixeira@focus.ai');
const { data: semSaldo } = await teixeira.rpc('comprar_lead', { p_lead_id: LEAD_CATALOGO_SP });
ok('CRE-R04 · saldo zerado recusa a compra', semSaldo?.ok === false, semSaldo?.motivo);

// --- O time interno opera ----------------------------------------------------

const adm = await comoUsuario('adm@focus.ai');
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
