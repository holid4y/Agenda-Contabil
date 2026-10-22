# Contatos e calendários

## O que funciona sem servidor

- “Escrever e-mail” abre o aplicativo do funcionário, com destinatário, assunto e
  mensagem preenchidos. O funcionário escolhe a conta remetente e confirma o envio.
- WhatsApp abre uma conversa com a mensagem pronta. O envio continua manual.
- “Google Agenda” abre a criação de uma cópia do atendimento na conta escolhida.
- Exportação `.ics` funciona no navegador; no Android/iOS, usa o compartilhamento
  de arquivos do sistema. O aplicativo escolhido precisa aceitar esse formato.
- Importação `.ics` lê eventos, apresenta uma revisão e pede atendido, serviço e
  responsável antes de salvar. No demo mobile, salva apenas no aparelho.

Abrir e-mail ou WhatsApp não altera `reminder_sent_at`. E-mails automáticos são
outra operação, executada pelo servidor e sujeita ao consentimento do atendido.
Atalhos de lembretes respeitam consentimento, conta ativa e perfil com escrita.
Os contatos da ficha permitem uma conversa manual sem presumir que seja lembrete.
A validação confere formato; não verifica se a caixa existe ou se o número possui
conta no WhatsApp. Telefones brasileiros exigem DDD válido e formato de celular
ou fixo; números internacionais exigem `+` e código do país.

## Google Agenda

O Google permite exportar arquivos pelo site no computador, em Configurações →
Importar e exportar. É necessário extrair o ZIP antes de selecionar o `.ics`.
O arquivo pode ser transferido ao celular. O aplicativo Google Agenda não oferece
exportação de arquivo. Referência: https://support.google.com/calendar/answer/37111

A cópia por link ou arquivo não é sincronização. Atualizações e cancelamentos na
plataforma não alteram automaticamente uma cópia já adicionada ao Google Agenda.
Leitura direta da conta e sincronização dependem de um projeto Google Cloud,
consentimento OAuth, URLs de retorno registradas e servidor. Essas conexões não
são simuladas pelo demo. Tokens do Google devem ficar criptografados no servidor;
não podem entrar no GitHub Pages, localStorage, código ou URLs de navegação.
Referência: https://developers.google.com/workspace/calendar/api/auth

## Importação e banco futuro

Web e mobile compartilham o parser ICS. Ele reconhece UTC, horários locais,
fusos IANA ou VTIMEZONE, recorrências, exceções e cancelamentos. Eventos de dia
inteiro, horários inválidos e períodos maiores que oito horas são apresentados
como avisos, sem criar atendimentos silenciosamente. A revisão do web não aceita
um evento que atravesse a meia-noite. O período aceito vai de um ano atrás até
dois anos à frente; cada arquivo pode ter até 2 MB e gerar até 500 ocorrências.

No web, a revisão preenche o formulário existente. A gravação segue as mesmas
regras de autorização, horário, serviço, checklist e histórico. O identificador
externo é indexado por SHA-256 em `appointments.calendar_import_key`, com índice
único. Execute `php artisan migrate` no ambiente do servidor ao atualizar.
No mobile em modo servidor, a gravação usa `scheduleAppointment` pela API já
documentada em `mobile/API.md`; o servidor deve aplicar a mesma regra de unicidade.

O calendário local continua sendo a fonte principal. A importação não usa um
título de evento como identidade de cliente nem cria consentimento de lembretes.
Dados de revisão do web ficam temporariamente em sessionStorage e são removidos
ao abrir o formulário. A prévia web do Pages é somente leitura; a importação
interativa fica no demo mobile, em `/app/`. Ambos permitem exportação.

O parser distribuído é ical.js 2.2.1, sem alterações, com licença MPL-2.0 e origem
registradas em `mobile/js/vendor/`. Nenhum arquivo é enviado a esse projeto ou ao
Google durante a leitura local de ICS.

A leitura de arquivos usa um worker separado no web e no mobile, com limite de
cinco segundos. Se uma recorrência inválida não terminar, a leitura é cancelada
e a interface continua disponível para selecionar outro arquivo.
