'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useSyncExternalStore, useTransition } from 'react';
import {
  ChevronDown,
  Home,
  ChevronRight,
  Columns3,
  Search,
  Users,
  Settings,
  PanelLeft,
  Menu,
  LogOut,
  Loader2,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react';
import { logout } from '@/actions/auth';
import { Brand } from '@/components/Brand';
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
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-workspace-theme'],
  });
  return () => observer.disconnect();
}
const isDarkTheme = () =>
  document.documentElement.dataset.workspaceTheme === 'dark';

type Workspace = { id: string; name: string; slug: string };
export function WorkspaceShell({
  workspace,
  workspaces,
  projects,
  user,
  role,
  collapsed: initialCollapsed,
  dark: initialDark,
  children,
}: {
  workspace: Workspace;
  workspaces: Workspace[];
  projects: { id: string; name: string }[];
  user: { name: string; avatarUrl: string | null };
  role: string;
  collapsed: boolean;
  dark: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const dark = useSyncExternalStore(
    subscribeToTheme,
    isDarkTheme,
    () => initialDark,
  );
  const [mobile, setMobile] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const base = `/w/${workspace.slug}`;
  const items = [
    { title: 'Home', path: base, icon: Home },
    { title: 'Projects', path: `${base}/projects`, icon: Columns3 },
    { title: 'Search', path: `${base}/search`, icon: Search },
    { title: 'Members', path: `${base}/members`, icon: Users },
    { title: 'Settings', path: `${base}/settings`, icon: Settings },
  ];
  const currentPage =
    items.find((item) => item.path === pathname)?.title ??
    projects.find((project) => pathname === `${base}/board/${project.id}`)
      ?.name ??
    (pathname === `${base}/account` ? 'Account settings' : 'Workspace');
  function navigation(rail: boolean) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto min-h-11 w-full justify-between rounded-md px-2 text-sm"
              aria-label={`Switch workspace: ${workspace.name}`}
            >
              {rail ? (
                <Columns3 />
              ) : (
                <>
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="flex size-6 shrink-0 items-center justify-center rounded bg-border text-xs font-medium"
                    >
                      {workspace.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate">{workspace.name}</span>
                  </span>
                  <ChevronDown />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-w-[calc(100vw-2rem)]"
          >
            {workspaces.map((item) => (
              <DropdownMenuItem key={item.id} asChild>
                <Link
                  href={`/w/${item.slug}`}
                  aria-current={item.id === workspace.id ? 'true' : undefined}
                >
                  <span className="min-w-0 break-words">{item.name}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <Link href="/workspaces">All workspaces</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <nav aria-label="Workspace" className="mt-5 space-y-1">
          {items.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobile(false)}
              aria-label={rail ? item.title : undefined}
              aria-current={pathname === item.path ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-2.5 rounded-md px-2.5 text-sm lg:min-h-9',
                pathname === item.path
                  ? 'bg-border/70 font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-border/50 hover:text-foreground',
              )}
            >
              <item.icon aria-hidden="true" className="size-4 shrink-0" />
              {!rail && item.title}
            </Link>
          ))}
        </nav>
        <nav
          aria-label="Projects"
          className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto"
        >
          {!rail && (
            <p className="mb-2 px-2.5 text-xs font-medium text-muted-foreground">
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
                'flex min-h-11 items-center gap-2.5 rounded-md px-2.5 text-sm lg:min-h-9',
                pathname === `${base}/board/${project.id}`
                  ? 'bg-border/70 font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-border/50 hover:text-foreground',
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
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt=""
                    width={28}
                    height={28}
                    unoptimized
                    className="size-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-700">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                {!rail && <span className="truncate">{user.name}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{role}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`${base}/account`} onClick={() => setMobile(false)}>
                  <UserRound aria-hidden="true" className="size-4" />
                  Account settings
                </Link>
              </DropdownMenuItem>
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
            <p role="alert" className="mt-2 text-xs text-destructive-text">
              {error}
            </p>
          )}
        </div>
      </>
    );
  }
  return (
    <div data-workspace-shell className="flex min-h-screen">
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-muted px-3 py-3 lg:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div
          className={cn(
            'mb-4 flex items-center justify-between gap-2',
            collapsed && 'flex-col',
          )}
        >
          <Brand />
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
        </div>
        {navigation(collapsed)}
      </aside>
      <div className="min-w-0 flex-1 bg-background">
        <header className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
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
                <SheetContent
                  side="left"
                  className="flex w-64 flex-col bg-muted"
                >
                  <SheetTitle>Workspace navigation</SheetTitle>
                  <SheetDescription className="sr-only">
                    Switch workspaces or choose a section.
                  </SheetDescription>
                  <Brand className="self-start" />
                  {navigation(false)}
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="hidden max-w-48 truncate sm:inline">
                {workspace.name}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="hidden size-3.5 shrink-0 sm:block"
              />
              <span className="truncate text-foreground">{currentPage}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-11 text-muted-foreground"
              aria-label="Dark mode"
              aria-pressed={dark}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => {
                const next = !dark;
                document.documentElement.dataset.workspaceTheme = next
                  ? 'dark'
                  : 'light';
                document.cookie = `workspace-theme=${next ? 'dark' : 'light'}; Path=/; SameSite=Lax; Max-Age=31536000`;
              }}
            >
              {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </Button>
            <Link
              href={`${base}/search`}
              aria-label="Search workspace"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <Search aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </header>
        <main
          className={cn(
            'mx-auto w-full px-4 pb-10 pt-6 md:px-8 md:pt-8 lg:px-12',
            pathname.includes('/board/') ? 'max-w-none' : 'max-w-6xl',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
