import { useMemo } from 'react';
import { AlertTriangle, Check, Clock, Coins, ShieldAlert, Users } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLeads } from '@/src/contexts/LeadsContext';
import { ESTILO_BLOCO, ESTILO_CHIP, ESTILO_TEXTO } from '@/src/lib/estilo';
import { TESES } from '@/src/lib/teses';
import { ESTILO_TESE, estaNoCatalogo } from '@/src/lib/leads';
import { temAcessoRestrito } from '@/src/lib/navigation';
import { TESE_CURTA, type Tese } from '@/types';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export function TesesView() {
  const { perfil, temPermissao } = useAuth();
  const { leads } = useLeads();
  const restrito = temAcessoRestrito('teses', perfil);

  const porTese = useMemo(() => {
    const mapa = new Map<string, { catalogo: number; vendidos: number; desqualificados: number }>();
    for (const tese of TESES) {
      mapa.set(tese.id, { catalogo: 0, vendidos: 0, desqualificados: 0 });
    }
    for (const lead of leads) {
      const linha = mapa.get(lead.tese);
      if (!linha) continue;
      if (estaNoCatalogo(lead)) linha.catalogo += 1;
      if (lead.compradoPor) linha.vendidos += 1;
      if (lead.status === 'desqualificado') linha.desqualificados += 1;
    }
    return mapa;
  }, [leads]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <div>
        <h1 className="titulo-pagina">Teses</h1>
        <p className="subtitulo-pagina mt-1">
          Cada tese tem público, oferta e roteiro próprios. O que está aqui define quais perguntas a
          IA faz, quem é elegível e quanto o lead custa.
        </p>
      </div>

      {restrito && (
        <div className={`rounded-lg border p-3 ${ESTILO_BLOCO.info}`}>
          <p className="text-[13px] text-stone-700">
            Você está vendo as teses em leitura. Os filtros abaixo são os mesmos que a qualificação
            aplica antes de um lead chegar ao catálogo.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {TESES.map((tese) => (
          <CartaoTese
            key={tese.id}
            tese={tese}
            numeros={porTese.get(tese.id) ?? { catalogo: 0, vendidos: 0, desqualificados: 0 }}
            podeMexerNoPreco={temPermissao('tese:definir_preco')}
          />
        ))}
      </div>

      <p className="nota">
        Preço alterado aqui vale para o que for publicado a partir de agora. Lead já no catálogo ou
        já vendido mantém o preço com que foi anunciado (CRE-R03).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CartaoTese({
  tese,
  numeros,
  podeMexerNoPreco,
}: {
  tese: Tese;
  numeros: { catalogo: number; vendidos: number; desqualificados: number };
  podeMexerNoPreco: boolean;
}) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`etiqueta ${ESTILO_TESE[tese.id]}`}>{TESE_CURTA[tese.id]}</span>
            <span className="nota">{tese.area}</span>
          </div>
          <h2 className="text-[16px] font-semibold text-roxo-900 mt-1.5">{tese.nome}</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className={`chip py-1.5 ${ESTILO_CHIP.marca}`}>
            <span className="text-[15px] font-semibold tabular leading-none">{numeros.catalogo}</span>
            <span className="text-[12px]">no catálogo</span>
          </div>
          <div className={`chip py-1.5 ${ESTILO_CHIP.sucesso}`}>
            <span className="text-[15px] font-semibold tabular leading-none">{numeros.vendidos}</span>
            <span className="text-[12px]">vendidos</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <Bloco icone={Users} titulo="Público">
            {tese.publico}
          </Bloco>

          <Bloco icone={Check} titulo="A oferta">
            {tese.oferta}
            {tese.consultaPaga && (
              <span className="block mt-1.5 text-[12px] text-roxo-800 font-medium">
                Taxa simbólica de {brl.format(tese.consultaPaga.min)} a{' '}
                {brl.format(tese.consultaPaga.max)} — filtra quem tem intenção real de resolver e já
                gera receita na primeira interação.
              </span>
            )}
          </Bloco>

          {tese.urgencia && (
            <Bloco icone={Clock} titulo="Urgência real">
              {tese.urgencia}
              <span className="block nota mt-1">
                Sai da lei, não do roteiro. Urgência fabricada é pressão sobre quem já está numa
                situação ruim.
              </span>
            </Bloco>
          )}
        </div>

        <div className="space-y-4">
          {/* Os filtros são o coração da tese: é o que separa produto de lista
              de telefone. Por isso vêm com a regra que os sustenta à vista. */}
          <div>
            <h3 className="label-eyebrow mb-2">Filtros de elegibilidade</h3>
            <ul className="space-y-2">
              {tese.filtros.map((filtro) => (
                <li key={filtro.id} className={`rounded-lg border p-3 ${ESTILO_BLOCO.neutro}`}>
                  <div className="flex items-start gap-2">
                    <Check className={`size-3.5 shrink-0 mt-0.5 ${ESTILO_TEXTO.sucesso}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-roxo-900">
                          {filtro.rotulo}
                        </span>
                        <code className="etiqueta bg-white border border-black/5 text-roxo-700">
                          {filtro.regra}
                        </code>
                      </div>
                      <p className="text-[12px] text-stone-600 mt-1 leading-snug">{filtro.motivo}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {tese.cuidados.length > 0 && (
            <div>
              <h3 className="label-eyebrow mb-2">Cuidados na abordagem</h3>
              <ul className="space-y-1.5">
                {tese.cuidados.map((cuidado) => {
                  // O cuidado que envolve dado bancário não é dica de tom: é
                  // INV-17, e o sistema o sustenta não tendo o campo.
                  const duro = /dado bancário|senha|cartão/i.test(cuidado);
                  return (
                    <li
                      key={cuidado}
                      className={`flex gap-2 text-[12px] leading-snug ${
                        duro ? 'text-erro-700 font-medium' : 'text-stone-600'
                      }`}
                    >
                      {duro ? (
                        <ShieldAlert className="size-3.5 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-stone-400" />
                      )}
                      {cuidado}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-stone-100">
        <div className="flex items-center gap-2">
          <Coins className={`size-4 ${ESTILO_TEXTO.marca}`} />
          <span className="text-[14px] font-semibold text-roxo-900 tabular">
            {tese.custoCreditos} créditos
          </span>
          <span className="text-[12px] text-stone-500">
            ou {brl.format(tese.precoAvulso)} avulso
          </span>
        </div>

        {numeros.desqualificados > 0 && (
          <span className="nota">
            {numeros.desqualificados} desqualificado{numeros.desqualificados > 1 ? 's' : ''} pelos
            filtros
          </span>
        )}

        {podeMexerNoPreco && (
          <button type="button" disabled className="btn btn-secundario ml-auto">
            Alterar preço
          </button>
        )}
      </div>
    </section>
  );
}

function Bloco({
  icone: Icone,
  titulo,
  children,
}: {
  icone: typeof Users;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="label-eyebrow flex items-center gap-1.5 mb-1.5">
        <Icone className="size-3.5" />
        {titulo}
      </h3>
      <p className="text-[13px] text-stone-700 leading-relaxed">{children}</p>
    </div>
  );
}
