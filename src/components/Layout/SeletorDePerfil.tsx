import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, FlaskConical } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { ROLE_CURTO } from '@/src/lib/usuarios';
import type { Usuario } from '@/types';

/**
 * Troca o perfil ativo. Existe só na maquete, para demonstrar a matriz de
 * acesso sem precisar de autenticação real.
 *
 * Era um `<select>` nativo invisível por cima do avatar. Funcionava, mas quem
 * desenhava a lista era o sistema operacional: fonte alheia ao produto, dezessete
 * nomes num paredão sem hierarquia, e nenhuma forma de separar quem é do time de
 * quem é cliente — que é justamente a distinção que este seletor existe para
 * demonstrar.
 */
export function SeletorDePerfil() {
  const { perfil, perfisDisponiveis, trocarPerfil } = useAuth();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /*
   * A separação é a informação principal da lista: o time interno opera a
   * máquina, o advogado consome o produto dela. Sem os dois grupos à vista,
   * trocar para um advogado parece só "outro usuário" em vez de atravessar a
   * fronteira de acesso.
   */
  const grupos = useMemo(() => {
    const time = perfisDisponiveis.filter((u) => u.role !== 'advogado');
    const advogados = perfisDisponiveis.filter((u) => u.role === 'advogado');
    return [
      { titulo: 'Time Focus AI', pessoas: time },
      { titulo: 'Advogados — painel do cliente', pessoas: advogados },
    ].filter((g) => g.pessoas.length > 0);
  }, [perfisDisponiveis]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    const aoClicar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousedown', aoClicar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('mousedown', aoClicar);
    };
  }, [aberto]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Trocar perfil de demonstração"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-lg pl-1.5 pr-1 py-1 transition-colors hover:bg-white/8"
      >
        <Avatar usuario={perfil} ativo />
        <span className="hidden xl:block leading-tight min-w-0 max-w-36 text-left">
          <span className="block text-[12px] font-medium text-white truncate">{perfil.nome}</span>
          <span className="block text-[10px] text-roxo-300 truncate">{ROLE_CURTO[perfil.role]}</span>
        </span>
        <ChevronDown
          className={`size-4 text-roxo-300 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`}
        />
      </button>

      {aberto && (
        <div
          role="menu"
          aria-label="Perfis de demonstração"
          /* EST-R03 — o menu vive na camada de diálogo, como todo flutuante. */
          className="menu-flutuante absolute right-0 top-full mt-1.5 w-72 max-h-[70vh] overflow-y-auto"
        >
          <div className="flex items-start gap-2 px-3 py-2 border-b border-stone-100">
            <FlaskConical className="size-3.5 shrink-0 mt-0.5 text-stone-400" />
            <p className="nota">
              Troca de perfil sem senha. Serve para conferir a matriz de acesso — não é login.
            </p>
          </div>

          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="py-1.5 border-b border-stone-100 last:border-0">
              <div className="label-eyebrow px-3 py-1">{grupo.titulo}</div>

              {grupo.pessoas.map((pessoa) => {
                const ativo = pessoa.id === perfil.id;
                return (
                  <button
                    key={pessoa.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={ativo}
                    /* Gancho estável dos smoke tests e do `npm run shot --perfil`:
                       o nome muda com a seed, o id não. */
                    data-perfil={pessoa.id}
                    onClick={() => {
                      trocarPerfil(pessoa.id);
                      setAberto(false);
                    }}
                    className={`item-menu flex items-center gap-2.5 ${
                      ativo ? 'bg-roxo-50' : 'hover:bg-stone-50'
                    }`}
                  >
                    <Avatar usuario={pessoa} ativo={ativo} />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate ${
                          ativo ? 'font-medium text-roxo-900' : 'text-stone-800'
                        }`}
                      >
                        {pessoa.nome}
                      </span>
                      <span className="block nota truncate">{ROLE_CURTO[pessoa.role]}</span>
                    </span>
                    {ativo && <Check className="size-4 shrink-0 text-roxo-600" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * O advogado ganha um avatar de tom diferente. É o único papel externo, e a cor
 * é o que faz notar, de relance, que a sessão está do lado do cliente.
 */
function Avatar({ usuario, ativo }: { usuario: Usuario; ativo: boolean }) {
  const externo = usuario.role === 'advogado';
  return (
    <span
      aria-hidden
      className={`size-7 shrink-0 rounded-full grid place-items-center text-[11px] font-semibold ${
        externo
          ? 'bg-atencao-500 text-white'
          : ativo
            ? 'bg-roxo-600 text-white'
            : 'bg-stone-200 text-stone-600'
      }`}
    >
      {usuario.avatar_iniciais}
    </span>
  );
}
