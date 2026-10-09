'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { priorities } from '@/lib/validation/task';
import {
  searchSchema,
  filterParams,
  type SearchFilters,
} from '@/lib/validation/search';
const selectClass =
  'mt-2 h-9 w-full rounded-lg border border-gray-300 bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary max-md:min-h-11';
export function SearchControls({
  slug,
  filters,
  options,
}: {
  slug: string;
  filters: SearchFilters;
  options: {
    members: { id: string; name: string }[];
    columns: { id: string; name: string; project: { name: string } }[];
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expectedParams = useRef(filterParams(filters));
  useEffect(() => {
    const incoming = filterParams(filters);
    for (const key of [
      'q',
      'assignee',
      'priority',
      'from',
      'to',
      'column',
    ] as const) {
      const value = filters[key];
      const input = form.current?.elements.namedItem(key);
      if (!(
        input instanceof HTMLInputElement || input instanceof HTMLSelectElement
      ))
        continue;
      if (
        key === 'q' &&
        document.activeElement === input &&
        incoming === expectedParams.current &&
        input.value.trim() !== filters.q
      )
        continue;
      input.value = value ?? '';
    }
  }, [filters]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function navigate(values: unknown) {
    if (timer.current) clearTimeout(timer.current);
    const params = filterParams(searchSchema.parse(values));
    expectedParams.current = params;
    setError('');
    startTransition(() => {
      try {
        router.replace(`/w/${slug}/search${params ? `?${params}` : ''}`, {
          scroll: false,
        });
      } catch {
        setError('Could not search. Try again.');
      }
    });
  }
  function submit() {
    if (form.current) navigate(Object.fromEntries(new FormData(form.current)));
  }
  return (
    <form
      ref={form}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="space-y-4"
      aria-busy={pending}
    >
      <div>
        <Label htmlFor="search-query">Search tasks</Label>
        <div className="mt-2 flex items-center gap-2">
          <Input
            id="search-query"
            name="q"
            defaultValue={filters.q}
            maxLength={200}
            placeholder="Search titles and descriptions"
            className="max-md:min-h-11"
            onChange={() => {
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(submit, 300);
            }}
          />
          <Button
            type="submit"
            aria-busy={pending}
            aria-label="Submit search"
            className="shrink-0 max-md:min-h-11"
          >
            {pending ? <Loader2 className="animate-spin" /> : <Search />}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5" onChange={submit}>
        <div>
          <Label htmlFor="filter-assignee">Assignee</Label>
          <select
            id="filter-assignee"
            name="assignee"
            defaultValue={filters.assignee ?? ''}
            className={selectClass}
          >
            <option value="">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {options.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="filter-priority">Priority</Label>
          <select
            id="filter-priority"
            name="priority"
            defaultValue={filters.priority ?? ''}
            className={selectClass}
          >
            <option value="">All priorities</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority.charAt(0) + priority.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="filter-from">Due from</Label>
          <Input
            id="filter-from"
            name="from"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            defaultValue={filters.from ?? ''}
            className="mt-2 max-md:min-h-11"
          />
        </div>
        <div>
          <Label htmlFor="filter-to">Due through</Label>
          <Input
            id="filter-to"
            name="to"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            defaultValue={filters.to ?? ''}
            className="mt-2 max-md:min-h-11"
          />
        </div>
        <div>
          <Label htmlFor="filter-column">Column / status</Label>
          <select
            id="filter-column"
            name="column"
            defaultValue={filters.column ?? ''}
            className={selectClass}
          >
            <option value="">All columns</option>
            {options.columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.project.name} · {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          className="max-md:min-h-11"
          onClick={() => {
            form.current?.reset();
            navigate({ q: '' });
          }}
        >
          Clear all
        </Button>
        {pending && (
          <span role="status" className="text-xs text-gray-500">
            Updating results…
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive-text">
          {error}
        </p>
      )}
    </form>
  );
}
