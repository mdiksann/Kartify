import 'server-only';
// Only trust this header when the deployment's reverse proxy overwrites it.
export function authIp(headers: Headers): string {
  return process.env.AUTH_TRUST_PROXY === 'true'
    ? headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    : 'unknown';
}
