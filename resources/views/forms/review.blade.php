<x-app-layout>
    <div class="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <h1 class="text-3xl">Formulários sem atendimento vinculado</h1>
        <x-input-error :messages="$errors->all()" />

        @if ($appointment)
            <x-card>
                <p class="text-sm text-ink-muted">Atendimento selecionado</p>
                <h2 class="mt-2 break-words text-xl">{{ $appointment->client->name }}</h2>
                <p class="mt-2 text-sm">{{ $appointment->service->name }} · {{ App\Support\DisplayTimezone::toLocal($appointment->starts_at)->format('d/m/Y H:i') }}</p>
                <a href="{{ route('appointments.show', $appointment) }}" wire:navigate class="mt-3 inline-block text-sm text-primary underline">Voltar ao atendimento</a>
            </x-card>
        @else
            <p class="text-ink-muted">Abra o atendimento desejado e escolha “Revisar vínculos pendentes” para selecionar onde vincular o formulário.</p>
        @endif

        @forelse ($forms as $form)
            <x-card class="rise-in min-w-0">
                <h2 class="break-words text-xl">{{ $form->title }}</h2>
                <p class="mt-2 text-sm text-ink-muted">{{ $form->statusLabel() }}</p>
                <p class="mt-2 break-all text-xs text-ink-muted">Identificador externo: {{ $form->external_id }}</p>
                @if ($form->appointment_reference)
                    <p class="mt-1 break-all text-xs text-ink-muted">Referência recebida: {{ $form->appointment_reference }}</p>
                @endif
                @if ($openUrl = App\Support\FormLinks::open($form))
                    <a href="{{ $openUrl }}" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex min-h-11 items-center text-sm text-primary underline">Conferir formulário</a>
                @endif
                @if ($appointment)
                    <form method="POST" action="{{ route('forms.link', $form) }}" class="mt-3">
                        @csrf
                        <input type="hidden" name="appointment_id" value="{{ $appointment->integration_id }}">
                        <x-primary-button>Vincular a este atendimento</x-primary-button>
                    </form>
                @endif
            </x-card>
        @empty
            <p class="text-ink-muted">Nenhum formulário aguardando vínculo.</p>
        @endforelse

        {{ $forms->links() }}
    </div>
</x-app-layout>
