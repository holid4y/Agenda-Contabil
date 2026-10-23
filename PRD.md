# PRD — Sustentabilidade Econômica e Financeira
## Agenda e Gestão de Atendimentos

**Status:** Draft v2 — escopo ampliado com checklist de documentos, lembretes e painel de impacto
**Stack principal:** PHP + Laravel + PostgreSQL
**Idioma da interface:** Português (pt-BR)
**Objetivo:** iniciar um repositório organizado, testável e preparado para crescer para web, API e integrações de agenda.

---

## 1. Visão do produto

**Contexto.** Projeto social do curso de Ciências Contábeis da Universidade Feevale. Objetivo do projeto: orientar organizações com e sem fins lucrativos que apresentam carências nas áreas financeira, fiscal e contábil, visando a sustentabilidade e a perpetuidade delas. Público-alvo: pequenas empresas, entidades do terceiro setor, MEIs e pessoas físicas do Vale do Rio dos Sinos e das cidades de atuação da universidade. Os atendimentos acontecem na universidade, em locais parceiros (ex.: Sala do Empreendedor de uma prefeitura) e on-line, o que justifica o campo tipo/local do atendimento.

O produto é uma plataforma de agenda e gestão de atendimentos para o projeto de Sustentabilidade Econômica e Financeira.

A agenda é a interface central, mas o conceito principal do domínio é **Atendimento**.

O sistema deve permitir que a equipe:

- cadastre pessoas físicas e jurídicas;
- agende atendimentos;
- classifique demandas e serviços;
- atribua responsáveis;
- acompanhe status e histórico;
- consulte atendimentos anteriores;
- informe ao atendido, antes do atendimento, quais documentos ele precisa trazer;
- envie lembretes e permita que o atendido confirme ou cancele sem precisar de login;
- meça o impacto social do projeto com indicadores prontos para relatórios;
- opere de forma responsiva no desktop e celular;
- futuramente sincronize eventos com calendários externos, incluindo Google Calendar, Outlook, ICS/CalDAV e, se tecnicamente possível, Mundy.

O sistema **não** deve depender de Mundy ou de qualquer calendário externo para funcionar. O banco local é a fonte canônica dos dados.

## 2. Objetivo do MVP

Entregar uma aplicação web funcional que permita realizar o fluxo:

1. autenticar usuário;
2. cadastrar ou localizar um atendido;
3. criar um atendimento;
4. selecionar data e horário;
5. selecionar demanda/serviço;
6. atribuir responsável;
7. visualizar o atendimento na agenda;
8. alterar status, reagendar ou cancelar;
9. consultar histórico do atendido;
10. marcar os documentos entregues pelo atendido;
11. enviar lembrete com a lista de documentos;
12. consultar o painel de impacto.

## 3. Usuários do sistema

### 3.1 Administrador

Pode: gerenciar usuários; gerenciar permissões; cadastrar e editar serviços/categorias; acessar todos os atendimentos; acessar relatórios; editar configurações; gerenciar integrações.

### 3.2 Membro da equipe

Pode: consultar agenda; criar e editar atendimentos; cadastrar atendidos; consultar histórico; atualizar status; acessar relatórios permitidos.

### 3.3 Visualizador

Pode: consultar agenda; consultar atendimentos autorizados; consultar relatórios autorizados; **não** pode excluir ou alterar dados sensíveis.

O sistema deve usar autorização por Policies/Gates e não apenas esconder botões no frontend.

## 4. Escopo funcional

### 4.1 Autenticação

- **RF-001** — O sistema deve permitir login com e-mail e senha.
- **RF-002** — O sistema deve permitir logout.
- **RF-003** — O sistema deve possuir recuperação de senha.
- **RF-004** — O sistema deve impedir acesso às áreas privadas sem autenticação.

## 5. Atendidos

O termo de domínio preferencial é **Atendido**. Internamente, o model pode ser `Client`, desde que a interface utilize "Atendido".

