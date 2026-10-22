@props(['appointment'])
@php
    $event = [
        'uid' => 'atendimento-'.$appointment->id.'@agenda-contabil',
        'title' => $appointment->service->name.' · '.$appointment->client->name,
        'start' => $appointment->starts_at->getTimestampMs(),
        'end' => $appointment->ends_at->getTimestampMs(),
        'location' => $appointment->location ?? '',
        'description' => 'Atendimento da Agenda Contábil. Confira os detalhes e documentos na plataforma.',
    ];
    $googleUrl = 'https://calendar.google.com/calendar/render?'.http_build_query([
        'action' => 'TEMPLATE',
        'text' => $event['title'],
        'dates' => $appointment->starts_at->copy()->utc()->format('Ymd\THis\Z').'/'.$appointment->ends_at->copy()->utc()->format('Ymd\THis\Z'),
        'details' => $event['description'],
        'location' => $event['location'],
        'ctz' => 'America/Sao_Paulo',
    ], '', '&', PHP_QUERY_RFC3986);
@endphp
@if ($appointment->status !== App\Domain\Appointments\Enums\AppointmentStatus::Cancelled)
    <x-card class="space-y-3" data-calendar-event="{{ json_encode($event) }}">
        <h2 class="text-2xl">Adicionar à minha agenda</h2>
        <p class="text-sm text-ink-muted">Uma cópia será criada. Alterações futuras não são sincronizadas automaticamente.</p>
        <div class="flex flex-wrap gap-2">
            <a data-calendar-google href="{{ $googleUrl }}" target="_blank" rel="noopener noreferrer" class="press inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-sm font-semibold">Google Agenda</a>
            <button data-calendar-download type="button" class="press min-h-11 rounded-full border border-line px-4 py-2 text-sm font-semibold">Baixar calendário (.ics)</button>
        </div>
    </x-card>
@endif
