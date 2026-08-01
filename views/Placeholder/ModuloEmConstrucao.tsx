import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { MODULOS } from '@/src/lib/navigation';

export function ModuloEmConstrucao() {
  const { pathname } = useLocation();
  const modulo = MODULOS.find((m) => m.rota === pathname);

  return (
    <div className="h-full grid place-items-center px-6">
      <div className="text-center max-w-sm animate-entrada-suave">
        <div className="size-12 mx-auto rounded-xl bg-stone-200 grid place-items-center mb-4">
          <Construction className="size-5 text-stone-500" />
        </div>
        <h1 className="text-lg font-semibold text-roxo-900">
          {modulo?.rotulo ?? 'Módulo'}
        </h1>
        <p className="subtitulo-pagina mt-1.5 leading-relaxed">
          {modulo?.descricao ?? 'Este módulo ainda não foi construído.'} — ainda não implementado
          nesta maquete.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 mt-5 text-[13px] font-medium text-roxo-700 hover:text-roxo-900"
        >
          <ArrowLeft className="size-4" />
          Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
