import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { definirAvisoLeadNovo, lerAvisoLeadNovo } from '@/src/servicos/notificacoes';
import { ESTILO_BLOCO, ESTILO_TEXTO } from '@/src/lib/estilo';

/**
 * Só existe um aviso pessoal de verdade hoje (ver `src/servicos/notificacoes.ts`),
 * e ele é do advogado — é o painel dele que promete "você recebe aviso quando
 * entra lead novo". Time interno não tem alerta pessoal prometido em lugar
 * nenhum ainda, então a tela diz isso em vez de mostrar um formulário vazio
 * fingindo que há o que configurar.
 */
export function NotificacoesView() {
  const { perfil, ehAdvogado } = useAuth();

  if (!ehAdvogado) {
    return (
      <div className="card p-10 text-center">
        <div className="size-11 mx-auto rounded-xl bg-stone-100 grid place-items-center mb-3">
          <Bell className="size-5 text-stone-400" />
        </div>
        <p className="text-[14px] font-medium text-roxo-900">Nenhum alerta pessoal, por enquanto</p>
        <p className="subtitulo-pagina mt-1.5 max-w-md mx-auto">
          O único aviso que o sistema já promete de verdade é o de lead novo, e é do painel do
          advogado. Para o seu papel ainda não há alerta pessoal configurável.
        </p>
      </div>
    );
  }

  return <ToggleLeadNovo perfilId={perfil.id} />;
}

function ToggleLeadNovo({ perfilId }: { perfilId: string }) {
  const [ativo, setAtivo] = useState<boolean | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    lerAvisoLeadNovo(perfilId)
      .then((valor) => {
        if (vivo) setAtivo(valor);
      })
      .catch((e: Error) => {
        if (vivo) setErro(e.message);
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [perfilId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function alternar() {
    if (ativo === null || salvando) return;
    const proximo = !ativo;
    setSalvando(true);
    const r = await definirAvisoLeadNovo(proximo);
    setSalvando(false);

    if (!r.ok) {
      setErro(r.motivo);
      return;
    }
    setErro(null);
    setAtivo(proximo);
    setToast(proximo ? 'Aviso de lead novo ligado.' : 'Aviso de lead novo desligado.');
  }

  return (
    <section className="card p-5 max-w-xl">
      <h2 className="card-title">Alertas</h2>
      <p className="subtitulo-pagina mt-1 mb-4">O que avisa quando algo muda no seu catálogo.</p>

      {erro && (
        <div className={`rounded-lg border p-3 mb-4 flex gap-2.5 ${ESTILO_BLOCO.erro}`}>
          <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.erro}`} />
          <p className="text-[13px] text-stone-700">{erro}</p>
        </div>
      )}

      {carregando ? (
        <p className="nota">Carregando…</p>
      ) : (
        <label
          className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
            ativo ? 'border-roxo-300 bg-roxo-50' : 'border-stone-200 hover:border-stone-300'
          } ${salvando ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <input
            type="checkbox"
            checked={ativo ?? false}
            onChange={() => void alternar()}
            className="mt-0.5 size-4 shrink-0 accent-roxo-600"
          />
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-roxo-900">
              Lead novo no meu catálogo
            </span>
            <span className="block text-[11px] text-stone-500 leading-snug mt-0.5">
              Avisa quando um lead agendado entra nas suas teses e na sua região.
            </span>
          </span>
        </label>
      )}

      <p className="nota mt-4">
        O canal de envio (WhatsApp) ainda não está configurado — ver Integrações. Esta preferência
        já fica salva e vale assim que o envio existir.
      </p>

      {toast && (
        <div role="status" className="toast bg-grafite-900 max-w-[calc(100vw-2rem)]">
          <CheckCircle2 className="size-4 shrink-0 text-roxo-400" />
          <span className="text-[13px]">{toast}</span>
        </div>
      )}
    </section>
  );
}
