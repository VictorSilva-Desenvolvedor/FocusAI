import { AlertTriangle, ScrollText } from 'lucide-react';
import { useDadosDaSessao } from '@/src/contexts/dadosDaSessao';
import { useUsuarios } from '@/src/contexts/UsuariosContext';
import { listarAuditoria } from '@/src/servicos/auditoria';
import { formatarData, tempoRelativo } from '@/src/lib/format';
import { ROLE_CURTO } from '@/src/lib/usuarios';
import { ESTILO_BLOCO, ESTILO_TEXTO } from '@/src/lib/estilo';
import type { RegistroAuditoria, UserRole } from '@/types';

/**
 * A trilha de `0018_trilha_de_auditoria.sql`. Só mostra o que existe de
 * verdade: hoje a única origem é `auditar_papel()` — quem mudou o papel de
 * quem, de que para que. Formato genérico de propósito (`operacao` é texto
 * livre na tabela), então uma origem nova aparece aqui sem remendo, com o
 * bloco de repuso genérico como rede.
 */
export function LogsSistemaView() {
  const { dados: registros, carregando, erro } = useDadosDaSessao(listarAuditoria, 'auditoria');
  const { usuarios } = useUsuarios();

  function nomeDoAlvo(registro: RegistroAuditoria): string {
    if (registro.tabela !== 'perfis') return registro.registroId;
    const usuario = usuarios.find((u) => u.id === registro.registroId);
    return usuario?.nome ?? '(conta sem correspondência)';
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="card-title flex items-center gap-2">
          <ScrollText className="size-4 text-stone-400" />
          Logs do Sistema
        </h2>
        <p className="subtitulo-pagina mt-1">
          Auditoria de mudança de papel de usuário — quem mudou o papel de quem, de que para que.
        </p>
      </div>

      {erro && (
        <div className={`rounded-lg border p-3 mb-4 flex gap-2.5 ${ESTILO_BLOCO.erro}`}>
          <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.erro}`} />
          <p className="text-[13px] text-stone-700">{erro}</p>
        </div>
      )}

      <div className="card overflow-hidden">
        {carregando ? (
          <p className="nota py-10 text-center">Carregando…</p>
        ) : registros.length === 0 ? (
          <EstadoVazio />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-[13px]">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/60">
                  <th className="text-left font-medium text-[11px] text-stone-500 px-4 py-2.5">
                    Quando
                  </th>
                  <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">
                    Quem mudou
                  </th>
                  <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">
                    Conta alterada
                  </th>
                  <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">
                    Mudança
                  </th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-stone-700">{tempoRelativo(r.criadoEm)}</div>
                      <div className="nota">{formatarData(r.criadoEm)}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="size-6 shrink-0 rounded-full grid place-items-center text-[10px] font-semibold bg-roxo-600 text-white"
                        >
                          {r.ator?.avatarIniciais ?? '?'}
                        </span>
                        <span className="text-stone-700">{r.ator?.nome ?? 'Sistema (fora de sessão de usuário)'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-stone-700">{nomeDoAlvo(r)}</td>
                    <td className="px-3 py-3">
                      <Mudanca registro={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="nota mt-3">Mostrando {registros.length} {registros.length === 1 ? 'registro' : 'registros'}.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Formato conhecido (`operacao === 'papel'`) vira frase; o resto cai no genérico. */
function Mudanca({ registro }: { registro: RegistroAuditoria }) {
  if (registro.operacao === 'papel') {
    const de = registro.antes?.papel as UserRole | undefined;
    const para = registro.depois?.papel as UserRole | undefined;
    return (
      <span className="text-stone-700">
        Papel: <span className="text-stone-500">{de ? ROLE_CURTO[de] : '—'}</span>
        {' → '}
        <span className="font-medium text-roxo-900">{para ? ROLE_CURTO[para] : '—'}</span>
      </span>
    );
  }

  return (
    <span className="nota">
      {registro.tabela}.{registro.operacao}: {JSON.stringify(registro.antes)} →{' '}
      {JSON.stringify(registro.depois)}
    </span>
  );
}

function EstadoVazio() {
  return (
    <div className="py-16 text-center">
      <div className="size-11 mx-auto rounded-xl bg-stone-100 grid place-items-center mb-3">
        <ScrollText className="size-5 text-stone-400" />
      </div>
      <p className="text-[14px] font-medium text-roxo-900">Nenhum registro ainda</p>
      <p className="nota mt-1">Aparece aqui assim que o papel de alguém mudar.</p>
    </div>
  );
}