- **RF-010 — Cadastro de atendidos.** Campos mínimos: nome / razão social; tipo (Pessoa Física ou Pessoa Jurídica); telefone; e-mail; documento opcional; nome fantasia opcional; observações opcionais; ativo/inativo; consentimento para receber lembretes (LGPD, desmarcado por padrão).
- **RF-011 — Pesquisa.** Permitir pesquisar por nome, razão social, telefone, e-mail e documento (quando informado).
- **RF-012 — Histórico.** A tela do atendido deve listar seus atendimentos anteriores e futuros.
- **RF-013 — Reutilização.** Ao criar um novo atendimento, deve ser possível selecionar um atendido já existente sem duplicar seus dados.

## 6. Agenda e atendimentos

- **RF-020 — Criar atendimento.** Obrigatórios: atendido; data; horário inicial; horário final; demanda/serviço; responsável; status. Opcionais: localização; tipo/local de atendimento; observações.
- **RF-021 — Dia da semana.** Derivado automaticamente da data. Não armazenar como fonte de verdade no banco.
- **RF-022 — Visualização da agenda.** Visões mensal, semanal e diária. Utilizar FullCalendar ou solução compatível.
- **RF-023 — Reagendamento.** Alterar data e horário mantendo o histórico do registro.
- **RF-024 — Cancelamento.** Não apaga o registro; o status passa a `cancelled`.
- **RF-025 — Exclusão.** Exclusão física não disponível para usuários comuns. Preferir soft delete ou manter registros de auditoria.
- **RF-026 — Conflito de horários.** Impedir conflito para o mesmo responsável quando os períodos se sobrepõem:

  ```
  novo_inicio < atendimento_existente_fim
  AND
  novo_fim    > atendimento_existente_inicio
  ```

  Atendimentos cancelados não bloqueiam horário.
- **RF-027 — Status.** Valores iniciais (enum PHP): `scheduled` (Agendado), `confirmed` (Confirmado), `in_progress` (Em atendimento), `completed` (Concluído), `cancelled` (Cancelado), `no_show` (Não compareceu).
- **RF-028 — Responsável.** Cada atendimento possui um responsável principal. A arquitetura deve permitir múltiplos participantes no futuro sem reescrita completa.

## 7. Demandas e serviços

As demandas devem ser administráveis pelo sistema. Não codificar permanentemente todas as opções em enums.

**Categorias iniciais:**

- **Fiscal** — declaração de imposto de renda; IRPF; pessoa jurídica; MEI; emissão de guias para pagamento de tributos; outras informações fiscais.
- **Finanças pessoais** — fluxo de caixa; planejamento financeiro; orçamento familiar e pessoal; outras demandas pessoais.
- **Empresarial** — fluxo de caixa; planejamento financeiro; formação do preço de venda; cálculo de custos; orçamento empresarial; mapeamento de processos; outras informações financeiras e societárias.
- **Terceiro setor / ONG** — prestação de contas; elaboração de demonstrações contábeis; relatório de responsabilidade social; outras demandas do terceiro setor.
- **Outros** — deve existir uma opção que permita descrição livre.

- **RF-030** — Administrador deve poder criar, editar e desativar categorias e serviços. Registros históricos devem continuar exibindo serviços desativados.

### 7.1 Checklist de documentos

A maior causa de retrabalho em atendimentos fiscais é o atendido chegar sem os documentos. Cada serviço mantém a lista do que precisa ser trazido.

- **RF-031** — Cada serviço possui uma lista ordenada de documentos, editável pelo administrador.
- **RF-032** — Ao agendar, a lista do serviço é **copiada** para o atendimento. Alterar a lista do serviço depois não reescreve atendimentos existentes.
- **RF-033** — A equipe marca cada documento como entregue; o sistema registra quando.
- **RF-034** — O sistema registra apenas **que** o documento foi entregue. Nenhum arquivo é enviado ou armazenado (RNF-007).

## 8. Dashboard e painel de impacto

- **RF-040** — Após login, mostrar: atendimentos de hoje; próximos atendimentos; total de atendimentos no período; quantidade por status; quantidade PF × PJ; principais demandas.
- **RF-041 — Painel de impacto.** Indicadores do projeto para relatórios institucionais: pessoas atendidas por mês; atendidos únicos; PF × PJ; atendimentos de MEI e de ONGs; demandas mais frequentes; taxa de comparecimento; atendimentos por responsável.
- **RF-042** — Todos os indicadores aceitam filtro de período e podem ser exportados em CSV.
- **RF-043** — Cada indicador deve ser calculado por uma consulta isolada e testada, nunca dentro da view.

