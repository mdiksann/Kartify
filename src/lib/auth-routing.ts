export function safeNext(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return '/workspaces';
  try {
    const url = new URL(value, 'https://kartify.local');
    if (
      url.origin !== 'https://kartify.local' ||
      !(
        /^\/w(?:\/|$)/.test(url.pathname) ||
        url.pathname === '/workspaces' ||
        url.pathname === '/account'
      )
    )
      return '/workspaces';
    return url.pathname + url.search;
  } catch {
    return '/workspaces';
  }
}
export function authRedirect(
  path: string,
  search: string,
  authenticated: boolean,
): string | null {
  if (
    !authenticated &&
    (path === '/account' || path === '/workspaces' || /^\/w(?:\/|$)/.test(path))
  )
    return `/login?next=${encodeURIComponent(path + search)}`;
  if (authenticated && (path === '/login' || path === '/register'))
    return '/workspaces';
  return null;
}
