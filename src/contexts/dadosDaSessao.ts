import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { aoMudarSessao } from '@/src/servicos/perfil';

/**
 * Carrega uma lista do banco **depois** que existe sessão, e recarrega quando
 * ela muda.
 *
 * Existe por causa de uma falha que não dá erro nenhum. Os provedores de dados
 * são pais do `AuthProvider` em `App.tsx` — o roteador precisa envolver a tela
 * de login, e o provedor de sessão vive dentro dele. Então eles montam e
 * consultam **antes de haver sessão**: `auth.uid()` é nulo, `papel_atual()`
 * devolve NULL, nenhuma política casa e o PostgREST responde `200` com `[]`.
 *
 * É `API-R05` funcionando como projetado — falha de identificação fecha em vez
 * de abrir. O problema é a consulta única: quando o login termina, ninguém
 * pergunta de novo. O sintoma é catálogo vazio com console limpo, que o
 * `CLAUDE.md` já registra como assinatura de elo quebrado, e que passa por
 * "não há leads" em vez de "não perguntei na hora certa".
 *
 * Sair também importa: sem limpar, os dados do último login ficariam na tela
 * durante o logout, e a próxima pessoa a entrar veria o recorte de outra.
 */
export interface DadosDaSessao<T> {
  dados: T[];
  carregando: boolean;
  erro: string | null;
  /**
   * Recarrega e **devolve** a lista.
   *
   * Devolver importa: quem acabou de gravar precisa da linha atualizada agora,
   * e o estado do React só chega no render seguinte. Sem o retorno, o chamador
   * leria a versão anterior e concluiria que a escrita não valeu.
   */
  recarregar: () => Promise<T[]>;
  /** Alteração local, de sessão. Some no próximo `recarregar`. */
  definir: (proximo: (atual: T[]) => T[]) => void;
}

export function useDadosDaSessao<T>(
  carregar: () => Promise<T[]>,
  rotulo: string,
): DadosDaSessao<T> {
  const [dados, setDados] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async (): Promise<T[]> => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setDados([]);
      setErro(null);
      setCarregando(false);
      return [];
    }

    setCarregando(true);
    try {
      const lista = await carregar();
      setDados(lista);
      setErro(null);
      return lista;
    } catch (e) {
      /*
       * `API-R17` — a mensagem que a tela mostra nunca é `e.message` puro.
       * Erro de rede do navegador ("Failed to fetch") ou de Postgres chega em
       * inglês e sem contexto — não é o que um advogado lê e entende. O texto
       * técnico vai só para o console; quem usa a tela lê uma frase fixa.
       */
      const mensagem = `Falha ao carregar ${rotulo}. Verifique sua conexão.`;
      setErro(mensagem);
      /*
       * `API-R10` — configuração ou consulta que falha não pode virar silêncio.
       * O console é o que faz `npm run shot` e o smoke falharem em vez de
       * capturarem uma tela vazia de aparência saudável.
       */
      console.error(`[${rotulo}]`, e instanceof Error ? e.message : e);
      return [];
    } finally {
      setCarregando(false);
    }
  }, [carregar, rotulo]);

  useEffect(() => {
    /*
     * `onAuthStateChange` dispara na inscrição com a sessão corrente, então não
     * há chamada manual antes — ela renderia duas consultas idênticas na carga.
     */
    return aoMudarSessao(() => {
      void recarregar();
    });
  }, [recarregar]);

  const definir = useCallback((proximo: (atual: T[]) => T[]) => {
    setDados((atual) => proximo(atual));
  }, []);

  return { dados, carregando, erro, recarregar, definir };
}
