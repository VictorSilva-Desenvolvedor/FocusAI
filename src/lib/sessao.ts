import type { Usuario } from '@/types';

/**
 * A ponte entre quem entrou e o perfil que as telas usam.
 *
 * O Supabase autentica e diz o papel; os dados das telas ainda são a seed
 * local. São dois mundos de identificador: o perfil que volta do banco traz
 * `id` e `advogado_id` em uuid (`a0000000-…-0001`), e a seed usa slug
 * (`u-advogado`, `adv-prev-facil-advogados`).
 *
 * Usar o perfil remoto direto nas telas não daria erro nenhum: o advogado
 * entraria num painel vazio, com console limpo, porque `advogado_id` não casa
 * com carteira nenhuma da seed. É a mesma falha silenciosa de elo de seed
 * quebrado que o acento no `identificador()` já custou uma vez.
 *
 * Enquanto os dados forem locais, então, o remoto responde *quem entrou* e a
 * seed responde *o que essa pessoa enxerga*. Quando os contextos passarem a ler
 * do banco, esta função sai inteira — não há nada aqui para migrar.
 */

/**
 * `ACC-R08` — sessão que não resolve num perfil fecha, nunca abre.
 *
 * Devolver um perfil qualquer no lugar do que faltou é o erro que `API-R05`
 * descreve: papel indefinido não está em lista nenhuma, e todo guard que
 * bloqueia *por papel* deixaria de bloquear exatamente quando mais importa.
 * `null` aqui vira estado bloqueado no provider.
 */
export function perfilLocal(remoto: Usuario, usuarios: Usuario[]): Usuario | null {
  // Conta desativada não entra, do mesmo jeito que não entrava no seletor.
  const disponiveis = usuarios.filter((u) => u.status !== 'inativo');
  const email = remoto.email.trim().toLowerCase();

  const porEmail = disponiveis.find((u) => u.email.trim().toLowerCase() === email);
  // O papel do banco é a autoridade. Seed com o mesmo e-mail e outro papel é
  // divergência de dado, e seguir por ela daria acesso que o banco não concedeu.
  const base =
    porEmail && porEmail.role === remoto.role
      ? porEmail
      : disponiveis.find((u) => u.role === remoto.role);

  if (!base) return null;

  /*
   * A identidade é sempre a do banco; da seed vem só o que a maquete precisa
   * para operar — o id que `ACC-R03` compara, as permissões e a carteira.
   *
   * Sem isso, quem entra por uma conta que não tem par na seed aparece com o
   * nome de outra pessoa na barra superior. É o caso de qualquer conta nominal
   * nova: ela cai no primeiro seed do mesmo papel, e o papel está certo, mas o
   * nome não. Errar quem está logado é pior que errar um número na tela.
   */
  return {
    ...base,
    nome: remoto.nome,
    email: remoto.email,
    avatar_iniciais: remoto.avatar_iniciais,
  };
}
