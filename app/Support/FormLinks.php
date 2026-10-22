<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Appointment;
use App\Models\ExternalForm;

final class FormLinks
{
    public static function allowed(?string $url): bool
    {
        if (! $url || strlen($url) > 2048 || ! filter_var($url, FILTER_VALIDATE_URL) || preg_match('/[\x00-\x20\x7f\\\\]/', $url)) {
            return false;
        }

        $parts = parse_url($url);

        return ($parts['scheme'] ?? '') === 'https'
            && ! isset($parts['user']) && ! isset($parts['pass'])
            && ($parts['port'] ?? 443) === 443
            && in_array(strtolower($parts['host'] ?? ''), config('services.forms.allowed_hosts', []), true);
    }

    public static function open(ExternalForm $form): ?string
    {
        return config('services.forms.enabled') && $form->status !== 'deleted' && self::allowed($form->url)
            ? $form->url : null;
    }

    public static function create(Appointment $appointment): ?string
    {
        $url = config('services.forms.create_url');

        if (! config('services.forms.enabled') || ! self::allowed($url)) {
            return null;
        }

        $parts = explode('#', $url, 2);
        $base = explode('?', $parts[0], 2);
        parse_str($base[1] ?? '', $query);
        $query['appointment_id'] = $appointment->integration_id;

        return $base[0].'?'.http_build_query($query, encoding_type: PHP_QUERY_RFC3986)
            .(isset($parts[1]) ? '#'.$parts[1] : '');
    }
}
