/**
 * Cria (ou atualiza) uma conta de acesso por papel, para conferir a matriz de
 * acesso entrando como cada nível.
 *
 *   npm run contas:teste
 *
 * São contas de desenvolvimento e nada além disso: senha curta, previsível e
 * igual para todo mundo. Nenhuma pode existir num projeto que atenda usuário de
 * verdade — e é por isso que a senha vem de `.secrets/supabase.env` em vez de
 * ficar escrita aqui, onde iria para o Git.
 *
 * `INV-12` continua de pé. O caminho de produção para nascer uma conta de
 * advogado é a liberação de acesso, com a inscrição da OAB conferida; este
 * script é o atalho do ambiente de desenvolvimento, roda com privilégio elevado
 * fora do navegador (`API-R03`) e não existe no aplicativo.
 *
 * Idempotente: rodar de novo reaplica a senha e o perfil, sem duplicar conta.
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

for (const chave of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SENHA_TESTE', 'SUPABASE_SENHA_ADMIN']) {
  if (!env[chave]) {
    console.error(`Falta ${chave} em .secrets/supabase.env.`);
    process.exit(1);
  }
}

/*
 * Os advogados semeados por supabase/migrations/0004_seed.sql. A restrição
 * `vinculo_coerente_com_papel` exige vínculo para o papel externo e o proíbe
 * para os internos — advogado sem carteira não enxerga nada e não compra nada.
 */
const PREV_FACIL = 'a0000000-0000-4000-8000-000000000001';
const GOMES = 'a0000000-0000-4000-8000-000000000002';
const TEIXEIRA = 'a0000000-0000-4000-8000-000000000003';

const TESTE = env.SUPABASE_SENHA_TESTE;

/*
 * Nome, departamento e permissões espelham `USUARIOS_SEED` de
 * src/lib/mockData.ts, porque é a seed local que ainda alimenta as telas: o
 * Supabase autentica e diz o papel, e o perfil é casado com a seed pelo
 * e-mail. Divergir aqui faria a conta entrar com um nome e operar com outro.
 */
const CONTAS = [
  {
    email: 'victorpaulodev@focus.ai',
    senha: env.SUPABASE_SENHA_ADMIN,
    nome: 'Victor Paulo',
    papel: 'adm',
    departamento: 'Tecnologia',
    iniciais: 'VP',
    permissoes: [
      'modulo:campanhas',
      'modulo:conformidade',
      'modulo:qualificacao',
      'modulo:integracoes',
      'tese:definir_preco',
      'advogado:liberar_acesso',
      'lead:aprovar_devolucao',
      'credito:conciliar_pagamento',
      'assistente:financeiro',
    ],
  },
  {
    email: 'gerente@focus.ai',
    senha: TESTE,
    nome: 'Marina Alencar',
    papel: 'gerente',
    departamento: 'Operações',
    iniciais: 'MA',
    permissoes: [
      'modulo:integracoes',
      'tese:definir_preco',
      'advogado:liberar_acesso',
      'lead:aprovar_devolucao',
    ],
  },
  {
    email: 'gestortrafego@focus.ai',
    senha: TESTE,
    nome: 'Bruno Tavares',
    papel: 'gestor_trafego',
    departamento: 'Tráfego',
    iniciais: 'BT',
    permissoes: ['modulo:campanhas', 'modulo:integracoes'],
  },
  {
    email: 'criativo@focus.ai',
    senha: TESTE,
    nome: 'Lia Fontes',
    papel: 'criativo',
    departamento: 'Criação',
    iniciais: 'LF',
    permissoes: [],
  },
  {
    email: 'analistaconformidade@focus.ai',
    senha: TESTE,
    nome: 'Rafaela Costa',
    papel: 'analista_conformidade',
    // CNF-R21 — liberar com ressalva é gate por departamento, não por papel.
    // Sem `Conformidade` aqui a permissão fica marcada e sem efeito.
    departamento: 'Conformidade',
    iniciais: 'RC',
    permissoes: ['modulo:conformidade', 'conformidade:liberar_com_ressalva'],
  },
  {
    email: 'operadoria@focus.ai',
    senha: TESTE,
    nome: 'Tiago Bezerra',
    papel: 'operador_ia',
    departamento: 'Qualificação',
    iniciais: 'TB',
    permissoes: ['modulo:qualificacao'],
  },
  {
    email: 'closer@focus.ai',
    senha: TESTE,
    nome: 'Diego Martins',
    papel: 'closer',
    departamento: 'Comercial',
    iniciais: 'DM',
    permissoes: ['advogado:liberar_acesso'],
  },
  {
    email: 'sdr@focus.ai',
    senha: TESTE,
    nome: 'Tainá Moreira',
    papel: 'sdr',
    departamento: 'Comercial',
    iniciais: 'TM',
    permissoes: [],
  },
  {
    email: 'cs@focus.ai',
    senha: TESTE,
    nome: 'Júlia Andrade',
    papel: 'cs',
    departamento: 'Customer Success',
    iniciais: 'JA',
    permissoes: ['lead:aprovar_devolucao'],
  },
  {
    email: 'financeiro@focus.ai',
    senha: TESTE,
    nome: 'Paula Reis',
    papel: 'financeiro',
    departamento: 'Financeiro',
    iniciais: 'PR',
    permissoes: ['credito:conciliar_pagamento', 'lead:aprovar_devolucao'],
  },

  /*
   * Três advogados, não um. `LED-R06` só é demonstrável com mais de uma
   * carteira — uma sozinha não prova isolamento nenhum — e o saldo zerado do
   * Teixeira é o caso que prova `CRE-R04`.
   */
  {
    email: 'advogado@focus.ai',
    senha: TESTE,
    nome: 'Prev Fácil Advogados',
    papel: 'advogado',
    departamento: null,
    iniciais: 'PA',
    permissoes: [],
    advogado_id: PREV_FACIL,
  },
  {
    email: 'advogado2@focus.ai',
    senha: TESTE,
    nome: 'Gomes & Cia',
    papel: 'advogado',
    departamento: null,
    iniciais: 'GC',
    permissoes: [],
    advogado_id: GOMES,
  },
  {
    email: 'advogado3@focus.ai',
    senha: TESTE,
    nome: 'Teixeira Bancário',
    papel: 'advogado',
    departamento: null,
    iniciais: 'TB',
    permissoes: [],
    advogado_id: TEIXEIRA,
  },
];

