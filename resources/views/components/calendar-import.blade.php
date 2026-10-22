@props(['createUrl'])
<x-card class="space-y-3" data-calendar-import data-create-url="{{ $createUrl }}">
    <h2 class="text-2xl">Importar de outra agenda</h2>
    <p class="text-sm text-ink-muted">No Google Agenda pelo computador, abra Configurações → Importar e exportar → Exportar. Extraia o ZIP e escolha um arquivo .ics. Você pode transferir esse arquivo para o celular.</p>
    <p class="text-sm text-ink-muted">O app Google Agenda não exporta arquivos. A leitura direta da conta Google depende da configuração OAuth e do servidor.</p>
    <label class="block text-sm" for="calendar-file">Arquivo .ics (até 2 MB)</label>
    <input id="calendar-file" data-calendar-file type="file" accept=".ics,text/calendar" class="block w-full min-w-0 text-sm">
    <p data-calendar-error role="alert" class="text-sm text-danger" hidden></p>
    <div data-calendar-results class="space-y-2"></div>
</x-card>
