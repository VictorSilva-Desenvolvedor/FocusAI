/*
 * Liga o formulário do Tally ao pixel da Meta sem depender do plano pago.
 *
 * O formulário roda em tally.so, não no nosso site — e lá não existe pixel
 * nosso. Então a identidade do clique faz o caminho de ida e volta por dentro
 * do que o plano gratuito já oferece:
 *
 *   ida    o link para o formulário leva `_fbp`, `_fbc`, `fbclid` e um
 *          `evento_id` que geramos aqui; o Tally guarda em campo oculto e
 *          devolve tudo no webhook
 *   volta  o Tally redireciona para a nossa página de obrigado, e lá o pixel
 *          dispara o `Lead` com o mesmo `evento_id`, lido do armazenamento
 *
 * O `evento_id` é nosso de propósito. Ele poderia ser o `respondentId` do
 * Tally, que também chega às duas pontas — mas só chegaria ao navegador como
 * variável inserida à mão na URL de redirecionamento, formulário por
 * formulário, e some se alguém reescrever essa URL. Gerado aqui, ele não
 * depende de configuração nenhuma: o servidor recebe pelo campo oculto e o
 * navegador lê do armazenamento do próprio domínio.
 *
 * É esse id que vira o `event_id` dos dois lados (`CMP-R01`): a Meta deduplica
 * em vez de contar a mesma conversão duas vezes. O que o navegador perde para
 * bloqueador e para o iOS, o servidor entrega.
 *
 * Uso — na landing:
 *
 *   <script src="https://.../tally-meta.js"></script>
 *
 * E na página de obrigado, com o atributo que a identifica:
 *
 *   <script src="https://.../tally-meta.js" data-obrigado></script>
 *
 * O atributo não é detalhe: sem ele o script não teria como saber que aquela
 * página é a de conversão, e dispararia `Lead` em qualquer visita à landing de
 * quem já preencheu o formulário um dia.
 *
 * Nada aqui é segredo: o token da Conversions API mora no servidor e nunca
 * chega ao navegador (`API-R01`).
 */
