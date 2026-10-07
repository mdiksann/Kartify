import { afterEach, describe, expect, it, vi } from 'vitest';
import { log } from '@/lib/logger';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe('log', () => {
  it('writes structured production fields and excludes unexpected fields', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const output = vi.spyOn(console, 'info').mockImplementation(() => {});
    const context = {
      requestId: 'request-1',
      route: '/',
      durationMs: 12,
      password: 'secret',
      email: 'private@example.com',
    };
    log('info', 'Request completed', context);
    expect(JSON.parse(String(output.mock.calls[0]?.[0]))).toEqual({
      level: 'info',
      msg: 'Request completed',
      requestId: 'request-1',
      route: '/',
      durationMs: 12,
    });
  });
  it('suppresses production debug logs', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const output = vi.spyOn(console, 'debug').mockImplementation(() => {});
    log('debug', 'Debug event', { requestId: '1', route: '/' });
    expect(output).not.toHaveBeenCalled();
  });
  it('writes readable development logs', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const output = vi.spyOn(console, 'warn').mockImplementation(() => {});
    log('warn', 'Warning', { requestId: '1', route: '/' });
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('[warn] Warning'),
    );
  });
});
