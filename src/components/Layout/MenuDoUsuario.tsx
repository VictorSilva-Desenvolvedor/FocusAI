import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { ROLE_CURTO } from '@/src/lib/usuarios';

/**
 * Quem está logado, e a saída.
 *
 * Ocupa o lugar do antigo seletor de perfil, que trocava de usuário sem senha.
 * Ele existia porque não havia login; com login, trocar de papel é sair e
 * entrar de novo — e é assim que a matriz de acesso passa a ser conferida.
 */
export function MenuDoUsuario() {
  const { perfil, ehAdvogado, encerrarSessao } = useAuth();
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        aria-label="Menu do usuário"
        aria-haspopup="menu"
        aria-expanded={aberto}
        /* Gancho estável dos scripts de verificação: o nome muda com a seed. */
        data-perfil={perfil.id}
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-lg pl-1.5 pr-1 py-1 transition-colors hover:bg-white/8"
      >
        <Avatar iniciais={perfil.avatar_iniciais} externo={ehAdvogado} />
        <span className="hidden xl:block leading-tight min-w-0 max-w-36 text-left">
          <span className="block text-[12px] font-medium text-white truncate">{perfil.nome}</span>
          <span className="block text-[11px] text-roxo-300 truncate">{ROLE_CURTO[perfil.role]}</span>
        </span>
        <ChevronDown
          className={`size-4 text-roxo-300 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`}
        />
      </button>

      {aberto && (
        <div
          role="menu"
          aria-label="Conta"
          /* EST-R03 — o menu vive na camada de diálogo, como todo flutuante. */
          className="menu-flutuante absolute right-0 top-full mt-1.5 w-64"
        >
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-stone-100">
            <Avatar iniciais={perfil.avatar_iniciais} externo={ehAdvogado} />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-stone-800 truncate">
                {perfil.nome}
              </span>
              <span className="block nota truncate">{perfil.email}</span>
            </span>
          </div>

          <div className="px-3 py-2 border-b border-stone-100">
            <div className="label-eyebrow">Papel</div>
            <div className="text-[13px] text-stone-700 mt-0.5">{ROLE_CURTO[perfil.role]}</div>
            {perfil.departamento && <div className="nota">{perfil.departamento}</div>}
          </div>

          <div className="py-1 border-b border-stone-100">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAberto(false);
                navegar('/config/perfil');
              }}
              className="item-menu flex items-center gap-2.5 text-stone-700 hover:bg-stone-50"
            >
              <UserCircle size={16} className="text-stone-400" />
              Meu perfil
            </button>
          </div>

          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => void encerrarSessao()}
              className="item-menu flex items-center gap-2.5 text-stone-700 hover:bg-stone-50"
            >
              <LogOut size={16} className="text-stone-400" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * O advogado ganha um avatar de tom diferente. É o único papel externo, e a cor
 * é o que faz notar, de relance, que a sessão está do lado do cliente.
 */
function Avatar({ iniciais, externo }: { iniciais: string; externo: boolean }) {
  return (
    <span
      aria-hidden
      className={`size-7 shrink-0 rounded-full grid place-items-center text-[11px] font-semibold ${
        externo ? 'bg-atencao-500 text-white' : 'bg-roxo-600 text-white'
      }`}
    >
      {iniciais}
    </span>
  );
}
