# Agenda Contábil — app de celular

Versão para celular da agenda do projeto Sustentabilidade Econômica e Financeira.
App Android/iOS com versão PWA para o navegador. O modo demonstração usa dados
fictícios no aparelho e funciona offline. O modo servidor usa a API descrita em
[API.md](API.md), que ainda precisa ser implementada.

Para testar o demo no navegador, basta um servidor estático. Os projetos nativos
precisam de Node e das ferramentas de Android/iOS.

Telas: login, início (resumo do dia), agenda (semana, dia e mês), atendidos
(busca, ficha e cadastro), novo atendimento em 3 passos, detalhe do atendimento
(status, documentos, lembrete, histórico, reagendamento), painel de impacto com
exportação em CSV e administração de serviços e documentos. Tema claro, escuro e
automático.

## Rodando

```sh
cd mobile
python3 -m http.server 8080
```

No notebook, abra `http://localhost:8080`. No celular, abra
`http://<ip do notebook>:8080`, com os dois na mesma rede Wi-Fi.

O modo instalável e o uso sem internet só funcionam em HTTPS ou em `localhost`.

O workflow `.github/workflows/preview.yml` já publica o app no GitHub Pages a cada
push na `main`, junto com a prévia do sistema web. Use o endereço exibido pelo
workflow de Pages e acrescente `/app/`. No navegador do celular, escolha
"Instalar app" ou "Adicionar à tela inicial". Depois de aberto uma vez, o demo
funciona offline.

Pages executa `npm run build:demo`: essa opção sempre gera a demonstração,
mesmo que existam variáveis de ambiente configuradas para um servidor. Só os
arquivos de `dist/` entram no site; projetos nativos, testes e dependências ficam
fora da publicação.

Login de demonstração (já vem preenchido): `admin@agenda.local` / `password`.
Também existem `equipe@agenda.local` e `visualizador@agenda.local`, com a mesma
senha. O perfil também troca pelo menu do avatar, sem sair.

Antes de apresentar, abra o menu do avatar e use "Restaurar dados de
demonstração". A agenda é montada em torno do dia em que os dados são criados;
se você testar um dia e apresentar em outro, o "hoje" fica vazio até restaurar.

Se alterar algum arquivo, aumente o número em `CACHE` no `sw.js`. Sem isso o
celular continua mostrando a versão antiga que está no cache.

## Testes

```sh
npm test
```

Cobrem as regras do PRD: conflito de horários, transições de status, cópia do
checklist ao agendar, permissões por perfil, lembretes, cadastro de atendidos e
os indicadores do painel.

## Telas e aparelhos

O layout acompanha a largura e a altura disponíveis, em retrato e paisagem,
sem moldura fixa. Em tablets, o conteúdo usa até 960px e os indicadores ganham
mais colunas. Campos, botões, fichas e menus quebram linha em telas estreitas.
O app respeita as áreas da câmera e da navegação do aparelho e ajusta a altura
visível quando o teclado abre. O PWA permite rotação.

As animações de navegação, login, tema e toque continuam ativas. A preferência
“reduzir movimento” do sistema desativa animações e transições.

Os projetos nativos têm como mínimo Android 7 (API 24) e iOS 15. É necessário
manter o Android System WebView atualizado. A versão PWA também abre no navegador.
A validação automatizada cobre larguras de 280 a 1920px, paisagem, rotação,
formulários, teclado simulado, áreas seguras, tema escuro e texto ampliado em
200%. Chromium e WebKit usam a mesma suíte.
Testes em aparelhos físicos continuam necessários antes de distribuir nas lojas.

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm run test:layout
```

## Estrutura

```
index.html, manifest.webmanifest, sw.js   PWA
css/app.css                               mesmos tokens do sistema web
js/data.js                                status, serviços e documentos
js/domain.js                              regras de negócio (agendar, conflito, status, permissões)
js/queries.js                             indicadores do painel de impacto
js/seed.js                                dados fictícios
js/store.js                               estado e operações do demo/API
js/api.js                                 transporte HTTP e autenticação
js/viewport.js                            altura visível e teclado
js/views/                                 uma tela por arquivo
tests/                                    testes de domínio, API e build
browser-tests/                            layout e interação (Playwright)
android/, ios/                            projetos nativos
```

Toda regra mora em `domain.js` e todo acesso a dados passa por `store.js`. As
telas chamam `store.action(...)` de forma assíncrona e leem `store.state`.

## Android e iOS (Capacitor 8)

O mesmo HTML/CSS do demo é empacotado nos projetos nativos `android/` e `ios/`.
Não depende de carregar o GitHub Pages dentro do aplicativo.

Requisitos: Node 22+, Android Studio e SDK Android para Android; macOS com
Xcode 26+ para iOS. O identificador inicial é `br.feevale.agendacontabil`;
ajuste `capacitor.config.json` e os projetos nativos antes de publicar.

```sh
cd mobile
npm ci
npm run android
npm run ios
```

No Android Studio, escolha um aparelho/emulador e execute o projeto. Para um
APK de teste: `cd android && ./gradlew assembleDebug`. No Xcode, selecione o
Time de assinatura e um aparelho/simulador antes de executar. Distribuição nas
lojas exige assinatura e contas de desenvolvedor próprias.

`npm run build` gera `dist/` em modo demonstração; `npm run sync` atualiza os
assets dos dois projetos. Execute novamente após mudar o JavaScript ou CSS.
Os arquivos copiados em `android/.../public` e `ios/.../public` são gerados.

## Ligando ao servidor futuro

O modo servidor já faz requisições reais, mas o servidor ainda precisa
implementar o [contrato da API](API.md). Não há conexão direta ao banco.

```sh
MOBILE_MODE=server MOBILE_API_URL=https://seu-servidor.example/api/v1 npm run sync
npx cap open android
# No macOS: npx cap open ios
```

Esse build remove o preenchimento de credenciais e os controles de demonstração.
Login, recuperação de senha, logout e todas as gravações usam a API.
O token e os dados ficam somente em memória; reabrir o app exige novo login.
Dados reais não entram no localStorage nem no cache offline do PWA. A recuperação
de senha envia um link para a página HTTPS do servidor.

O servidor é a autoridade para permissões, conflitos e validação. Em erro de rede
a alteração não é aplicada; em sessão expirada o app limpa os dados e volta ao
login. As telas de consulta e o CSV usam a fotografia autorizada do bootstrap.
Para dados grandes, adaptar o carregamento para paginação no `store.js`.

## Pendências conhecidas

- E-mail e telefone do projeto vêm da ficha de papel
  (`projetosustentabilidade@feevale.br`, `99125-1538`). O DDD `51` foi suposto.
  Ajuste em `PROJECT` no `js/data.js`.
- O lembrete por e-mail é simulado em modo demonstração. O envio real é do Laravel (`appointments:send-reminders`). O botão do WhatsApp já abre a
  conversa de verdade com a mensagem pronta.
- O link de confirmar/cancelar do lembrete depende do servidor (URL assinada).
