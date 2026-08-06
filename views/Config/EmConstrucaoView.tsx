import { Construction } from 'lucide-react';

/**
 * Placeholder honesto para uma aba de Configurações que ainda não tem
 * funcionalidade real por trás. Não finge dado nem formulário — só diz o que
 * a aba vai fazer e que ainda não é a demanda da vez (ver Pendências
 * conhecidas / CLAUDE.md: "abas por vez, começando pela mais simples").
 */
export function EmConstrucaoView({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="card py-16 px-6 text-center">
      <div className="size-11 mx-auto rounded-xl bg-stone-100 grid place-items-center mb-3">
        <Construction className="size-5 text-stone-400" />
      </div>
      <p className="text-[14px] font-medium text-roxo-900">{titulo}</p>
      <p className="subtitulo-pagina mt-1.5 max-w-md mx-auto">{descricao}</p>
      <p className="nota mt-3">Ainda não construída — entra quando for a demanda da vez.</p>
    </div>
  );
}
