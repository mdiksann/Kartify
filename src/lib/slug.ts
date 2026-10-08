export function slugify(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)
      .replace(/-$/g, '') || 'workspace'
  );
}
export function workspaceSlug(name: string, attempt: number): string {
  const base = slugify(name);
  return attempt === 0 ? base : `${base}-${attempt + 1}`;
}