/*
 * Conta nominal de administrador — pessoa real, não papel de teste.
 *
 * Nome, e-mail e senha vêm de `.secrets/supabase.env` e não aparecem em lugar
 * nenhum deste arquivo, que é versionado. A regra do repositório é a mesma que
 * vale para seed: dado real fica fora do Git. Variável ausente, conta pulada —
 * quem clonar o projeto sem o `.secrets` recebe só as contas de teste.
 */
const PERMISSOES_ADM = CONTAS[0].permissoes;

if (env.FOCUS_ADM_EMAIL && env.FOCUS_ADM_SENHA && env.FOCUS_ADM_NOME) {
  const nome = env.FOCUS_ADM_NOME.trim();
  const partes = nome.split(/\s+/);
  // Nome sem sobrenome vira uma letra só, não a mesma letra duas vezes.
  const iniciais = (partes[0][0] + (partes.length > 1 ? partes.at(-1)[0] : '')).toUpperCase();

  CONTAS.push({
    email: env.FOCUS_ADM_EMAIL.trim().toLowerCase(),
    senha: env.FOCUS_ADM_SENHA,
    nome,
    papel: 'adm',
    // A liderança da empresa não é do time de tecnologia; o departamento não
    // decide acesso (isso é papel + permissão), mas aparece no menu do usuário.
    departamento: 'Operações',
    iniciais,
    permissoes: PERMISSOES_ADM,
  });
}

const servico = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/*
 * O identificador de `auth.users` só é alcançável por e-mail depois de listar:
 * não há busca por e-mail na API de administração. `API-R07` vale aqui também —
 * o corte é silencioso, então a página é explícita e a listagem, conferida.
 */
const { data: lista, error: erroLista } = await servico.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (erroLista) {
  console.error('Falha ao listar as contas:', erroLista.message);
  process.exit(1);
}
if (lista.users.length === 1000) {
  console.error('Mais de 1000 contas: a listagem foi truncada e o script não pode confiar nela.');
  process.exit(1);
}

const porEmail = new Map(lista.users.map((u) => [u.email?.toLowerCase(), u.id]));

let criadas = 0;
let atualizadas = 0;

for (const conta of CONTAS) {
  const existente = porEmail.get(conta.email);
  let id = existente;

  if (existente) {
    const { error } = await servico.auth.admin.updateUserById(existente, {
      password: conta.senha,
      email_confirm: true,
    });
    if (error) {
      console.error(`  ✗ ${conta.email}: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    atualizadas += 1;
  } else {
    // `mailer_autoconfirm` está desligado no projeto: sem confirmar aqui, a
    // conta nasce esperando um e-mail que ninguém vai enviar e o login recusa.
    const { data, error } = await servico.auth.admin.createUser({
      email: conta.email,
      password: conta.senha,
      email_confirm: true,
    });
    if (error) {
      console.error(`  ✗ ${conta.email}: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    id = data.user.id;
    criadas += 1;
  }

  const { error: erroPerfil } = await servico.from('perfis').upsert(
    {
      id,
      nome: conta.nome,
      email: conta.email,
      papel: conta.papel,
      departamento: conta.departamento,
      permissoes: conta.permissoes,
      advogado_id: conta.advogado_id ?? null,
      avatar_iniciais: conta.iniciais,
      // `carregarSessao` devolve conta inativa como bloqueada, e é o correto.
      status: 'ativo',
    },
    { onConflict: 'id' },
  );

  if (erroPerfil) {
    console.error(`  ✗ perfil de ${conta.email}: ${erroPerfil.message}`);
    process.exitCode = 1;
    continue;
  }

  console.log(`  ${existente ? '·' : '+'} ${conta.papel.padEnd(22)} ${conta.email}`);
}

console.log(`\n${criadas} criada(s), ${atualizadas} atualizada(s), ${CONTAS.length} no total.`);
console.log('As senhas estão em .secrets/supabase.env.');
