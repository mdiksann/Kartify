# Quality checks (TASK-037–044)

Use Node 22.18+ and the pinned pnpm version (`corepack enable`). Install with
`pnpm install --frozen-lockfile`, then `pnpm db:generate`.

## Database and browsers

Copy `.env.example` to `.env`, set `AUTH_SECRET`, and start Postgres using
`docker compose up -d db`. Create `kartify_test` once:

```sh
docker compose exec db createdb -U kartify kartify_test
pnpm exec playwright install --with-deps chromium
```

`TEST_DATABASE_URL` must point to a disposable Postgres database ending in `_test`,
with `schema=public`, and differ from `DATABASE_URL`. The harness rejects unsafe
URLs before applying committed migrations. Both integration and E2E global setup
apply migrations; they do not reset or migrate the application database.

Fixtures own uniquely named users/workspaces and delete their records in teardown.
Domain integration cases and E2E journeys use a fresh fixture per test. Run
integration, E2E and the standalone accessibility audit
sequentially against a shared test database. E2E requires a production build,
starts its own server on port 3420, and refuses to reuse another server.

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:unit --coverage
pnpm test:integration
pnpm build
pnpm test:e2e
pnpm a11y
pnpm test:security
pnpm audit --prod --audit-level=high
```

`pnpm typecheck` first runs the installed Next.js `typegen` command so a clean
checkout has current generated route types without starting the app.

The only new dependency is the approved `@vitest/coverage-v8` development provider,
matching Vitest. Coverage includes every `src/lib/**/*.ts` file, including unimported
files; thresholds require 90% aggregate library branches and 70% aggregate
lines/statements/functions/branches. No exclusions hide server libraries.

Playwright runs Chromium headlessly with one worker and no retries. Tests use
roles and labels. A failing journey retains a trace and screenshot in
`test-results/`; open it with `pnpm exec playwright show-trace <trace.zip>`.
The suite seeds only test fixtures, not the deployment/demo seed from TASK-045.

## Security review

- Entity-specific integration tests exercise privileged A actors against B's
  projects, columns, tasks, comments, activities and members; denied mutations
  preserve B's records. Existing suites also test foreign identifiers/cursors
  against valid A resources, anonymous actors, and member role denials.
- Existing Auth.js integration tests verify bcrypt cost, cookie flags, login and
  registration rate limits, direct credential callbacks, session reads and logout.
- Public response fixtures assert password fields/hashes are absent.
- `pnpm test:security` checks source for unsafe HTML, explicit `any`, unchecked
  suppressions, common secret formats and tracked environment files. This is a
  bounded source sweep, not a substitute for reviewing new credentials or code.
- `pnpm audit --prod --audit-level=high` gates high/critical dependency advisories.

## CI and merge protection

CI runs static checks → coverage → real Postgres integration → production-build
E2E and accessibility, plus an independent production dependency audit. Concurrency
cancels superseded runs. Failure artifacts are retained for seven days. The
`required` job runs even when dependencies fail/skip and fails unless every job
succeeded. Optional Docker smoke is omitted because TASK-046 has not supplied a
production Dockerfile.

A repository administrator must configure the `CI / required` check as required
for `main` in GitHub branch protection/rulesets. Workflow YAML cannot configure
repository protection. To verify once on GitHub: open a disposable PR containing
an intentionally failing test, confirm the test and `required` jobs fail and merge
is blocked, remove the failure, and confirm the whole pipeline turns green.
Record the PR/run URL as evidence. This external verification remains pending until
performed; local passing tests do not prove branch protection.
