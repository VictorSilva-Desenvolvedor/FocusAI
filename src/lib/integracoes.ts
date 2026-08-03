import type { IntegracaoAtiva, IntegracaoPendente } from '@/types';

/**
 * O inventário das integrações.
 *
 * **Este arquivo não é seed.** O resto de `src/lib/*Seed.ts` é dado fictício de
 * maquete; aqui cada linha é afirmação sobre o sistema de verdade, e é por isso
 * que nenhuma delas carrega estado de saúde ou último evento. A versão anterior
 * desta tela mostrava cinco integrações "operando" que não existiam, com
 * carimbo de horário calculado a partir do relógio — quem abrisse a tela
 * concluía que a máquina de qualificação estava de pé. Numa tela de integração
 * isso não é dado de maquete inofensivo: é a única tela cujo trabalho é dizer
 * em que se pode confiar.
 *
 * Regra para quem for mexer: **entra em `ATIVAS` quando existir código neste
 * repositório e um comando que verifique**. Até lá, é `PENDENTES`.
 */

/** O que já conversa com o mundo lá fora hoje. */
export const INTEGRACOES_ATIVAS: IntegracaoAtiva[] = [
  {
    id: 'supabase-auth',
    nome: 'Supabase Auth',
    papel:
      'Entrar com e-mail e senha, sessão que sobrevive ao recarregamento e nenhuma rota aberta sem ela',
    onde: 'src/servicos/perfil.ts · src/contexts/AuthContext.tsx',
    verificacao: 'npm run smoke — sem sessão nenhuma tela abre, então todo smoke passa por aqui',
    // ACC-R09 — a mensagem de erro não distingue e-mail inexistente de senha
    // errada: dizer "este e-mail não existe" faria da tela de login um
    // verificador de quem tem conta.
    regras: ['ACC-R08', 'ACC-R09', 'INV-12'],
  },
  {
    id: 'supabase-perfis',
    nome: 'Supabase Postgres — perfis e políticas de acesso',
    papel: 'Papel, permissões e departamento do usuário logado saem do banco, não do navegador',
    onde: 'src/servicos/perfil.ts · supabase/migrations/',
    verificacao: 'npm run smoke:rls — bate as políticas direto contra o banco, sem passar por tela',
    // API-R02 — quem monta a consulta é o cliente, então segurança é da tabela.
    // API-R05 — perfil que não carrega vira sessão bloqueada, nunca papel indefinido.
    regras: ['API-R02', 'API-R05'],
  },
  {
    id: 'publicacao',
    nome: 'Cloudflare Pages, por GitHub Actions',
    papel: 'Publica o pacote a cada push na main, com as variáveis embutidas no build',
    onde: '.github/workflows/publicar.yml',
    verificacao: 'O próprio job: variável ausente derruba a publicação em vez de subir página branca',
    // API-R10 — sem a conferência, o guard de supabase.ts vira throw depois da
    // minificação e o deploy termina verde publicando uma tela em branco.
    // API-R16 — a configuração de build fica versionada, não dentro do painel.
    regras: ['API-R10', 'API-R16'],
  },
];

/**
 * O que falta ligar, na ordem da cadeia: captar → qualificar → agendar →
 * entregar. `plataforma` vem primeiro porque as quatro dependem dela.
 */
export const INTEGRACOES_PENDENTES: IntegracaoPendente[] = [
  {
    id: 'banco-telas',
    nome: 'Banco como fonte dos dados de tela',
    frente: 'plataforma',
    papel: 'Leads, advogados, créditos e usuários lidos do Postgres em vez do navegador',
    semEla:
      'As migrations e a camada de leitura já existem, mas os quatro contextos ainda leem localStorage: limpar a chave do navegador restaura os dados semeados, e dois computadores nunca veem o mesmo catálogo.',
    regras: ['API-R06', 'API-R07'],
  },
  {
    id: 'meta-ads',
    nome: 'Meta Ads',
    frente: 'captar',
    papel: 'Recebe o formulário preenchido e devolve gasto e desempenho por campanha',
    semEla:
      'Nenhum lead entra sozinho e o custo por lead qualificado é digitado à mão — que é justamente o número que decide se a campanha continua no ar.',
    regras: ['API-R13', 'API-R14'],
  },
  {
    id: 'google-ads',
    nome: 'Google Ads',
    frente: 'captar',
    papel: 'Segunda fonte de captação, para quem já procura a solução em vez de descobri-la no feed',
    semEla: 'A captação fica presa a uma plataforma só, com o risco de conta que isso carrega.',
    regras: ['API-R13'],
  },
  {
    id: 'voz',
    nome: 'Ferramenta de voz (SDR de IA)',
    frente: 'qualificar',
    papel: 'Liga, conduz o roteiro da tese e devolve o resultado da qualificação',
    semEla:
      'É a máquina do meio: sem ela não existe lead qualificado, e lead qualificado é o produto que o advogado compra. Nasce com deduplicação por (identificador, tipo de evento) — evento repetido vira segunda tentativa e o lead é descartado por excesso — e com a reconciliação junto.',
    regras: ['QUA-R01', 'QUA-R02', 'API-R12', 'API-R13'],
  },
  {
    id: 'gravacao',
    nome: 'Armazenamento privado da gravação',
    frente: 'qualificar',
    papel: 'Guarda o áudio da qualificação em balde privado, servido por URL assinada',
    semEla:
      'Não há como provar como o cliente foi direcionado, que é o que responde perante a OAB. Balde público serve URL permanente para quem tiver o endereço: gravação de qualificação não vai para lá.',
    regras: ['INV-13', 'QUA-R03', 'API-R15'],
  },
  {
    id: 'agenda',
    nome: 'Agenda de reuniões',
    frente: 'agendar',
    papel: 'Marca o horário da consulta e devolve confirmação, remarcação e falta',
    semEla:
      'O terceiro elo da cadeia não fecha. Como o provedor não reenvia evento perdido, a rotina de reconciliação entra no mesmo commit — senão a reunião agendada some do painel e ninguém fica sabendo até o advogado reclamar.',
    regras: ['API-R12', 'API-R14'],
  },
  {
    id: 'pagamento',
    nome: 'Provedor de pagamento',
    frente: 'entregar',
    papel: 'Confirma o pagamento do pacote — é o único gatilho que credita',
    semEla:
      'O botão de comprar pacote está desabilitado de propósito. O caminho interno para destravar alguém é o ajuste manual, que exige permissão e motivo e aparece no extrato como tal; baixa manual não credita.',
    regras: ['INV-14', 'CRE-R06'],
  },
  {
    id: 'whatsapp',
    nome: 'WhatsApp',
    frente: 'entregar',
    papel: 'Avisa o advogado quando entra lead novo na tese e região que ele segue',
    semEla:
      'O painel do advogado promete o aviso em três lugares e ele não sai. A etapa aparece aqui exatamente por isso: chave vazia que faz a chamada ser pulada some sem erro, sem aviso ao usuário e sem registro de que algo foi ignorado.',
    regras: ['API-R10'],
  },
  {
    id: 'email',
    nome: 'E-mail transacional',
    frente: 'entregar',
    papel: 'Leva o convite de acesso ao advogado liberado e o link de recuperação de senha',
    semEla:
      'A conta já nasce da liberação de acesso, mas o e-mail com o acesso não sai: hoje conta se cria por script, e trocar senha é pelo painel do provedor.',
    regras: ['ADV-R09', 'INV-12'],
  },
];
