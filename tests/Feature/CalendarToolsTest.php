<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Appointments\Enums\AppointmentStatus;
use App\Domain\Appointments\ReminderMessage;
use App\Livewire\Appointments\CreateAppointment;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class CalendarToolsTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_and_calendar_tools_are_rendered_without_requiring_google_credentials(): void
    {
        $client = Client::factory()->create(['email' => 'ana@example.com', 'phone' => '(51) 99125-1538', 'accepts_reminders' => true]);
        $appointment = Appointment::factory()->create(['client_id' => $client->id, 'status' => AppointmentStatus::Scheduled]);
        $this->actingAs(User::factory()->create());
        $this->get(route('clients.show', $client))->assertOk()->assertSee('mailto:ana%40example.com', false)->assertSee('https://wa.me/5551991251538', false);
        $this->get(route('appointments.show', $appointment))->assertOk()->assertSee('data-calendar-event', false)->assertSee('Escrever e-mail')->assertSee('Google Agenda');
        $this->get(route('agenda'))->assertOk()->assertSee('data-calendar-import', false);
    }

    public function test_invalid_contacts_do_not_generate_links(): void
    {
        $client = Client::factory()->create(['email' => 'invalid', 'phone' => '1234']);
        $this->actingAs(User::factory()->create())->get(route('clients.show', $client))->assertOk()->assertDontSee('mailto:', false)->assertDontSee('https://wa.me/', false)->assertSee('Cadastre um e-mail válido');
    }

    public function test_import_prefills_a_draft_without_creating_an_appointment(): void
    {
        $date = now()->addDay()->format('Y-m-d');
        Livewire::actingAs(User::factory()->create())->test(CreateAppointment::class)
            ->call('importCalendar', ['key' => 'google-event', 'title' => 'Reunião', 'description' => 'Confirmar documentos', 'location' => 'Sala 205', 'start' => "{$date}T09:00:00", 'end' => "{$date}T10:00:00"])
            ->assertSet('date', $date)->assertSet('start_time', '09:00')->assertSet('end_time', '10:00')
            ->assertSet('calendar_import_key', hash('sha256', 'google-event'))->assertSet('location', 'Sala 205');
        $this->assertDatabaseCount('appointments', 0);
    }

    public function test_selecting_a_service_preserves_the_imported_duration(): void
    {
        $service = Service::factory()->create(['default_duration_minutes' => 30]);
        $date = now()->addDay()->format('Y-m-d');
        Livewire::actingAs(User::factory()->create())->test(CreateAppointment::class)
            ->call('importCalendar', ['key' => 'two-hour-event', 'title' => 'Reunião', 'start' => "{$date}T09:00:00", 'end' => "{$date}T11:00:00"])
            ->set('service_id', $service->id)
            ->assertSet('start_time', '09:00')->assertSet('end_time', '11:00');
    }

    public function test_a_rejected_import_does_not_replace_a_valid_draft(): void
    {
        $date = now()->addDay()->format('Y-m-d');
        $next = now()->addDays(2)->format('Y-m-d');
        Livewire::actingAs(User::factory()->create())->test(CreateAppointment::class)
            ->call('importCalendar', ['key' => 'valid-event', 'title' => 'Reunião', 'start' => "{$date}T09:00:00", 'end' => "{$date}T11:00:00"])
            ->call('importCalendar', ['key' => 'overnight-event', 'title' => 'Reunião', 'start' => "{$date}T22:00:00", 'end' => "{$next}T01:00:00"])
            ->assertHasErrors('calendar_import_key')->assertSet('calendar_import_key', hash('sha256', 'valid-event'))
            ->assertSet('start_time', '09:00')->assertSet('end_time', '11:00');
    }

    public function test_rendered_whatsapp_and_email_reminders_include_the_signed_response_url(): void
    {
        $client = Client::factory()->create(['email' => 'ana@example.com', 'phone' => '(51) 99125-1538', 'accepts_reminders' => true]);
        $appointment = Appointment::factory()->create(['client_id' => $client->id]);
        $responseUrl = ReminderMessage::responseUrl($appointment);
        $response = $this->actingAs(User::factory()->create())->get(route('appointments.show', $appointment))->assertOk();
        $html = html_entity_decode($response->getContent(), ENT_QUOTES | ENT_HTML5);
        foreach (['https://wa.me/', 'mailto:'] as $prefix) {
            preg_match('~href="('.preg_quote($prefix, '~').'[^"]+)"~', $html, $match);
            $this->assertNotEmpty($match, $prefix);
            $this->assertStringContainsString($responseUrl, rawurldecode($match[1]));
        }
        $this->assertNull($appointment->fresh()->reminder_sent_at);
    }

    public function test_import_drafts_reject_duplicate_uids_and_invalid_dates(): void
    {
        Appointment::factory()->create(['calendar_import_key' => hash('sha256', 'duplicate')]);
        $date = now()->addDay()->format('Y-m-d');
        $draft = ['key' => 'duplicate', 'title' => 'Reunião', 'start' => "{$date}T09:00:00", 'end' => "{$date}T10:00:00"];
        Livewire::actingAs(User::factory()->create())->test(CreateAppointment::class)->call('importCalendar', $draft)->assertHasErrors('calendar_import_key');
        Livewire::actingAs(User::factory()->create())->test(CreateAppointment::class)->call('importCalendar', [...$draft, 'start' => 'invalid'])->assertHasErrors('start');
    }

    public function test_reviewed_import_uses_the_existing_creation_flow_and_persists_the_duplicate_key(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create();
        $service = Service::factory()->create();
        $date = now()->addDay()->format('Y-m-d');
        Livewire::actingAs($user)->test(CreateAppointment::class)
            ->call('importCalendar', ['key' => 'google-save-event', 'title' => 'Reunião importada', 'start' => "{$date}T09:00:00", 'end' => "{$date}T10:00:00"])
            ->call('selectClient', $client->id)
            ->set('service_id', $service->id)
            ->call('save')
            ->assertHasNoErrors();
        $this->assertDatabaseHas('appointments', [
            'client_id' => $client->id,
            'service_id' => $service->id,
            'responsible_user_id' => $user->id,
            'calendar_import_key' => hash('sha256', 'google-save-event'),
        ]);
        $this->assertDatabaseCount('appointment_activities', 1);
    }

    public function test_viewers_cannot_import_events(): void
    {
        Livewire::actingAs(User::factory()->viewer()->create())->test(CreateAppointment::class)->call('importCalendar', [])->assertForbidden();
    }
}
