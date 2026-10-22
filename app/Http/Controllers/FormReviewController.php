<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\ExternalForm;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\View\View;

class FormReviewController extends Controller
{
    public function index(Request $request): View
    {
        abort_unless(config('services.forms.enabled'), 404);
        Gate::authorize('create', Appointment::class);
        $data = $request->validate(['atendimento' => ['nullable', 'uuid']]);
        $appointment = empty($data['atendimento']) ? null : Appointment::query()
            ->with(['client', 'service'])->where('integration_id', $data['atendimento'])->firstOrFail();

        return view('forms.review', [
            'appointment' => $appointment,
            'forms' => ExternalForm::query()->whereNull('appointment_id')->where('status', '!=', 'deleted')
                ->latest()->paginate(25)->withQueryString(),
        ]);
    }

    public function store(Request $request, ExternalForm $externalForm): RedirectResponse
    {
        abort_unless(config('services.forms.enabled'), 404);
        $data = $request->validate(['appointment_id' => ['required', 'uuid']]);
        $appointment = Appointment::query()->where('integration_id', $data['appointment_id'])->firstOrFail();
        Gate::authorize('update', $appointment);

        DB::transaction(function () use ($externalForm, $appointment): void {
            $form = ExternalForm::query()->lockForUpdate()->findOrFail($externalForm->id);
            abort_if($form->status === 'deleted', 409, 'O formulário foi removido.');
            abort_if($form->appointment_id !== null && $form->appointment_id !== $appointment->id, 409, 'Este formulário já está vinculado.');
            $form->forceFill([
                'appointment_id' => $appointment->id,
                'appointment_reference' => $appointment->integration_id,
            ])->save();
        }, 3);

        return redirect()->route('appointments.show', $appointment)->with('notice', 'Formulário vinculado ao atendimento.');
    }
}
