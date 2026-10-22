<?php

declare(strict_types=1);

use App\Http\Controllers\FormIntegrationController;
use App\Http\Middleware\AuthenticateForms;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/integrations/forms')->middleware(['throttle:60,1', AuthenticateForms::class])->group(function (): void {
    Route::post('/events', [FormIntegrationController::class, 'store'])->name('forms.events');
    Route::get('/appointments/{integrationId}', [FormIntegrationController::class, 'show'])
        ->whereUuid('integrationId')->name('forms.appointment');
});
