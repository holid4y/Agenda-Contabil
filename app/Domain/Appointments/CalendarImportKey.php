<?php

declare(strict_types=1);

namespace App\Domain\Appointments;

use App\Models\Appointment;
use Illuminate\Validation\ValidationException;

// Imported events are remembered by a hash of their UID, so the same
// event can not become two appointments. Events exported by this system
// carry the appointment id and are refused while that appointment exists.
final class CalendarImportKey
{
    public static function for(string $uid): string
    {
        if (preg_match('/^atendimento-(\d+)@agenda-contabil$/D', $uid, $matches) && Appointment::withTrashed()->whereKey((int) $matches[1])->exists()) {
            throw ValidationException::withMessages(['calendar_import_key' => __('appointments.errors.own_export')]);
        }

        return hash('sha256', $uid);
    }
}
