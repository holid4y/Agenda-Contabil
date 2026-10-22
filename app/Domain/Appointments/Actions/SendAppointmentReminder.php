<?php

declare(strict_types=1);

namespace App\Domain\Appointments\Actions;

use App\Domain\Appointments\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Notifications\AppointmentReminder;

final class SendAppointmentReminder
{
    public function handle(Appointment $appointment, bool $again = false): bool
    {
        $open = in_array($appointment->status, [AppointmentStatus::Scheduled, AppointmentStatus::Confirmed], true);

        if (! $open || ! $appointment->client->canReceiveReminders() || $appointment->starts_at->isPast()) {
            return false;
        }

        $claimed = Appointment::query()
            ->whereKey($appointment->id)
            ->unless($again, fn ($query) => $query->whereNull('reminder_sent_at'))
            ->update(['reminder_sent_at' => now()]);

        if ($claimed === 0) {
            return false;
        }

        $appointment->refresh()->client->notify(new AppointmentReminder($appointment));

        return true;
    }
}
