import type { FrenteIntegracao, IntegracaoAtiva, IntegracaoPendente } from '@/types';

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
  {
    id: 'banco-telas',
    nome: 'Banco como fonte dos dados de tela',
    papel: 'Leads, advogados, créditos e usuários lidos e gravados no Postgres, não no navegador',
    onde: 'src/servicos/leads.ts · src/servicos/advogados.ts · src/servicos/creditos.ts · src/servicos/usuarios.ts',
    verificacao:
      'Cada leitura pagina sozinha até esgotar a tabela; cada escrita transacional passa por função no banco — comprar, reservar, devolver, mover, ajustar crédito',
    regras: ['API-R06', 'API-R07', 'API-R08'],
  },
  {
    id: 'funcoes-de-borda',
    nome: 'Funções de borda',
    papel: 'Executa o que exige segredo de servidor — hoje, criar login de usuário via Admin API',
    onde: 'supabase/functions/criar-usuario/',
    verificacao: 'A conta nasce com convite pendente em perfis, ou a chamada devolve o motivo da recusa',
    regras: ['API-R01', 'API-R03', 'API-R04', 'INV-12'],
  },
  {
    id: 'n8n',
    nome: 'n8n — orquestrador de automações',
    papel:
      'Amarra os fluxos entre terceiros: webhook do Tally verificado e registrado, chamada da Vapi, resultado da qualificação e do agendamento gravados no banco',
    onde: 'automacoes/n8n/ (exportado) · instância em Coolify',
    verificacao: 'npm run n8n:fluxos exporta o estado vivo dos fluxos para o repositório (API-R16)',
    // API-R13 — a assinatura HMAC do Tally é conferida em cada um dos 5 fluxos
    // de captação antes de extrair qualquer dado do corpo.
    regras: ['API-R13', 'API-R16'],
  },
  {
    id: 'voz',
    nome: 'Ferramenta de voz (SDR de IA)',
    papel: 'Liga, conduz o roteiro da tese e devolve o resultado da qualificação e do agendamento',
    onde: 'Vapi, acionada e correlacionada pelos fluxos do n8n · supabase/migrations/0010_*, 0011_*, 0014_*',
    verificacao:
      'registrar_qualificacao e registrar_agendamento resolvem o lead pelo chamada_id de chamadas_iniciadas, deduplicado — reenvio da Vapi não vira segunda tentativa',
    regras: ['QUA-R01', 'QUA-R02', 'QUA-R04', 'API-R13'],
  },
];

/**
 * O que falta ligar, na ordem da cadeia: captar → qualificar → agendar →
 * entregar. `plataforma` vem primeiro porque as quatro dependem dela — e é
 * onde estava o buraco maior da versão anterior desta lista, que só enxergava
 * os serviços de ponta e ignorava o encanamento que os conecta.
 */