Não criar dashboard excessivamente complexo no primeiro milestone.

## 9. Relatórios

- **RF-050 — Filtros mínimos:** período; responsável; tipo de atendido; categoria; serviço; status.
- **RF-051 — Indicadores mínimos:** total de atendimentos; concluídos; cancelados; não comparecimentos; quantidade de PF; quantidade de PJ; quantidade de MEIs (quando identificável pela classificação); quantidade de ONGs/terceiro setor; demandas mais frequentes; atendimentos por responsável.
- **RF-052** — Preparar arquitetura para exportação futura em CSV, XLSX e PDF. A exportação não precisa estar pronta no primeiro commit.

### 9.1 Lembretes e confirmação

- **RF-070** — O sistema envia lembrete por e-mail antes do atendimento (padrão: 24 horas) somente para atendidos com consentimento (RF-010).
- **RF-071** — O lembrete contém data, horário, local e a lista de documentos do atendimento.
- **RF-072** — O lembrete traz links assinados e com validade para **confirmar** ou **cancelar**, sem exigir login.
- **RF-073** — Cada atendimento recebe no máximo um lembrete automático; o envio fica registrado.
- **RF-074** — WhatsApp, fase 1: botão "Enviar pelo WhatsApp" que abre a conversa com a mensagem pronta (`wa.me`), sem API paga.
- **RF-075** — WhatsApp, fase 2 (somente com conta Business fornecida pelo cliente): envio automático como mais um canal de notificação, sem mudar o restante do fluxo.

## 10. Auditoria

- **RF-060** — Registrar pelo menos: quem criou o atendimento; quem alterou; quando foi criado; quando foi alterado.
- **RF-061** — Mudanças relevantes devem possuir histórico: criação; mudança de horário; mudança de status; troca de responsável; cancelamento.

Implementação sugerida: tabela `appointment_activities` ou biblioteca de activity log confiável.

## 11. Integrações de calendário

As integrações não fazem parte do primeiro milestone funcional, mas a arquitetura deve estar preparada desde o início. A entidade `Appointment` local é **sempre** a fonte canônica.

**Providers planejados:** Google Calendar; Outlook Calendar; ICS; CalDAV; Mundy (caso possua API, CalDAV, ICS ou mecanismo compatível).

**Interface obrigatória:**

```php
interface CalendarProvider
{
    public function createEvent(Appointment $appointment): ExternalEventReference;

    public function updateEvent(
        Appointment $appointment,
        ExternalEventReference $reference
    ): ExternalEventReference;

    public function deleteEvent(
        Appointment $appointment,
        ExternalEventReference $reference
    ): void;
}
```

Não implementar providers falsos apenas para "completar" a estrutura. Pode haver um `NullCalendarProvider` apenas se houver um uso concreto e testado.

**Estrutura planejada:**

- `calendar_connections`: `id`, `user_id`, `provider`, `external_calendar_id`, `credentials_encrypted`, `sync_cursor`, `last_synced_at`, timestamps.
- `external_event_links`: `id`, `appointment_id`, `calendar_connection_id`, `external_event_id`, `external_updated_at`, `last_synced_at`, timestamps.

Tokens nunca devem ser armazenados em texto puro.

## 12. Requisitos não funcionais

- **RNF-001 — Responsividade.** Desktop, tablet e smartphone. O MVP é web responsivo; app Android nativo/híbrido fica fora do escopo inicial.
- **RNF-002 — Idioma.** UI em pt-BR. Código, classes, métodos, nomes de tabela e documentação técnica em inglês consistente.
- **RNF-003 — Banco de dados.** PostgreSQL.
- **RNF-004 — Timezone.** Padrão `America/Sao_Paulo`. Preferência: persistir em UTC e apresentar em `America/Sao_Paulo`. Documentar a decisão.
- **RNF-005 — Testes.** Fluxos críticos com testes automatizados. Prioridade: conflito de horários; autorização; criação de atendimento; reagendamento; cancelamento; filtros de relatório.
- **RNF-006 — Segurança.** CSRF habilitado; validação server-side; prepared queries via ORM; rate limiting onde aplicável; passwords com hashing padrão Laravel; dados sensíveis nunca em logs; secrets apenas em `.env`; `.env` nunca versionado.
- **RNF-007 — LGPD.** Minimização de dados. Não armazenar dados fiscais, documentos ou informações financeiras desnecessários ao objetivo operacional. Preparar: controle de acesso; auditoria; política de retenção; anonimização/remoção quando aplicável.
- **RNF-008 — Acessibilidade.** HTML semântico; labels em formulários; navegação por teclado; contraste legível; mensagens de validação compreensíveis.
- **RNF-009 — Manutenibilidade.** Detalhada na seção 27.
- **RNF-010 — Usabilidade.** Detalhada na seção 21.

