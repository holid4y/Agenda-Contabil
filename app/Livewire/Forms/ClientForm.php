<?php

declare(strict_types=1);

namespace App\Livewire\Forms;

use App\Domain\Clients\Enums\ClientType;
use App\Models\Client;
use App\Rules\BrazilianDocument;
use App\Support\BlindIndex;
use App\Support\ContactLinks;
use Closure;
use Illuminate\Validation\Rule;
use Livewire\Form;

class ClientForm extends Form
{
    public ?Client $client = null;

    public string $type = ClientType::Individual->value;

    public string $name = '';

    public string $trade_name = '';

    public string $document = '';

    public string $phone = '';

    public string $email = '';

    public string $notes = '';

    public bool $accepts_reminders = false;

    public bool $active = true;

    public function isOrganization(): bool
    {
        return $this->type === ClientType::Organization->value;
    }

    public function setClient(Client $client): void
    {
        $this->client = $client;
        $this->type = $client->type->value;
        $this->name = $client->name;
        $this->trade_name = (string) $client->trade_name;
        $this->document = (string) $client->document;
        $this->phone = (string) $client->phone;
        $this->email = (string) $client->email;
        $this->notes = (string) $client->notes;
        $this->accepts_reminders = $client->accepts_reminders;
        $this->active = $client->active;
    }

    protected function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(ClientType::class)],
            'name' => ['required', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'document' => [
                'nullable', 'string', 'max:20',
                new BrazilianDocument(ClientType::tryFrom($this->type) ?? ClientType::Individual),
                $this->documentIsFree(...),
            ],
            'phone' => ['nullable', 'string', 'max:30', 'required_without:email', $this->phoneHasDigits(...)],
            'email' => ['nullable', 'email', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'accepts_reminders' => ['boolean'],
            'active' => ['boolean'],
        ];
    }

    private function documentIsFree(string $attribute, mixed $value, Closure $fail): void
    {
        $taken = Client::query()
            ->where('document_index', BlindIndex::forDocument((string) $value))
            ->when($this->client, fn ($query) => $query->whereKeyNot($this->client->id))
            ->exists();

        if ($taken) {
            $fail(__('clients.errors.document_taken'));
        }
    }

    // Landline or mobile with area code, optionally with the country code.
    private function phoneHasDigits(string $attribute, mixed $value, Closure $fail): void
    {
        if (ContactLinks::phone((string) $value) === null) {
            $fail(__('clients.errors.invalid_phone'));
        }
    }

    protected function messages(): array
    {
        return [
            'phone.required_without' => __('clients.errors.contact_required'),
        ];
    }

    public function save(): Client
    {
        $this->validate();

        $client = $this->client ?? new Client;

        $client->fill([
            'type' => $this->type,
            'name' => $this->name,
            'trade_name' => $this->isOrganization() ? ($this->trade_name ?: null) : null,
            'document' => $this->document ?: null,
            'phone' => $this->phone ?: null,
            'email' => $this->email ?: null,
            'notes' => $this->notes ?: null,
            'accepts_reminders' => $this->accepts_reminders,
            'active' => $this->active,
        ])->save();

        return $client;
    }
}
