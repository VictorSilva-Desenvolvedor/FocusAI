import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Bell, Menu, Search, X } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { modulosVisiveis } from '@/src/lib/navigation';
import { MenuDoUsuario } from './MenuDoUsuario';

export function Topbar() {
  const { perfil } = useAuth();
  const modulos = modulosVisiveis(perfil);
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Navegar fecha o menu compacto — sem isso ele fica aberto por cima da
  // página que o próprio clique acabou de abrir.
  useEffect(() => setMenuAberto(false), [pathname]);

  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAberto(false);
    const aoClicar = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    };
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousedown', aoClicar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('mousedown', aoClicar);
    };
  }, [menuAberto]);

  const classeItem = ({ isActive }: { isActive: boolean }) =>
    [
      'shrink-0 rounded-lg px-3 py-1.5 text-[13px] transition-colors whitespace-nowrap',
      isActive ? 'bg-white/12 text-white font-medium' : 'text-roxo-200 hover:bg-white/6 hover:text-white',
    ].join(' ');

  return (
    // z acima do botão flutuante do assistente: com o menu compacto aberto, ele
    // ficaria por cima dos itens de navegação.
    <header className="shrink-0 relative z-50 bg-grafite-900 text-roxo-100" ref={menuRef}>
      <div className="h-14 flex items-center gap-2 px-3 sm:px-4">
        {/* Marca */}
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0 pr-2">
          <img src="/logo.png" alt="Focus AI" className="size-8" />
          <div className="hidden sm:block leading-none">
            <div className="font-semibold text-[15px] text-white tracking-tight">Focus AI</div>
            <div className="text-[11px] text-roxo-300 tracking-[0.12em] uppercase mt-0.5">
              Leads qualificados
            </div>
          </div>
        </NavLink>

        {/*
          Navegação horizontal a partir de xl. Abaixo disso os 10 módulos não
          cabem e o último ficava cortado no meio da palavra, o que parece
          defeito — nessa faixa o menu compacto é mais honesto. O ponto de
          virada subiu de lg para xl quando o décimo módulo entrou.
        */}
        <nav
          aria-label="Módulos"
          className="hidden xl:flex items-center gap-0.5 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {modulos.map((modulo) => (
            <NavLink
              key={modulo.id}
              to={modulo.rota}
              end={modulo.rota === '/'}
              title={modulo.descricao}
              className={classeItem}
            >
              {modulo.rotulo}
              {modulo.nivel === 'restricted' && (
                <span className="etiqueta ml-1.5 font-medium text-roxo-300 border border-roxo-700 py-px align-middle">
                  parcial
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
          {/* A busca cede o espaço para a navegação: com 10 módulos, os dois
              não cabem juntos antes de uma tela bem larga. */}
          <div className="relative hidden 2xl:block w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-roxo-300" />
            <input
              type="search"
              placeholder="Buscar lead, advogado, tese…"
              className="campo pl-9 bg-white/8 border-white/10 text-white placeholder:text-roxo-300 focus:bg-white/12 focus:border-white/25 focus:ring-0"
            />
          </div>

          <button
            type="button"
            aria-label="Notificações"
            className="btn-icone relative text-roxo-200 hover:bg-white/8 hover:text-white"
          >
            <Bell className="size-4.5" />
            {/* Pulsa no acento da marca: é aviso não lido, estado vivo. */}
            <span className="ponto-estado absolute top-2 right-2 bg-roxo-400 ring-2 ring-grafite-900 animate-pulso-marca" />
          </button>

          <MenuDoUsuario />

          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
            className="btn-icone xl:hidden text-roxo-200 hover:bg-white/8 hover:text-white"
          >
            {menuAberto ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Menu compacto: única navegação disponível abaixo de xl. */}
      {menuAberto && (
        <nav
          aria-label="Módulos"
          className="xl:hidden border-t border-white/8 px-3 py-2 animate-entrada-suave"
        >
          <ul className="grid grid-cols-2 gap-1">
            {modulos.map((modulo) => (
              <li key={modulo.id}>
                <NavLink
                  to={modulo.rota}
                  end={modulo.rota === '/'}
                  className={({ isActive }) =>
                    [
                      'block rounded-lg px-3 py-2 text-[13px] transition-colors',
                      isActive ? 'bg-white/12 text-white font-medium' : 'text-roxo-200 hover:bg-white/6',
                    ].join(' ')
                  }
                >
                  {modulo.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
