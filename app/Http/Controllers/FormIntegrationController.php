<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Forms\ReceiveFormEvent;
use App\Http\Requests\FormEventRequest;
use App\Models\Appointment;
use Illuminate\Http\JsonResponse;

class FormIntegrationController extends Controller
{
    public function store(FormEventRequest $request, ReceiveFormEvent $receive): JsonResponse
    {
        $result = $receive->handle($request->payload());

        return response()->json($result, $result['result'] === 'pending_review' ? 202 : 200);
    }

    public function show(string $integrationId): JsonResponse
    {
        $appointment = Appointment::query()->where('integration_id', $integrationId)->firstOrFail();

        return response()->json([
            'appointment_id' => $appointment->integration_id,
            'status' => $appointment->status->value,
            'starts_at' => $appointment->starts_at->toIso8601String(),
            'ends_at' => $appointment->ends_at->toIso8601String(),
        ]);
    }
}
