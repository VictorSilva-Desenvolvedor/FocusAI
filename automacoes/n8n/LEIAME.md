# Fluxos do n8n

Os `.json` desta pasta são exportação de `npm run n8n:fluxos`, e existem por uma
razão só: `API-R16` — fluxo que vive apenas dentro da ferramenta de automação é
lógica de negócio fora do repositório, sem revisão e sem histórico.

São **cópia para leitura e diff**, não a fonte da verdade: quem executa é a
instância do n8n. Editar o arquivo à mão não muda nada lá.

O que o exportador tira antes de gravar, e por que importa: `pinData` guarda o
dado fixado nos nós durante o teste, e esse dado sai de execução real — nome e
telefone de cliente final. Versionar isso seria dado pessoal no repositório
disfarçado de fixture. `staticData` guarda cursor e token entre execuções.

**O nó é fiação, não regra.** Todo `if` escrito dentro do n8n é uma regra de
negócio que ninguém encontra procurando pelo ID dela. O fluxo chama função de
borda ou função no banco; a decisão mora lá, onde a revisão acontece.

Segredo nunca vai dentro do nó — mora na credencial do n8n ou em `.secrets/`. O
exportador procura por token literal e falha quando acha, para que o achado não
passe como uma linha de log no meio da saída.
