<img src="public/brand/symbol.svg" alt="Kartify logo" width="96" height="96" />

# What is Kartify?

**Kartify** is a web-based collaborative project management workspace designed to help teams organize, track, and deliver work efficiently through an intuitive visual Kanban board interface.

Unlike bulky enterprise project management suites that suffer from unnecessary complexity and steep learning curves, Kartify focuses on clarity, speed, and deliberate workflows. Teams can create dedicated workspaces, organize initiatives into distinct projects, structure tasks across customizable columns, and collaborate with transparent audit histories—all within a single, unified platform.

---

## Local setup

Use Node 22.18 or newer, Corepack/pnpm, and Docker Compose.

1. Install packages with `corepack pnpm install`.
2. If `.env` does not exist, copy `.env.example` to `.env`. Generate a secret with
   `openssl rand -base64 32` and set `AUTH_SECRET` in `.env`. Keep that value stable
   across restarts. The example database URL matches the local Compose service
   on port 5433; `AUTH_URL` is `http://localhost:3000`.
3. Start the database, apply the existing schema, and start the application:

   ```bash
   docker compose up -d db
   corepack pnpm db:generate
   corepack pnpm db:deploy
   corepack pnpm dev
   ```

Open `http://localhost:3000/register` to create your account, then create a
workspace to open its dashboard. A fresh database has no default account;
browser-audit accounts are disposable and are not login credentials for the app.

If environment variables change while development is running, stop and restart
`pnpm dev` so authentication and the cached database client use the new values.
Missing `AUTH_SECRET`, a missing database URL, or unapplied migrations prevent
login and dashboard access. Keep `.env` private and out of version control.

## Use Cases

Kartify is built to support everyday team workflows and task tracking needs:

- **Visual Workflow Management**: Map project stages into clean, ordered columns (e.g., _To Do_, _In Progress_, _In Review_, _Done_) to make work states immediately apparent.
- **Task Ownership and Prioritization**: Assign tasks to team members with clear priority levels (_Low_, _Medium_, _High_, _Urgent_) and hard due dates.
- **Contextual Discussions**: Keep communication tied directly to the relevant task via inline comments, eliminating fragmented discussions across chat apps.
- **Progress Tracking**: Monitor overall project velocity and milestone completion using calculated progress metrics derived from completed columns.
- **Auditable Change History**: Inspect full activity logs on any task to verify status transitions, reassignments, and updates.
- **Workspace-Wide Discovery**: Quickly search and filter tasks across projects by assignee, urgency, due date, or status.

---

## Benefits

- **Lean and Focused**: No unnecessary bloat, complex Gantt charts, or convoluted sprint rituals. Teams can sign up, create a project, and start collaborating in minutes.
- **Fast and Responsive**: Employs optimistic UI updates so moving cards, reordering columns, and posting comments feel immediate and frictionless.
- **Accountability and Transparency**: Clear ownership, deadlines, and unalterable activity histories ensure everyone knows who is doing what and by when.
- **Strict Multi-Tenant Isolation**: Workspaces are completely isolated from one another. Robust role-based access control (RBAC) ensures members only access authorized resources.
- **Engineered for Reliability**: Built end-to-end with strict server-side validation, typed interfaces, comprehensive test coverage, and automated containerized deployment.

---

## Key Features

- **Interactive Kanban Boards**: Drag-and-drop task management, column ordering, and customizable board workflows.
- **Workspaces and Projects**: Multi-tenant architecture supporting separate workspaces, each containing independent projects.
- **Comprehensive Task Details**: Titles, rich descriptions, assignees, priorities, due dates, and activity logs.
- **Inline Task Discussions**: Threaded comments attached directly to tasks for contextual collaboration.
- **Calculated Progress Dashboard**: Real-time project overview highlighting completion rates and overdue tasks.
- **Fast Search and Filters**: Workspace-scoped search filtered by assignee, priority, due date, and column.
- **Role-Based Access Control (RBAC)**:
  - **Workspace Owner**: Full control over workspace settings, projects, members, and deletion.
  - **Admin**: Project and column management, member invitations, and role assignments.
  - **Member**: Day-to-day task creation, updates, comments, and search.

