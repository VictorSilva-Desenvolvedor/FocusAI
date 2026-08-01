import { Sparkles } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';

/**
 * ASS-R02 — parceiros, clientes e agências white label não têm acesso ao
 * assistente. São públicos externos ao time.
 */
const PAPEIS_SEM_ASSISTENTE = new Set(['parceiro', 'cliente', 'white_label_admin']);

export function AssistenteButton() {
  const { perfil } = useAuth();
  if (PAPEIS_SEM_ASSISTENTE.has(perfil.role)) return null;

  return (
    <button
      type="button"
      className="btn fixed bottom-6 right-6 z-40 h-11 pl-3.5 pr-4 rounded-full bg-grafite-900 text-white shadow-flutuante hover:bg-grafite-800"
    >
      <Sparkles className="size-4 text-roxo-400" />
      <span className="text-[13px] font-medium">Assistente</span>
    </button>
  );
}