## 13. Stack técnica

**Backend e Web:** PHP 8.3+; Laravel 13 ou versão estável disponível; Laravel Livewire; Blade; Tailwind CSS.

**Admin:** usar Filament somente onde reduzir significativamente boilerplate. Não duplicar telas entre Filament e aplicação principal sem necessidade.

**Agenda:** FullCalendar; adapter próprio para transformar `Appointment` em eventos do calendário.

**Banco:** PostgreSQL.

**API:** REST em `/api/v1`; Laravel Sanctum; resources JSON; Form Requests; Policies. Criada de maneira incremental.

**Cache/Queues:** Redis é recomendado, mas não obrigatório no desenvolvimento local inicial. Usar database queue inicialmente se isso simplificar onboarding.

## 14. Arquitetura de software

Laravel convencional com separação de domínio suficiente para evitar controllers gigantes. Evitar "Clean Architecture" cerimonial e excesso de abstrações.

```
app/
├── Console/Commands/
├── Domain/
│   ├── Appointments/{Actions, Enums, Queries}
│   ├── Clients/{Enums, Queries}
│   ├── Services/Actions
│   └── Users/Enums
├── Http/
│   ├── Controllers/
│   ├── Middleware/
│   ├── Requests/
│   └── Resources/
├── Livewire/{Appointments, Clients, Services, Forms}
├── Models/            # todos os models Eloquent
├── Notifications/
├── Policies/
├── Rules/
├── Providers/
└── Support/
```

**Observação:** não criar diretórios vazios apenas para corresponder ao desenho. Criar cada diretório quando existir uma classe real que justifique sua existência.

**Models Eloquent ficam em `app/Models`** (convenção do Laravel: factories, policies e route model binding funcionam sem configuração). `app/Domain` guarda o que é regra: Actions, Enums, Queries.

## 15. Estrutura do repositório

```
/
├── app/  bootstrap/  config/
├── database/{factories, migrations, seeders}
├── docs/screenshots/
├── public/
├── resources/{css, js/calendar, views}
├── routes/{web.php, api.php, console.php}
├── storage/
├── tests/
│   ├── Feature/{Appointments, Auth, Clients, Reports}
│   └── Unit/
├── .editorconfig  .env.example  .gitignore
├── PRD.md  README.md
├── composer.json  package.json  phpunit.xml
```

## 16. Modelo de dados inicial

### `users`

Model padrão do Laravel acrescido de `role` e `active`. Preferencialmente implementar papéis de maneira simples no MVP. Caso seja utilizada uma biblioteca de permissions, justificar no README.

### `clients`

```
id                  bigint
type                enum/string: individual | organization
name                varchar            -- nome (PF) ou razão social (PJ)
trade_name          nullable
document            nullable
phone               nullable
email               nullable
notes               nullable text
accepts_reminders   boolean default false
active              boolean default true
created_at / updated_at / deleted_at nullable
```

Criar índices apropriados para busca.

### `service_categories`

```
id, name, slug, description nullable, active boolean, sort_order integer, timestamps
```

### `services`

```
id, service_category_id, name, slug, description nullable,
active boolean, sort_order integer, timestamps
```

### `service_documents`

```
id, service_id, name, description nullable, sort_order, timestamps
```

### `appointments`

```
id
client_id
service_id
service_details nullable   -- descrição livre para o serviço "Outros"
responsible_user_id
starts_at timestamp
ends_at   timestamp
status
location_type nullable
location      nullable
notes         nullable
created_by
updated_by nullable
created_at / updated_at / deleted_at nullable
```