export const INTEGRACOES_PENDENTES: IntegracaoPendente[] = [
  {
    id: 'agendador',
    nome: 'Reconciliação de evento perdido',
    frente: 'plataforma',
    dependencia: 'codigo_proprio',
    papel: 'Roda sozinho o que ninguém aciona: conferir o que a Vapi ou o agendamento não confirmaram',
    semEla:
      'A expiração da reserva de lead já roda sozinha (limpar_reservas_expiradas, a cada 5 minutos por pg_cron) — o que falta é a outra metade: nenhuma reconciliação confere o que ficou para trás quando um provedor de entrega única falha em reenviar. Evento perdido continua perdido até alguém notar pela reclamação.',
    regras: ['API-R12'],
  },
  {
    id: 'tempo-real',
    nome: 'Assinatura ao vivo do catálogo',
    frente: 'plataforma',
    dependencia: 'codigo_proprio',
    papel: 'O catálogo do advogado muda na tela quando um lead é comprado por outro',
    semEla:
      'Dois advogados olham o mesmo lead disponível até alguém recarregar; a compra do segundo falha na função do banco, como deve, mas depois de ele decidir comprar. O filtro de tempo real só aceita igualdade simples, então filtro composto escuta amplo e refina no cliente, com agrupamento de eventos — e há teto por segundo.',
    regras: ['API-R09', 'INV-10'],
  },
  {
    id: 'observabilidade',
    nome: 'Registro de erro e monitoramento',
    frente: 'plataforma',
    dependencia: 'servico_externo',
    papel: 'Guarda o detalhe técnico da falha que o usuário nunca deveria ler',
    semEla:
      'Erro tem mensagem para o usuário e detalhe no log — e hoje não existe log. Webhook que falha, fluxo que engole erro e etapa pulada por falta de chave não deixam rastro em lugar nenhum, então a primeira notícia de que algo quebrou vem de quem reclama.',
    regras: ['API-R11', 'API-R10'],
  },
  {
    id: 'modelo-assistente',
    nome: 'Modelo de IA do assistente interno',
    frente: 'plataforma',
    dependencia: 'servico_externo',
    papel: 'Responde sobre a operação da Focus a partir de consultas pré-definidas e pré-agregadas',
    semEla:
      'O botão do assistente existe na barra e não abre nada. Quando abrir, a chave fica na função de borda e a consulta nunca é livre: pergunta em texto virando SQL cruzaria carteira de advogados diferentes, que é justamente o que o assistente não pode fazer. Serviço pago nasce com cache, teto e registro de custo por uso.',
    regras: ['INV-06', 'ASS-R02', 'API-R01'],
  },
  {
    id: 'meta-ads',
    nome: 'Meta Ads',
    frente: 'captar',
    dependencia: 'servico_externo',
    papel: 'Recebe o formulário preenchido e devolve gasto e desempenho por campanha',
    semEla:
      'Nenhum lead entra sozinho e o custo por lead qualificado é digitado à mão — que é justamente o número que decide se a campanha continua no ar.',
    regras: ['API-R13', 'API-R14'],
  },
  {
    id: 'google-ads',
    nome: 'Google Ads',
    frente: 'captar',
    dependencia: 'servico_externo',
    papel: 'Segunda fonte de captação, para quem já procura a solução em vez de descobri-la no feed',
    semEla: 'A captação fica presa a uma plataforma só, com o risco de conta que isso carrega.',
    regras: ['API-R13'],
  },
  {
    id: 'assinatura-lovable',
    nome: 'Assinatura do webhook de captação do Lovable',
    frente: 'captar',
    dependencia: 'servico_externo',
    papel: 'Provar que quem chama o webhook de captação (Quiz) é o formulário do Lovable, não qualquer um que descobriu a URL',
    semEla:
      'Os 4 webhooks de Quiz (BPC LOAS, Auxílio Acidente, Reconhecimento de Vínculo, Juros Abusivos) chamam o n8n direto do navegador — confirmado pelo cabeçalho Origin de uma execução real, algo como id-preview--...lovable.app. Diferente do Tally, não há assinatura HMAC: um segredo dentro do código que roda no navegador deixa de ser segredo, então copiar o mesmo padrão dos 5 webhooks do Tally daria falsa sensação de segurança, não segurança de verdade. A solução de verdade passa por um backend do Lovable (Edge Function) assinando antes de repassar — depende de saber se esse projeto do Lovable tem backend próprio, o que ainda não foi confirmado.',
    regras: ['API-R13'],
  },
  {
    id: 'meta-eventos',
    nome: 'Fila de eventos da Meta (Conversions API)',
    frente: 'captar',
    dependencia: 'servico_externo',
    papel: 'Envia LeadQualificado, Schedule e Purchase para a Meta otimizar a campanha pelo que vira negócio, não só pelo clique',
    semEla:
      'A fila enche sozinha — enfileirar_eventos_do_lead grava em eventos_meta a cada transição real, e npm run meta:eventos já sabe esvaziá-la —, mas META_CAPI_TOKEN está vazio (.secrets/meta.env), então não há com o que autenticar o envio. Sem agendador chamando o script, também não há quem esvazie sozinho.',
    regras: ['CMP-R01', 'API-R10'],
  },
  {
    id: 'gravacao',
    nome: 'Armazenamento privado da gravação',
    frente: 'qualificar',
    dependencia: 'codigo_proprio',
    papel: 'Guarda o áudio da qualificação em balde privado, servido por URL assinada',
    semEla:
      'Não há como provar como o cliente foi direcionado, que é o que responde perante a OAB. Balde público serve URL permanente para quem tiver o endereço: gravação de qualificação não vai para lá.',
    regras: ['INV-13', 'QUA-R03', 'API-R15'],
  },
  {
    id: 'agenda',
    nome: 'Agenda de reuniões',
    frente: 'agendar',
    dependencia: 'servico_externo',
    papel: 'Marca o horário da consulta e devolve confirmação, remarcação e falta',
    semEla:
      'O terceiro elo da cadeia não fecha. Como o provedor não reenvia evento perdido, a rotina de reconciliação entra no mesmo commit — senão a reunião agendada some do painel e ninguém fica sabendo até o advogado reclamar.',
    regras: ['API-R12', 'API-R14'],
  },
  {
    id: 'pagamento',
    nome: 'Provedor de pagamento',
    frente: 'entregar',
    dependencia: 'servico_externo',
    papel: 'Confirma o pagamento do pacote — é o único gatilho que credita',
    semEla:
      'O botão de comprar pacote está desabilitado de propósito. O caminho interno para destravar alguém é o ajuste manual, que exige permissão e motivo e aparece no extrato como tal; baixa manual não credita.',
    regras: ['INV-14', 'CRE-R06'],
  },
  {
    id: 'whatsapp',
    nome: 'WhatsApp',
    frente: 'entregar',
    dependencia: 'servico_externo',
    papel: 'Avisa o advogado quando entra lead novo na tese e região que ele segue',
    semEla:
      'O painel do advogado promete o aviso em três lugares e ele não sai. A etapa aparece aqui exatamente por isso: chave vazia que faz a chamada ser pulada some sem erro, sem aviso ao usuário e sem registro de que algo foi ignorado.',
    regras: ['API-R10'],
  },
  {
    id: 'email',
    nome: 'E-mail transacional',
    frente: 'entregar',
    dependencia: 'servico_externo',
    papel: 'Leva o convite de acesso ao advogado liberado e o link de recuperação de senha',
    semEla:
      'O convite e a recuperação de senha já chamam a Admin API e o mailer padrão do Supabase entrega os dois — mas esse mailer é de teste, com limite baixo de envios por hora, e não aguenta volume de produção. Falta um provedor SMTP de verdade configurado no projeto.',
    regras: ['ADV-R09', 'INV-12'],
  },
];

/** A ordem em que as frentes são lidas: a plataforma sustenta os quatro elos. */
const ORDEM_DAS_FRENTES: FrenteIntegracao[] = [
  'plataforma',
  'captar',
  'qualificar',
  'agendar',
  'entregar',
];

/**
 * Agrupa as pendentes por frente, na ordem da cadeia.
 *
 * Frente sem pendência nenhuma não vira grupo vazio — quando a última cair, o
 * título dela some junto em vez de virar uma seção órfã na tela.
 */
export function pendentesPorFrente(): { frente: FrenteIntegracao; itens: IntegracaoPendente[] }[] {
  return ORDEM_DAS_FRENTES.map((frente) => ({
    frente,
    itens: INTEGRACOES_PENDENTES.filter((integracao) => integracao.frente === frente),
  })).filter((grupo) => grupo.itens.length > 0);
}