## Accessibility checks

TASK-035 provides a focused browser audit, separate from the later general E2E suite.
Install dependencies with `corepack pnpm install`, then install Chromium with
`corepack pnpm exec playwright install chromium`. Use Node 22.18 or newer (the script
loads the existing TypeScript test-database guard).

Stop any running development server in this checkout before running:

```bash
TEST_DATABASE_URL='postgresql://user:password@localhost:5432/kartify_a11y_test?schema=public' corepack pnpm a11y
```

The database must already exist, end in `_test`, use the `public` schema, and differ
from `DATABASE_URL`. The script deploys committed migrations, creates isolated audit
records, starts its own local server, and cleans up its records and server on exit.
It audits landing, login/register, dashboard, board, task detail, search, members, projects, settings,
and dialogs with axe at 375px and 1280px. It also checks page overflow, mobile control
sizes, focus trapping/restoration, empty comments/activity, and the keyboard task
create → drag move → edit → comment → cancel/confirm delete flow. Critical or serious
axe violations fail the command; CI wiring belongs to TASK-044.

Optional environment variables: `A11Y_PORT` (default `3417`) and
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for an existing Chromium installation.
Failures retain a temporary server log and print its path.

## Interface

Kartify uses a Notion-inspired, English-language interface with a white canvas,
charcoal actions, a soft gray sidebar, neutral board lanes and restrained status colors. The public
landing page includes an illustrative project board and working sign-up/login
links. Signed-in visitors can open their workspaces directly. The hero demo moves a
sample task through To Do, In Progress and Done, updating counts and completion.
The preview runs automatically without manual controls; autoplay stops offscreen
or in a hidden tab, and reduced motion keeps the demo static.

Landing sections reveal once as they enter the viewport, with a subtle 600ms
fade and 16px upward motion. Reduced-motion preferences disable the animation;
content remains visible without JavaScript. The browser audit checks these
behaviors on desktop and mobile.

Workspace Home shows real progress metrics, the first six projects in workspace
order, and assigned tasks. Links open all projects or search filtered to the current
user. The same visual language covers authentication, boards, task details, search,
members, settings, dialogs and loading/empty/error states. The redesign adds no
runtime dependencies or Notion-specific features.

The accessibility script also audits the landing page. Set
`A11Y_SCREENSHOT_DIR=/tmp/kartify-previews` when running `pnpm a11y` to save desktop
and mobile screenshots of landing, Home and board pages using disposable example
records. Maximum-length-name checks run before those example records are prepared.

## Workspace appearance and project schedules

The Notion-inspired white interface has been restored across the application.
Workspace background preferences from the color experiment remain stored, but
are not applied by the current interface. The background picker is no longer
shown; cards, page surfaces and dialogs follow the neutral theme.

Each project has Board, Timeline and Calendar views. Calendar places tasks on
their due date; Timeline displays inclusive start-date–due-date ranges for the
selected month. Both views open the existing task drawer, support month navigation,
and list tasks with missing dates separately. Month grids can scroll horizontally
on small screens. Schedule dates use the existing UTC date-only semantics.

The additive migration introduces `Workspace.background` (default Sky) and nullable
`Task.startDate`; run `corepack pnpm db:generate` and `corepack pnpm db:deploy` before
restarting development. Existing tasks do not receive invented start dates.
Server validation rejects a start date after the due date, including partial edits.
The retained appearance action remains restricted to Owner/Admin membership;
authentication, workspace isolation and schedule functionality are unchanged.

## Account settings

Open **Account settings** from the workspace account menu or the workspace
selection page. Users can edit their name, upload or remove a JPG/PNG/WebP profile
photo (maximum 2 MB), and change their password by entering the current password
and confirming the new one. Password changes retain the existing bcrypt policy
and are rate-limited per account.

Profile photos are stored in Postgres and served through an authenticated,
private endpoint. The additive `20261009000000_account_avatar` migration adds
nullable photo fields to `User`; run `corepack pnpm db:generate` and
`corepack pnpm db:deploy` when upgrading an existing installation.