**Constraints:** `ends_at > starts_at`; FKs obrigatórias; índices em `starts_at`, `responsible_user_id`, `status`; índice composto útil para consultas da agenda. O conflito de horário (RD-002) também é garantido pelo banco com uma *exclusion constraint* (`btree_gist`), para que duas requisições simultâneas não gravem horários sobrepostos.

### `appointment_documents`

```
id, appointment_id, name, sort_order, received_at nullable, timestamps
```

Cópia do checklist do serviço no momento do agendamento (RF-032).

`reminder_sent_at` entra em `appointments` somente no milestone de lembretes.

### `appointment_activities`

```
id, appointment_id, user_id nullable, event_type,
old_values jsonb nullable, new_values jsonb nullable, created_at
```

### `calendar_connections` e `external_event_links`

Criar somente quando a primeira integração for implementada.

## 17. Seed inicial de serviços

Criar seeders **idempotentes**.

**Categorias:** Fiscal; Finanças Pessoais; Empresarial; Terceiro Setor; Outros.

**Serviços iniciais:** Fluxo de caixa; Planejamento financeiro; Declaração de imposto de renda; IRPF; Atendimento MEI; Emissão de guias para pagamento de tributos; Prestação de contas para entidades do terceiro setor; Formação do preço de venda; Cálculo de custos; Orçamento familiar e pessoal; Orçamento empresarial; Mapeamento de processos; Elaboração de demonstrações contábeis; Elaboração de relatório de responsabilidade social; Atendimento externo; Outros.

Não duplicar "Orçamento familiar e pessoal" ou "Orçamento empresarial" caso apareçam repetidos na fonte original.

**Checklists iniciais:** IRPF e declaração de imposto de renda; atendimento MEI; emissão de guias; prestação de contas do terceiro setor; orçamento familiar; fluxo de caixa; formação de preço; cálculo de custos. Os demais serviços começam sem lista e o administrador completa depois.

## 18. Rotas web

Caminhos em português, porque aparecem para o usuário na barra de endereço.

```
GET   /dashboard
GET   /agenda
GET   /agenda/eventos                     # JSON para o FullCalendar
PATCH /atendimentos/{appointment}/horario # arrastar na agenda

GET /atendidos
GET /atendidos/novo
GET /atendidos/{client}
GET /atendidos/{client}/editar

GET /atendimentos/novo?inicio=&fim=&atendido=
GET /atendimentos/{appointment}

GET /relatorios        # Milestone 5
GET /configuracoes     # administração do catálogo
```

As ações de formulário são Livewire e não mapeiam 1:1 para controllers.

## 19. API planejada

Prefixo `/api/v1`. Endpoints mínimos futuros:

```
GET    /appointments
POST   /appointments
GET    /appointments/{id}
PATCH  /appointments/{id}
POST   /appointments/{id}/cancel

GET    /clients
POST   /clients
GET    /clients/{id}
PATCH  /clients/{id}

GET    /services
```

Aplicar: API Resources; Form Requests; Policies; paginação; filtros previsíveis; status HTTP corretos.

## 20. Regras de domínio

- **RD-001** — `ends_at` precisa ser posterior a `starts_at`.
- **RD-002** — Um usuário responsável não pode possuir dois atendimentos ativos com horários sobrepostos. Statuses ativos para conflito: `scheduled`, `confirmed`, `in_progress`.
- **RD-003** — Atendimento cancelado permanece no banco.
- **RD-004** — Serviço desativado não pode ser selecionado para novo atendimento, mas continua aparecendo no histórico.
- **RD-005** — Atendido inativo permanece associado ao histórico.
- **RD-006** — Mudanças críticas geram `appointment_activity`.
- **RD-007** — O cliente não deve ser excluído fisicamente se possuir histórico de atendimento.

## 21. Usabilidade

O sistema será usado por estudantes em rodízio, muitas vezes sem treinamento. Qualquer pessoa da equipe deve conseguir agendar um atendimento na primeira vez que abrir o sistema.

**Princípios:**

