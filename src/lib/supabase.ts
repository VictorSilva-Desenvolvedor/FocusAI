import { createClient } from '@supabase/supabase-js';

/**
 * O cliente do navegador.
 *
 * `API-R01` — aqui só existe a chave publicável. Ela é feita para ser lida por
 * qualquer visitante: toda a autoridade vem do JWT do usuário logado, avaliado
 * pela política de acesso da tabela (`API-R02`). Segredo de servidor não passa
 * por este arquivo, nem por nenhum outro que o Vite empacote — qualquer
 * variável com prefixo `VITE_` entra no pacote publicado.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const chavePublicavel = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * `API-R10` — configuração ausente não pode virar silêncio.
 *
 * O padrão fácil seria seguir com um cliente inerte e deixar cada tela mostrar
 * lista vazia. O resultado é uma aplicação que parece funcionar e não tem dado
 * nenhum, com o motivo real três camadas abaixo. Falhar na carga aponta o
 * problema onde ele está.
 */
if (!url || !chavePublicavel) {
  throw new Error(
    'Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Copie .env.example para .env.local e preencha.',
  );
}

export const supabase = createClient(url, chavePublicavel, {
  auth: {
    // INV-12 — não existe cadastro livre. A conta nasce de uma liberação que
    // passou pelo funil, com a inscrição da OAB conferida por alguém do time.
    // O cliente nunca chama `signUp`; quem cria usuário é a função de borda.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
