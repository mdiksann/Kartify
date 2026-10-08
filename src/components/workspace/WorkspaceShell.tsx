'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  ChevronDown,
  LayoutDashboard,
  Columns3,
  Search,
  Users,
  Settings,
  PanelLeft,
  Menu,
  LogOut,
  Loader2,
} from 'lucide-react';
import { logout } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
type Workspace = { id: string; name: string; slug: string };
export function WorkspaceShell({
  workspace,
  workspaces,
  projects,
  user,
  role,
  collapsed: initialCollapsed,
  children,
}: {
  workspace: Workspace;
  workspaces: Workspace[];
  projects: { id: string; name: string }[];
  user: { name: string };
  role: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobile, setMobile] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const base = `/w/${workspace.slug}`;
  const items = [
    { title: 'Dashboard', path: base, icon: LayoutDashboard },
    { title: 'Projects', path: `${base}/projects`, icon: Columns3 },
    { title: 'Search', path: `${base}/search`, icon: Search },
    { title: 'Members', path: `${base}/members`, icon: Users },
    { title: 'Settings', path: `${base}/settings`, icon: Settings },
  ];
  function navigation(rail: boolean) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between rounded-lg"
              aria-label={`Switch workspace: ${workspace.name}`}
            >
              {rail ? (
                <Columns3 />
              ) : (
                <>
                  <span className="truncate">{workspace.name}</span>
                  <ChevronDown />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {workspaces.map((item) => (
              <DropdownMenuItem key={item.id} asChild>
                <Link
                  href={`/w/${item.slug}`}
                  aria-current={item.id === workspace.id ? 'true' : undefined}
                >
                  {item.name}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <Link href="/workspaces">All workspaces</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <nav aria-label="Workspace" className="mt-6 space-y-2">
          {items.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobile(false)}
              aria-label={rail ? item.title : undefined}
              aria-current={pathname === item.path ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium lg:min-h-9',
                pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100',
              )}
            >
              <item.icon aria-hidden="true" className="size-4 shrink-0" />
              {!rail && item.title}
            </Link>
          ))}
        </nav>
        <nav aria-label="Projects" className="mt-6 space-y-2">
          {!rail && (
            <p className="px-2.5 text-xs font-semibold uppercase text-gray-500">
              Projects
            </p>
          )}
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`${base}/board/${project.id}`}
              onClick={() => setMobile(false)}
              aria-label={rail ? project.name : undefined}
              aria-current={
                pathname === `${base}/board/${project.id}` ? 'page' : undefined
              }
              className={cn(
                'flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium lg:min-h-9',
                pathname === `${base}/board/${project.id}`
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100',
              )}
            >
              <Columns3 className="size-4 shrink-0" />
              {!rail && <span className="truncate">{project.name}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-gray-200 pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-lg"
                aria-label="Account menu"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-700">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                {!rail && <span className="truncate">{user.name}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{role}</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={pending}
                onSelect={() =>
                  startTransition(async () => {
                    try {
                      await logout();
                    } catch {
                      setError('Could not log out. Try again.');
                    }
                  })
                }
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
      </>
    );
  }
  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-gray-200 bg-white px-3 py-4 lg:flex',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => {
            const next = !collapsed;
            setCollapsed(next);
            document.cookie = `sidebar-collapsed=${next}; Path=/; SameSite=Lax; Max-Age=31536000`;
          }}
        >
          <PanelLeft />
        </Button>
        {navigation(collapsed)}
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 lg:hidden">
          <Sheet open={mobile} onOpenChange={setMobile}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Open navigation"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-64 flex-col">
              <SheetTitle>Workspace navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Switch workspaces or choose a section.
              </SheetDescription>
              {navigation(false)}
            </SheetContent>
          </Sheet>
          <span className="truncate text-sm font-semibold">
            {workspace.name}
          </span>
        </header>
        <main className="px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}