- **Fluxo principal em até 3 passos:** buscar ou cadastrar atendido → escolher serviço e horário → salvar. Sem trocar de tela.
- **O sistema pensa pela pessoa:** duração sugerida pelo serviço; responsável padrão é quem está logado; dia da semana e checklist aparecem sozinhos; horários ocupados já vêm indicados antes de salvar.
- **Erro explicado e com saída:** mensagens dizem o que houve e o que fazer ("Maria já tem atendimento das 14:00 às 15:00. Escolha outro horário ou outro responsável."). Nunca códigos ou termos técnicos.
- **Ações destrutivas pedem confirmação e têm desfazer quando possível.** Cancelar nunca apaga.
- **Vocabulário do usuário:** "Atendido", "Atendimento", "Demanda". Nada de "registro", "entidade", "ID".
- **Estado sempre visível:** status com cor **e** texto (nunca só cor); documentos pendentes com contador.
- **Mobile de verdade:** botões com área de toque ≥ 44px, formulários de uma coluna no celular, agenda em visão de lista no celular.
- **Rápido:** busca de atendido com resposta enquanto digita; páginas principais abaixo de 1 segundo com dados reais.
- **Acessível:** navegação completa por teclado, foco visível, labels em todos os campos (RNF-008).

**Critério de validação:** antes de cada entrega, uma pessoa que nunca usou o sistema tenta agendar um atendimento sem ajuda. Se travar, é bug de usabilidade.

### 21.1 Telas

**Agenda.** Cada evento deve mostrar horário; nome do atendido; serviço ou categoria; status de forma visual. Ao clicar, abrir detalhes do atendimento.

**Formulário de atendimento.** Ordem sugerida: Atendido; Serviço; Data; Horário inicial; Horário final; Responsável; Tipo/local; Observações; Status.

A busca de atendido deve ser rápida. Incluir ação "Cadastrar novo atendido" sem abandonar o fluxo de criação do atendimento.

## 22. Página de atendido

Mostrar: nome; tipo; telefone; e-mail; dados institucionais quando PJ; observações; próximos atendimentos; histórico de atendimentos.

Não exibir dados sensíveis desnecessariamente em listas.

## 23. Design

**Direção:** quente, orgânico e institucional — parece papel impresso, não painel de software.

- **Tipografia serifada.** Fraunces (títulos, eixo `SOFT` para terminais arredondados) e Literata (texto, desenhada para leitura em tela, com tamanho óptico). Fontes empacotadas pelo Vite, sem requisição a serviços externos (RNF-007).
- **Paleta.** Neutros de papel (claro) e madeira escura (escuro); verde-azulado vindo do material impresso do projeto como cor principal; terracota, musgo e ocre para destaques e estados.
- **Tema claro, escuro e automático.** O usuário escolhe; "automático" segue o sistema operacional. A escolha é aplicada antes da primeira pintura, sem piscar.
- **Tokens, não cores soltas.** A paleta padrão do Tailwind é removida; views só usam tokens semânticos (`bg-surface`, `text-ink-muted`, `bg-primary`…), que mudam sozinhos entre os temas.
- **Contraste.** Todo par texto/fundo tem no mínimo 4,5:1 nos dois temas (RNF-008).
- **Forma.** Cantos generosos, botões em pílula, bordas finas em vez de sombras pesadas, textura sutil de papel no fundo. Sem animações além de transições de cor.
- **Identidade.** Marca própria redesenhada a partir do símbolo do material impresso (cifrão entre setas circulares). Logos oficiais da universidade só com os arquivos e a autorização da instituição.

## 24. Out of scope do MVP

Não implementar no primeiro milestone: aplicativo Android; sincronização Mundy; Google Calendar; Outlook; CalDAV; pagamento; chat; videoconferência; CRM completo; armazenamento de documentos fiscais (o checklist registra apenas a entrega); envio automático por WhatsApp sem conta Business do cliente; automações complexas; BI avançado; multi-tenant; divulgação e inscrição em oficinas e mutirões (candidata a milestone futuro).

A arquitetura não deve impedir essas evoluções.

## 25. Milestones

### Milestone 0 — Bootstrap do repositório (concluído)

**Objetivo:** projeto executa localmente e CI passa.

**Entregáveis:** Laravel instalado; PostgreSQL configurado; `.env.example`; README; autenticação; formatter/linter; test runner; CI; estrutura inicial; seed de usuário de desenvolvimento documentado.

