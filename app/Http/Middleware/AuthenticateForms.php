<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateForms
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = config('services.forms.webhook_secret', '');
        abort_unless(config('services.forms.enabled') && is_string($secret) && strlen($secret) >= 32, 503, 'Integração de formulários indisponível.');
        abort_if(app()->isProduction() && ! $request->isSecure(), 400, 'HTTPS obrigatório.');
        abort_if(strlen($request->getContent()) > 65536, 413);
        abort_if($request->isMethod('POST') && ! $request->isJson(), 415, 'Envie application/json.');

        $timestamp = $request->header('X-Forms-Timestamp', '');
        $signature = $request->header('X-Forms-Signature', '');
        abort_unless(preg_match('/^\d{10}$/D', $timestamp) && abs(now()->timestamp - (int) $timestamp) <= 300, 401, 'Assinatura inválida ou expirada.');

        $message = $timestamp."\n".$request->method()."\n".$request->getRequestUri()."\n".$request->getContent();
        $expected = 'sha256='.hash_hmac('sha256', $message, $secret);
        abort_unless(hash_equals($expected, $signature), 401, 'Assinatura inválida ou expirada.');

        $response = $next($request);
        $response->headers->set('Cache-Control', 'no-store, private');
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }
}
