<?php

declare(strict_types=1);

namespace App\Domain\Forms;

use App\Models\Appointment;
use App\Models\ExternalForm;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

final class ReceiveFormEvent
{
    public function handle(array $data): array
    {
        try {
            return DB::transaction(fn (): array => $this->receive($data), 3);
        } catch (UniqueConstraintViolationException) {
            return DB::transaction(fn (): array => $this->receive($data), 3);
        }
    }

    private function receive(array $data): array
    {
        $hash = hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));
        $receipt = DB::table('form_webhook_events')->where('event_id', $data['event_id'])->lockForUpdate()->first();

        if ($receipt) {
            abort_unless(hash_equals($receipt->payload_hash, $hash), 409, 'Este event_id já foi usado com outros dados.');

            return ['result' => 'duplicate'];
        }

        $snapshot = $data;
        unset($snapshot['event_id']);
        $snapshotHash = hash('sha256', json_encode($snapshot, JSON_THROW_ON_ERROR));
        $form = ExternalForm::query()->where('external_id', $data['form_id'])->lockForUpdate()->first();

        if ($form && $form->source_version >= $data['version']) {
            if ($form->source_version === $data['version']) {
                abort_unless(hash_equals($form->snapshot_hash, $snapshotHash), 409, 'Uma versão existente não pode ser alterada.');
            }
            $result = 'ignored_old_version';
        } else {
            if ($form?->appointment_id !== null && $data['appointment_id'] !== null) {
                $linked = $form->appointment()->withTrashed()->firstOrFail();
                abort_unless($linked->integration_id === $data['appointment_id'], 409, 'O formulário já está vinculado a outro atendimento.');
            }

            $appointment = $data['appointment_id'] === null ? null
                : Appointment::query()->where('integration_id', $data['appointment_id'])->first();

            $form ??= new ExternalForm;
            $form->forceFill([
                'external_id' => $data['form_id'],
                'appointment_id' => $form->appointment_id ?? $appointment?->id,
                'appointment_reference' => $form->appointment_id === null ? $data['appointment_id'] : $form->appointment_reference,
                'title' => $data['title'],
                'status' => $data['status'],
                'url' => $data['url'],
                'source_version' => $data['version'],
                'source_updated_at' => $data['occurred_at'],
                'snapshot_hash' => $snapshotHash,
            ])->save();

            $result = $form->appointment_id === null ? 'pending_review' : 'linked';
        }

        DB::table('form_webhook_events')->insert([
            'event_id' => $data['event_id'],
            'external_form_id' => $form->id,
            'payload_hash' => $hash,
            'outcome' => $result,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ['result' => $result];
    }
}