**Aceite:**

```sh
composer install
npm install
php artisan migrate --seed
npm run build
php artisan test
```

### Milestone 1 — Domínio principal (concluído)

**Entregáveis:** `Client`; `ServiceCategory`; `Service`; `ServiceDocument`; `Appointment`; `AppointmentDocument`; `AppointmentActivity`; enums com transições de status; actions de agendar, reagendar, trocar responsável e mudar status; conflito de horários na aplicação e no banco; policies; seed do catálogo e dos checklists; testes.

**Aceite:** é possível cadastrar atendido e atendimento pelo backend/testes; o checklist é copiado ao agendar; conflitos são bloqueados.

### Milestone 2 — Interface operacional (concluído)

**Entregáveis:** dashboard básico; CRUD de atendidos; CRUD de atendimentos; busca; filtros; validação; histórico do atendido; marcação de documentos entregues; administração de serviços e checklists.

**Aceite:** usuário consegue realizar o fluxo operacional sem usar banco/CLI, seguindo os princípios da seção 21.

### Milestone 3 — Agenda (concluído)

**Entregáveis:** FullCalendar; month/week/day (lista no celular); criação a partir de slot; edição; reagendamento por arrastar; filtros por responsável/status; detalhes.

**Aceite:** agenda reflete corretamente registros do banco e respeita autorização.

### Milestone 4 — Lembretes (concluído)

**Entregáveis:** comando agendado de lembretes; notificação por e-mail com checklist; links assinados de confirmação/cancelamento; botão WhatsApp (`wa.me`); `reminder_sent_at`.

**Aceite:** atendido com consentimento recebe um único lembrete e consegue confirmar ou cancelar pelo link.

### Milestone 5 — Painel de impacto, relatórios e auditoria

**Entregáveis:** indicadores de RF-040 a RF-043 e RF-051; filtros; exportação CSV; activity log visível no atendimento.

### Milestone 6 — API (concluído para o app)

**Entregáveis:** Sanctum; `/api/v1`; endpoints essenciais; OpenAPI ou documentação equivalente; feature tests. Preparar para futuro Android app.

O app usa um contrato próprio (`docs/mobile-integration.md`, `mobile/API.md`): login, fotografia do estado e uma lista fechada de comandos sobre as mesmas Actions da web. Os endpoints REST da seção 19 continuam como referência para integrações futuras.

### Milestone 7 — Integrações

Somente iniciar após confirmação de provider. Primeiro provider recomendado: Google Calendar. Mundy só deve ser implementado após confirmar oficialmente um mecanismo suportado. WhatsApp fase 2 (RF-075) entra aqui.

## 26. Estratégia de testes

Utilizar PHPUnit **ou** Pest de forma consistente. Não misturar estilos sem necessidade.

**Testes obrigatórios:**

- `AppointmentConflictTest` — cria quando não há conflito; bloqueia sobreposição parcial; bloqueia evento dentro de outro; bloqueia evento que contém outro; permite evento adjacente; permite conflito entre responsáveis diferentes; ignora cancelados.
- `AppointmentAuthorizationTest` — usuário autorizado visualiza; usuário sem permissão não edita; visualizador não cancela.
- `AppointmentLifecycleTest` — criação; confirmação; conclusão; cancelamento; reagendamento.
- `ClientHistoryTest` — histórico lista somente atendimentos corretos; ordenação correta; serviços desativados continuam visíveis.
- `AppointmentChecklistTest` — checklist copiado ao agendar; mudança no serviço não altera atendimentos existentes; marcação de entrega.
- `ServiceCatalogSeederTest` — seeder idempotente.
- `AppointmentReminderTest` (M4) — só envia com consentimento; nunca envia duas vezes; links assinados expiram.
- Testes de cada indicador do painel de impacto (M5) com dados conhecidos.

## 27. Manutenibilidade e convenções de código

O projeto será mantido por turmas diferentes ao longo dos semestres. O código precisa ser entendido por quem chega sem contexto.

**Regras de estrutura:**