(function () {
  'use strict';

  var script = document.currentScript;

  var EH_OBRIGADO = script && script.hasAttribute('data-obrigado');

  /*
   * Aceito na página de obrigado se um dia a variável `@RespondentId` for
   * inserida na URL de redirecionamento do Tally. É alternativa, não
   * requisito — o caminho normal é o `evento_id` guardado aqui.
   */
  var PARAM_RESPONDENTE = (script && script.getAttribute('data-param-respondente')) || 'rid';

  var GUARDA_EVENTO = 'focus.evento';

  /*
   * Só o modo embedado usa endpoint próprio: ali a submissão acontece dentro de
   * um iframe e não há redirecionamento que carregue o id de volta. Com o
   * formulário hospedado no Tally, a identidade chega ao servidor pelo webhook.
   */
  var ENDPOINT = script && script.getAttribute('data-endpoint');

  var GUARDA_FBCLID = 'focus.fbclid';
  /* A mesma janela do cookie `_fbc` da Meta. */
  var DIAS = 90 * 24 * 60 * 60 * 1000;

  function cookie(nome) {
    var achado = document.cookie.split('; ').find(function (c) {
      return c.indexOf(nome + '=') === 0;
    });
    return achado ? decodeURIComponent(achado.slice(nome.length + 1)) : null;
  }

  /*
   * O clique do anúncio e o envio do formulário raramente acontecem na mesma
   * página: a pessoa cai na landing, lê, e só então clica no botão. O `fbclid`
   * fica na URL de entrada e se perde na segunda página — daí guardar.
   */
  function guardarFbclid() {
    var id = new URLSearchParams(location.search).get('fbclid');
    if (!id) return;
    try {
      localStorage.setItem(GUARDA_FBCLID, JSON.stringify({ id: id, em: Date.now() }));
    } catch (e) {
      /* Navegador com armazenamento bloqueado ainda tem o cookie `_fbc`. */
    }
  }

  function fbclidGuardado() {
    try {
      var bruto = localStorage.getItem(GUARDA_FBCLID);
      if (!bruto) return null;
      var guardado = JSON.parse(bruto);
      return Date.now() - guardado.em > DIAS ? null : guardado;
    } catch (e) {
      return null;
    }
  }

  /*
   * O formato que a Meta espera: `fb.<subdomínios>.<carimbo>.<fbclid>`. O
   * cookie `_fbc` só existe se o pixel base rodou na página que recebeu o
   * clique; quando não existe, este é o mesmo valor reconstruído à mão.
   */
  function fbc() {
    var doCookie = cookie('_fbc');
    if (doCookie) return doCookie;

    var guardado = fbclidGuardado();
    return guardado ? 'fb.1.' + guardado.em + '.' + guardado.id : null;
  }

  function fbclid() {
    var guardado = fbclidGuardado();
    return guardado ? guardado.id : null;
  }

  function identidade() {
    return {
      fbp: cookie('_fbp'),
      fbc: fbc(),
      fbclid: fbclid(),
      /* Sem a query: o `fbclid` já vai em campo próprio e a URL fica enorme. */
      pagina: location.origin + location.pathname,
    };
  }

  function novoId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    /* Não precisa ser criptográfico: precisa ser único entre as submissões. */
    return 'e-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function guardarEvento(id) {
    try {
      localStorage.setItem(GUARDA_EVENTO, id);
    } catch (e) {
      /* Sem armazenamento não há deduplicação, e o evento do servidor sozinho
       * continua valendo — é o mais confiável dos dois. */
    }
  }

  function eventoGuardado() {
    try {
      return localStorage.getItem(GUARDA_EVENTO);
    } catch (e) {
      return null;
    }
  }

  /*
   * O pixel pode estar sendo carregado por gerenciador de tags e ainda não ter
   * definido `fbq` quando a página de obrigado abre. Desistir na primeira
   * tentativa perderia justamente a conversão; esperar para sempre esconderia
   * o pixel ausente. Cinco segundos e um aviso.
   */
  function comPixel(acao) {
    var limite = Date.now() + 5000;

    (function tentar() {
      if (typeof window.fbq === 'function') return acao(window.fbq);
      if (Date.now() > limite) {
        console.error('[tally-meta] fbq não carregou: o evento do navegador não foi disparado.');
        return;
      }
      setTimeout(tentar, 200);
    })();
  }

  /*
   * A ida: acrescenta a identidade ao link do formulário.
   *
   * O Tally recebe cada parâmetro num campo oculto de mesmo nome e o devolve no
   * webhook — é o único caminho pelo qual `_fbp` e `_fbc`, que são cookies do
   * NOSSO domínio, chegam ao servidor. Sem isto, o lead existe e não tem a quem
   * ser atribuído (`CMP-R02`), e nenhuma etapa posterior pode ser reenviada.
   *
   * A decoração é no clique, não na carga da página: o cookie `_fbp` é escrito
   * pelo pixel base e pode não existir ainda quando o HTML termina de carregar.
   */
  function decorarLink(elemento) {
    var url;
    try {
      url = new URL(elemento.href, location.href);
    } catch (e) {
      return;
    }
    if (url.hostname !== 'tally.so' && !url.hostname.endsWith('.tally.so')) return;

    var dados = identidade();
    Object.keys(dados).forEach(function (chave) {
      /* Parâmetro escrito à mão no link vence: foi decisão de quem montou. */
      if (dados[chave] && !url.searchParams.has(chave)) {
        url.searchParams.set(chave, dados[chave]);
      }
    });

    /*
     * Um id por link decorado, guardado no mesmo instante. O clique é o último
     * ato antes do formulário, então o que ficou guardado é o da submissão que
     * vai acontecer — e é ele que a página de obrigado vai ler.
     */
    var evento = url.searchParams.get('evento_id') || novoId();
    url.searchParams.set('evento_id', evento);
    guardarEvento(evento);

    elemento.href = url.toString();
  }

  /*
   * Captura, e não borbulha: o link precisa estar decorado antes de qualquer
   * `preventDefault` de outro script. Delegação no documento cobre botão que
   * só aparece depois, o que um `querySelectorAll` na carga não faria.
   */
  function ligarDecoracao() {
    document.addEventListener(
      'click',
      function (evento) {
        var alvo = evento.target && evento.target.closest && evento.target.closest('a[href]');
        if (alvo) decorarLink(alvo);
      },
      true,
    );
  }

  /*
   * A volta: a página de obrigado dispara o `Lead` com o id que a landing
   * guardou — o mesmo que foi pelo campo oculto e vai chegar ao servidor.
   *
   * O id é consumido ao disparar. Sem isso, quem voltasse à página de obrigado
   * meses depois, por histórico do navegador, dispararia de novo um evento de
   * uma conversão antiga.
   */
  function dispararLeadDaVolta() {
    if (!EH_OBRIGADO) return;

    var id = new URLSearchParams(location.search).get(PARAM_RESPONDENTE) || eventoGuardado();

    if (!id) {
      /*
       * `API-R10` — etapa pulada não vira silêncio. Chegar aqui sem id costuma
       * significar que a pessoa não passou pela landing, ou que o armazenamento
       * está bloqueado. O evento do servidor ainda vai, sem par para deduplicar.
       */
      console.warn('[tally-meta] página de obrigado sem id de evento: sem deduplicação nesta conversão.');
      return;
    }

    comPixel(function (fbq) {
      fbq('track', 'Lead', {}, { eventID: id });
    });

    try {
      localStorage.removeItem(GUARDA_EVENTO);
    } catch (e) {
      /* Nada a limpar. */
    }
  }

  /*
   * O caso embedado, que continua valendo se um dia o formulário entrar numa
   * página nossa: o iframe emite `Tally.FormSubmitted` e não há redirecionamento
   * para trazer o id de volta, então a identidade vai direto para o endpoint.
   */
  function ouvirEmbed() {
    window.addEventListener('message', function (evento) {
      if (evento.origin !== 'https://tally.so') return;
      if (typeof evento.data !== 'string' || evento.data.indexOf('Tally.FormSubmitted') === -1) return;

      var payload;
      try {
        payload = JSON.parse(evento.data).payload;
      } catch (e) {
        return;
      }
      if (!payload || !payload.respondentId) return;

      comPixel(function (fbq) {
        fbq('track', 'Lead', {}, { eventID: payload.respondentId });
      });

      if (!ENDPOINT) {
        /*
         * `API-R10` — configuração ausente não pode virar silêncio. O pixel até
         * dispara, mas a identidade do clique não é gravada, e sem ela reunião
         * agendada e lead vendido não têm como ser reenviados depois.
         */
        console.error('[tally-meta] formulário embedado sem data-endpoint: a captação não será atribuída.');
        return;
      }

      var corpo = identidade();
      corpo.respondenteId = payload.respondentId;
      corpo.formularioId = payload.formId;

      /*
       * `keepalive` porque o formulário costuma redirecionar logo depois do
       * envio: sem ele o navegador cancela a requisição em curso e a atribuição
       * se perde exatamente nas conversões que mais convertem.
       */
      fetch(ENDPOINT, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      }).catch(function (erro) {
        console.error('[tally-meta] falha ao registrar a identidade da captação:', erro);
      });
    });
  }

  /*
   * Para o botão que não é `<a>` e navega por script: monta a URL do formulário
   * com a identidade já dentro.
   */
  window.focusTally = {
    url: function (enderecoDoFormulario) {
      var elemento = { href: enderecoDoFormulario };
      decorarLink(elemento);
      return elemento.href;
    },
  };

  guardarFbclid();
  ligarDecoracao();
  dispararLeadDaVolta();
  ouvirEmbed();
})();
