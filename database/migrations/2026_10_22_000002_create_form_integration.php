<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table): void {
            $table->uuid('integration_id')->nullable()->unique();
        });

        DB::table('appointments')->select('id')->orderBy('id')->chunkById(500, function ($appointments): void {
            foreach ($appointments as $appointment) {
                DB::table('appointments')->where('id', $appointment->id)->update(['integration_id' => (string) Str::uuid()]);
            }
        });

        Schema::table('appointments', function (Blueprint $table): void {
            $table->uuid('integration_id')->nullable(false)->change();
        });

        Schema::create('external_forms', function (Blueprint $table): void {
            $table->id();
            $table->string('external_id', 128)->unique();
            $table->foreignId('appointment_id')->nullable()->constrained()->restrictOnDelete();
            $table->uuid('appointment_reference')->nullable()->index();
            $table->string('title', 160);
            $table->string('status', 20);
            $table->text('url')->nullable();
            $table->unsignedInteger('source_version');
            $table->timestampTz('source_updated_at');
            $table->string('snapshot_hash', 64);
            $table->timestamps();
        });

        Schema::create('form_webhook_events', function (Blueprint $table): void {
            $table->id();
            $table->uuid('event_id')->unique();
            $table->foreignId('external_form_id')->constrained()->restrictOnDelete();
            $table->string('payload_hash', 64);
            $table->string('outcome', 24);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_webhook_events');
        Schema::dropIfExists('external_forms');
        Schema::table('appointments', function (Blueprint $table): void {
            $table->dropUnique(['integration_id']);
            $table->dropColumn('integration_id');
        });
    }
};