- **Uma classe, uma responsabilidade, nome de ação:** `ScheduleAppointment`, `RescheduleAppointment`. O nome diz o que faz; não existem `AppointmentService`, `Helper`, `Manager` ou `Utils`.
- **Regras de domínio moram em um lugar só.** Transições de status ficam no enum `AppointmentStatus`; conflito de horário em uma única classe; indicadores em classes de `Queries`. Controllers e componentes Livewire apenas recebem entrada e chamam essas classes.
- **Regras críticas também no banco:** `CHECK`, chaves estrangeiras e *exclusion constraint* garantem integridade mesmo que alguém esqueça a regra no código.
- **Textos de interface em `lang/pt_BR`**, nunca em Blade ou PHP.

**Regras de estilo:**

- **Sem cadeias de `else`/`elseif`.** Usar retorno antecipado (*guard clauses*), `match` para mapear valores e tabelas de dados (ex.: transições permitidas) em vez de condicionais aninhadas.
- **Comentários explicam o porquê**, nunca repetem o que o código diz. Docblocks só quando acrescentam informação que o tipo não expressa (ex.: `@return Collection<int, Appointment>`).
- **Erros explícitos:** regra violada lança `ValidationException` com mensagem para o usuário. Sem `try/catch` que só registra e relança.
- **Sem código defensivo inútil:** não checar `null` em valores tipados como não nulos.
- **Tipos em tudo:** parâmetros, retornos, propriedades e enums nativos do PHP.

**Garantias automáticas:** Pint na CI; testes contra PostgreSQL real (não SQLite), porque parte das regras vive no banco; todo comportamento novo acompanha teste.

**Convenções gerais:**

- PSR-12;
- `declare(strict_types=1);` em código de domínio quando apropriado;
- Laravel Pint;
- tipos de retorno;
- Form Requests para validação de HTTP;
- Policies para autorização;
- Actions para operações de domínio que ultrapassem CRUD trivial;
- queries complexas encapsuladas;
- evitar lógica de negócio em Blade;
- evitar lógica grande em controllers;
- evitar repositories genéricos em cima de Eloquent;
- evitar interfaces sem necessidade;
- evitar abstração prematura.

## 28. Convenções Git

```
main
develop
feature/*
fix/*
chore/*
```

Se o projeto for pequeno, `develop` pode ser omitida.

Commits: preferir Conventional Commits.

```
feat: add appointment scheduling
fix: prevent overlapping appointments
test: cover appointment conflict rules
docs: document calendar integration strategy
```

## 29. CI

GitHub Actions. Pipeline mínimo: checkout; PHP setup; Node setup; `composer install`; `npm ci`; build frontend; Laravel Pint check; migrations em banco de teste; testes.

Não adicionar deploy automático no início.

## 30. README inicial

Deve conter: visão geral; requisitos; setup local; PostgreSQL; `.env`; migrations; seed; execução; testes; build frontend; arquitetura resumida; link para `PRD.md`.

## 31. Definition of Done

Uma feature só está concluída se:

- comportamento requerido foi implementado;
- validações existem;
- autorização foi considerada;
- testes relevantes passam;
- formatter passa;
- migrations são reversíveis quando razoável;
- sem secrets versionados;
- documentação foi atualizada quando necessário;
- não há TODO crítico ocultando funcionalidade quebrada.

## 32. Critérios de aceite do MVP

O MVP estará funcional quando: usuário consegue autenticar; checklist de documentos é copiado e marcado; lembrete é enviado uma única vez com links de confirmação; painel de impacto exibe indicadores filtráveis por período; cadastrar PF; cadastrar PJ; buscar atendido existente; criar atendimento; data e horário armazenados corretamente; dia da semana derivado automaticamente; selecionar demanda/serviço; atribuir responsável; conflitos de horário bloqueados; visualizar agenda dia/semana/mês; reagendar; cancelar; histórico do atendido funciona; filtros principais funcionam; dashboard apresenta indicadores básicos; permissões impedem operações indevidas; auditoria registra mudanças críticas; testes críticos passam; aplicação funciona em desktop e mobile browser; projeto sobe seguindo apenas o README.

## 33. Princípio arquitetural principal

> **A agenda é a interface principal; Atendimento é o domínio principal; Laravel/PostgreSQL é a fonte de verdade.**

Qualquer integração externa deve depender do domínio local, nunca o contrário.
