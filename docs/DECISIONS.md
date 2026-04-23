# Architectural Decisions

This document records the key decisions made in this codebase,
why they were made, and what alternatives were considered and rejected.

Read this when you disagree with a pattern. The answer is probably here.
If it isn't, add a new entry before changing the pattern.

---

## Decision 1 — shadcn-vue over a traditional component library

**Decision:** Use shadcn-vue as the component foundation.

**Why:**
Components are copied into the project as source code, not installed
as a versioned package. This means we own every component and can
modify them freely without fighting overrides or waiting for upstream
fixes. The library is built on Radix Vue primitives which gives us
accessibility out of the box.

**Alternatives considered:**
- Vuetify — opinionated design system, hard to customise deeply
- PrimeVue — good components but overrides are verbose
- Building from scratch — too slow, accessibility is hard to get right

**Consequences:**
- We maintain the components we use
- New shadcn-vue components require a deliberate `add` command
- Breaking changes from upstream are opt-in

---

## Decision 2 — Atomic design nomenclature replaced with ui/blocks/modules/layouts

**Decision:** Use `ui/blocks/modules/layouts` instead of atoms/molecules/organisms/templates.

**Why:**
Atomic design is a sound mental model but the naming is awkward in
conversation. "Put it in the blocks folder" is natural. "Put it in
the molecules folder" is not. The chosen names map directly to how
developers think about the layers.

**Alternatives considered:**
- Atoms/molecules/organisms/templates — correct model, goofy names
- primitives/patterns/features/layouts — more abstract, less clear
- core/blocks/regions/layouts — Brad Frost's own alternative
- No structure — scales poorly, quickly becomes a mess

**Consequences:**
- `ui/` aligns naturally with shadcn-vue's own convention
- `blocks/` and `modules/` are immediately understood
- New developers from atomic design backgrounds need a quick remap

---

## Decision 3 — Store wrapper pattern over plain Pinia actions

**Decision:** Wrap every Pinia store in a composable that exposes
readonly state, named actions, and per-action loading/error refs.

**Why:**
Pinia provides reactivity but no conventions. Without a wrapper,
different developers put API calls in components, store actions,
and composables inconsistently. Loading state appears in some domains
and not others. Business logic accumulates in actions until they
become untestable. The wrapper encodes the team agreement about how
Pinia gets used — once, in a shape every domain follows.

**Alternatives considered:**
- Plain Pinia actions — no conventions, inconsistent patterns emerge
- Pinia with plugins — adds complexity, doesn't solve conventions
- Vuex — too verbose, effectively superseded by Pinia
- Raw Vue reactivity without Pinia — loses DevTools integration

**Consequences:**
- All state is readonly outside of actions — accidental mutation is impossible
- Every async action has consistent loading/error behaviour
- Pinia DevTools still work — `$patch` is tracked normally
- Slightly more boilerplate per domain — justified by consistency

---

## Decision 4 — Reducers as pure functions separate from the store

**Decision:** Extract state transforms into pure reducer functions
separate from the store wrapper.

**Why:**
Pure functions are the easiest things to test — no mocks, no setup,
no Vue, no Pinia. Call with input state, assert output state. By
separating reducers from the wrapper we create a high-value test seam
that is cheap to cover and catches the most impactful bugs: incorrect
state shape after an operation.

**Alternatives considered:**
- Inline state transforms in actions — untestable without standing up the store
- Class-based reducers — more ceremony, no benefit over plain functions
- Immer-style mutations — hides what's actually happening to state

**Consequences:**
- Reducer tests are the highest value tests in the codebase
- Reducers must remain pure — side effects in reducers are a hard reject in review
- Some logic that feels like it belongs in an action must move to a reducer

---

## Decision 5 — reducerPipeline utility named deliberately

**Decision:** Name the reducer composition utility `reducerPipeline`
not `pipeline`.

**Why:**
`pipeline` is heavily overloaded — CI/CD systems, data pipelines,
build tooling all use the term. A new developer seeing an import of
`pipeline` in application code would reasonably wonder what system
it refers to. `reducerPipeline` is unambiguous about both what it
does and where it belongs.

**Alternatives considered:**
- `pipeline` — shorter but ambiguous in context
- `compose` — functional programming term, less clear to all backgrounds
- `chain` — imprecise, implies linked lists to some developers

**Consequences:**
- Slightly more verbose import
- Zero ambiguity about what the utility does

---

## Decision 6 — Stories and tests as root-level mirrors of src/

**Decision:** Place `stories/` and `tests/` at the project root,
structured to mirror `src/`.

**Why:**
Colocating stories and tests next to components (e.g. `FormField.stories.ts`
alongside `FormField.vue`) is common but it mixes concerns. When coverage
is a root-level concern — something the whole team cares about — it should
be visible at the root level. The mirror structure makes gaps in coverage
immediately visible: a folder that exists in `src/` but not in `stories/`
or `tests/` is a deliberate architectural statement, not an oversight.

**Alternatives considered:**
- Colocation — common convention, but hides coverage picture
- `__tests__` folders per component — same problem as colocation
- Single flat `tests/` folder — loses the mirror relationship

**Consequences:**
- Coverage gaps are visible at a glance
- New developers understand the testing philosophy from structure alone
- Import paths in test files are slightly longer

---

## Decision 7 — Dumb components have stories, not tests

**Decision:** Dumb components (blocks, module display/form components,
layouts) have Storybook stories as their quality mechanism. They never
have unit tests.

**Why:**
Dumb components have no logic to unit test — they render props and emit
events. The interesting question for a dumb component is not "does the
logic work?" but "does it look right and behave correctly across states?"
Storybook answers that question better than a unit test. Writing unit
tests for dumb components adds maintenance overhead without meaningful
safety gains.

**Alternatives considered:**
- Unit tests for all components — high overhead, low value for pure presentational code
- Cypress/Playwright component tests — valuable but expensive, better reserved for integration
- No coverage for dumb components — stories provide the safety net

**Consequences:**
- Storybook is a first-class quality tool, not optional documentation
- Stories must cover all meaningful states: default, disabled, error, loading, empty
- Visual regression testing (e.g. Chromatic) amplifies the value of this decision
- Every emit on a dumb component must carry a meaningful argument — edit/delete
  events carry the entity id (`edit: [id: string]`), submit events carry the
  form values, v-model events carry the new value. Parameterless emits are a
  smell unless the component genuinely has no context to pass
- Every story must wire all emits with `fn()` from `storybook/test` in the meta
  `args` block so the Actions panel shows the event name and its arguments.
  The global `argTypesRegex` in `preview.ts` is a fallback only — explicit
  `fn()` handlers are required for typed args and play function access

---

## Decision 8 — Smart containers have tests, not stories

**Decision:** Container components have Vitest unit tests as their
quality mechanism. They never have Storybook stories.

**Why:**
Containers are logic components — they coordinate stores, compose
loading flags, and manage view state. The interesting question for a
container is not "does it look right?" but "does it wire things up
correctly?" Unit tests answer that question. A Storybook story for a
container would require mocking the store, making it fragile and of
limited visual value.

**Alternatives considered:**
- Stories with mocked stores — possible but fragile and misleading
- Both stories and tests — doubles the maintenance overhead
- Neither — no coverage for the most logic-dense layer

**Consequences:**
- Container tests mock store wrappers, never raw Pinia stores
- The store wrapper mock interface is the contract between layers
- Containers stay simple — complexity is a signal to extract a composable

---

## Decision 9 — Composables split into orchestration and effects

**Decision:** Split composables into two explicit categories:
`orchestration/` for cross-domain workflows and `effects/` for
page lifecycle and route reactions.

**Why:**
A single `composables/` folder with no subcategories accumulates
mixed concerns quickly. Orchestration composables coordinate multiple
store wrappers and contain workflow logic. Effects composables manage
lifecycle hooks and route watching. These are different responsibilities
with different testing approaches and different reasons to change.
Making the distinction explicit in the folder structure makes it clear
where new composables belong and why.

**Alternatives considered:**
- Single flat `composables/` folder — grows into a miscellaneous drawer
- Feature-based composables folder — duplicates the modules structure
- Composables colocated with modules — obscures cross-domain usage

**Consequences:**
- Orchestration composables are the only place cross-domain coordination happens
- Effects composables are the right place for `onMounted` and `watch` — not containers
- The distinction is a useful prompt when writing code: which category is this?

---

## Decision 10 — Services are internal to store wrappers

**Decision:** Services are never exported from the store wrapper.
Components and composables call actions — they never call services directly.

**Why:**
If services are exposed, components will eventually call them directly.
Once that pattern exists it is hard to reverse. Keeping services internal
enforces a clean public API: the wrapper is the only way in. This means
loading state, error handling, and state patching always happens in one
place per domain.

**Alternatives considered:**
- Exported services — flexible but leads to inconsistent patterns
- Services injected via provide/inject — overly complex
- HTTP calls directly in components — impossible to test consistently

**Consequences:**
- Every external call goes through an action
- Loading and error state is always handled consistently
- Services can be swapped or mocked at the wrapper boundary

---

## Decision 11 — Lambda bundling strategy

**Decision:** Each Lambda function is independently bundled via CDK's
`NodejsFunction` + esbuild. One folder per domain in `functions/`.
Designed to scale to ~15 functions.

**Why:**
CDK's `NodejsFunction` handles per-function bundling automatically —
no build scripts to maintain. Each function bundle is small and
isolated. Independent bundles mean a change to one function does not
affect others. Under 15 functions, rebuild times are not a meaningful
problem.

**Alternatives considered:**
- Single shared bundle — grows with every handler, cold starts suffer
- Turborepo per-function packages — justified over ~15 functions but
  adds significant tooling overhead below that threshold

**Consequences:**
- Scales cleanly to ~15 Lambda functions
- If function count exceeds ~15 or dependencies diverge significantly,
  migrating to Turborepo with per-function packages is the next step
- The 15-function boundary is a design target, not a hard limit

---

## Decision 12 — Turborepo is not a default

**Decision:** Single repo is the standard project structure. Turborepo
is introduced only when a specific scaling problem requires it.

**Why:**
Complexity is not added speculatively. A single repo with Vite,
esbuild via CDK, and a two-project Vitest config handles the standard
project shape cleanly without Turborepo. Adding Turborepo before it
is needed means learning and maintaining tooling that provides no
current benefit.

**Alternatives considered:**
- Turborepo by default — over-engineered for projects that never
  need a second app or hit Lambda scaling limits
- Turborepo when second app is added — this is the chosen approach

**When Turborepo becomes appropriate:**
- A second Vue app is genuinely required
- Lambda function count exceeds ~15 with diverging dependencies
- Shared packages need independent versioning

**Consequences:**
- Most projects never need Turborepo
- When the threshold is reached, `vue-monorepo-setup` skill documents
  the migration path
- Developers are not burdened with monorepo tooling on simple projects

---

## Decision 13 — Components are built in-app before extraction

**Decision:** Shared components are built inside the first application,
stabilised through real use, then extracted to a shared package when
a second application genuinely needs them.

**Why:**
A component's API is not stable until it has been used in real
features. Extracting to a shared library before the API has proven
itself locks in premature decisions and adds monorepo overhead before
the benefit exists. Building in-app first is faster and produces
better component APIs.

**Alternatives considered:**
- Design shared library upfront — adds overhead before benefit is proven
- Never extract — works until a second app needs the components

**What makes extraction safe:**
- Blocks were designed dumb from day one — no store imports to untangle
- CSS token styling means components adapt to any app theme automatically
- Stories already exist and move with the component
- Extraction is a file move and import path update, not a rewrite

**Signal for when to extract:**
- A second app genuinely needs the component
- The component API has been stable for several weeks
- At least 3-4 components are ready — justifies the monorepo setup cost

**Consequences:**
- Developers have permission to build locally without guilt
- Premature abstraction is explicitly rejected by this decision
- The extraction path is well-defined when the time comes

---

## Decision 14 — pnpm as the package manager

**Decision:** pnpm is the required package manager across all projects.
Enforced via `packageManager` field in `package.json` and an `.npmrc`
at the project root.

**Why:**
pnpm installs are significantly faster than npm due to a shared content-
addressable store — packages are not duplicated across projects on the
same machine. More importantly, pnpm enforces strict dependency
isolation by default — packages can only access dependencies they
explicitly declare. This prevents a common class of bugs where code
works locally because of accidentally hoisted transitive dependencies
but fails in CI or production.

**Alternatives considered:**
- npm — slower installs, permissive hoisting allows implicit dependencies
- yarn — comparable speed to pnpm but less strict isolation by default
- yarn berry (PnP) — strict isolation but non-standard module resolution
  causes friction with many tools

**Consequences:**
- All developers must have pnpm installed — `npm install -g pnpm`
- CI pipelines use `pnpm install` not `npm install`
- `pnpm dlx` replaces `npx` for one-off CLI tools
- `shamefully-hoist=false` in `.npmrc` keeps dependency resolution strict
- If a package breaks due to missing peer dependencies, it must be
  declared explicitly — this is correct behaviour, not a bug
- Every package needed at the project root must be a direct devDependency —
  including packages that are peers of direct deps (e.g. `esbuild` for Vite,
  `storybook` core for `@storybook/vue3-vite`). Transitive deps are not
  accessible with strict isolation and will produce a runtime resolution error,
  not an install error.

---

## Decision 15 — Vite 8 + Storybook 10 as the baseline stack

**Decision:** New projects start on Vite 8, Vitest 3, and Storybook 10.
The scaffolder (`create vue@latest`) is not used — all files and version
pins are written directly by the project setup skill.

**Why:**
`create vue@latest` snapshots whatever versions were current when the
scaffolder last published, which drifts. Using it produced outdated Vite 5
and Vitest 2 pins that required several manual post-install fixups to
resolve. Writing files directly gives the skill full ownership of version
decisions. Starting on Vite 8 and Storybook 10 is the right call on a blank
project — upgrading later, once real code exists, is significantly more
expensive.

Vite 8 moved to Rolldown + Oxc as its bundler. It is not a drop-in upgrade
from Vite 5 for established projects, but for a new project there is nothing
to break and the architecture is more future-proof.

**Alternatives considered:**
- Use `create vue@latest` and pin versions after — works once, but the
  scaffolder command cannot be run non-interactively, produces hidden drift,
  and the post-install fixup steps are easy to miss
- Stay on Vite 5 + Storybook 8 — simpler short-term but locks us into a
  major upgrade before we can adopt Storybook 10 or Rolldown tooling

**Consequences:**
- Node `>=20.19` is required (Vite 8 minimum — same as Storybook 10)
- `esbuild@^0.27` must be declared as an explicit devDependency (Vite 8 peer)
- `@vitejs/plugin-vue@^6` is required — v5 only supports Vite `^5||^6`
- `@storybook/addon-essentials` is not installed separately — it was absorbed
  into `storybook` core in v10
- `build.rollupOptions` becomes `build.rolldownOptions` if build config is
  ever needed — no impact on a fresh project with no custom build config
- A `pnpm.overrides` entry forcing `"vite": "^8.0.0"` is required in `package.json`.
  `vitest@3` and `@storybook/vue3-vite@10` declare peer deps on `vite@^5||^6` and
  have not yet updated their ranges for Vite 8. Without the override pnpm installs
  both Vite 5 and Vite 8, producing a type conflict between the two versions when
  `vue-tsc` checks `vitest.config.ts`. The override is the intended pnpm mechanism
  for running ahead of declared peer dep ranges — it is not a workaround

---

## Decision 16 — MCP-first shadcn-vue workflows

**Decision:** Use shadcn-vue MCP server as the default component install and discovery path in this codebase. Manual `pnpm dlx shadcn-vue add` is fallback only.

**Why:**
- MCP enables AI-assisted component discovery and installation, improving productivity and consistency.
- Natural language intent (`/mcp`, "Add button dialog") reduces command memorization and onboarding friction.
- Supports Copilot/VS Code and Claude Code client patterns in this repository’s skills-driven workflow.

**Alternatives considered:**
- Manual CLI-only (`pnpm dlx shadcn-vue add`) — functional, but unstable for team conventions and less discoverable.
- No formal opinion — leads to inconsistent source patterns across contributors.

**Consequences:**
- New seeds include `.vscode/mcp.json` and `.mcp.json` with shadcn MCP config.
- `components.json` remains the registry metadata contract; private registry auth via `.env.local`.
- `skills/vue-project-setup/SKILL.md` documents MCP-first usage + fallback instructions.
- The team standardizes on `/mcp` for registry browsing and install tasks, reducing divergence in project setups.


---

## Decision 17 — stories/ requires its own tsconfig.json

**Decision:** Add `stories/tsconfig.json` that extends `tsconfig.base.json`
and declares `@/*` → `../src/*` path mappings.

**Why:**
The TypeScript language server resolves path aliases by walking up from each
file until it finds a `tsconfig.json`. `stories/` lives at the project root
alongside `src/`, not inside it, so it is out of scope for `src/tsconfig.json`.
Without its own tsconfig, every `import ... from '@/...'` in a story file
produces a `Cannot find module` error in the IDE — even though Storybook
resolves the alias correctly at runtime via `vite.config.ts`.

**Alternatives considered:**
- Add stories to `src/tsconfig.json` — stories are not source files; the
  boundary between coverage and source code should be explicit
- Use relative imports in stories — fragile and verbose; breaks on any
  component move
- Add stories to the root `tsconfig.json` — the root tsconfig exists only
  to cover `vite.config.ts` and `vitest.config.ts`; broadening its scope
  conflates build config with application code

**Consequences:**
- IDE path resolution works correctly in all story files
- The file must be updated if the `@shared` alias is ever changed in `vite.config.ts`
- Do not delete this file — its absence produces no build error but silently
  breaks IDE navigation and type checking for all stories

---

## Decision 18 — CSS design tokens are mapped in the Tailwind theme using `<alpha-value>`

**Decision:** `tailwind.config.ts` extends `theme.colors` with every shadcn
CSS variable, using the `<alpha-value>` placeholder so that Tailwind's opacity
modifier syntax works. Components use standard Tailwind utility classes
(`bg-primary`, `text-foreground`, `border-border`) for all token-colored elements.

**Why:**
shadcn is designed to be used with Tailwind. Mapping the CSS variables in the
Tailwind theme is the intended integration — it is what `shadcn-vue init`
produces by default. Without the mapping, components must use verbose inline
`:style` bindings for every token color, and Tailwind modifiers like `hover:`,
`focus:`, responsive prefixes, and opacity modifiers (`bg-primary/50`) become
unavailable for design token colors. The coupling between Tailwind class names
and CSS variable names is intentional and documented — it is the contract, not
an accident.

The `<alpha-value>` placeholder (not a plain `hsl(var(--x))` string) is
required for opacity modifiers to work. Tailwind replaces `<alpha-value>` with
the actual opacity at build time, which allows classes like `bg-primary/50`
and `text-foreground/75` to produce correct CSS.

**Alternatives considered:**
- Plain `hsl(var(--x))` strings without `<alpha-value>` — works for solid
  colors but breaks opacity modifier syntax (`bg-primary/50` has no effect)
- Inline `:style` bindings — verbose, loses all Tailwind modifier support,
  requires more markup for simple color applications
- Tailwind arbitrary values (`bg-[hsl(var(--primary))]`) — no config change
  needed but syntax is ugly and opacity modifiers still don't work

**Consequences:**
- All token colors are available as standard Tailwind utilities: `bg-primary`,
  `text-foreground`, `border-border`, `bg-card`, etc.
- Opacity modifiers work: `bg-primary/50`, `text-foreground/75`, `bg-primary/15`
- Hover, focus, and responsive variants work: `hover:bg-primary`, `md:bg-secondary`
- When a new token is added to `globals.css`, a matching entry must be added
  to `tailwind.config.ts` — they are kept in sync manually
- Tailwind's content scanner must see complete class names as string literals.
  Do not construct token class names dynamically from partial strings
  (e.g. `` `bg-${tokenName}` ``) — Tailwind will not include them in the build

---

## Decision 19 — Form components copy props into local state; data only flows out via submit

**Decision:** Form components copy `initialValues` into a local `ref` on
setup. All edits mutate only that local copy. The only way data leaves the
component is via `emit('submit', { ...values.value })`. Cancel discards
local state with no side effects.

**Why:**
If the form bound directly to the parent's object (by reference), every
keystroke would mutate application state before the user confirms. That
makes cancel semantics impossible — there is nothing to discard — and
forces the container to implement its own undo logic. Copying on init
means the form is the sole owner of in-progress edits. The parent never
sees a value until the user explicitly submits.

**Alternatives considered:**
- v-model binding to parent object — works for simple cases, but mutates
  upstream state on every change and makes cancel a complex rollback
- Emit every field change as the user types — real-time sync at the cost
  of the container tracking dirty state and handling cancellation itself

**Consequences:**
- Cancel is always safe — local state is discarded, parent is untouched
- The container decides what to do with submitted values (e.g. call a store action)
- The form is stateless from the parent's perspective until submit fires
- Arrays and nested objects must be spread explicitly on init — passing them
  by reference re-introduces the mutation problem for those fields

---

## Decision 20 — Router as source of truth for navigation state (shareable links)

**Decision:** When a container manages views that correspond to meaningful
URLs (e.g. list / detail / edit), those views are driven by the router via
`useRoute()` / `useRouter()`. Navigation state is never stored in the Pinia
store, and is only kept as a local `ref` when it does not warrant a URL.

**Why:**
If view state lives in a local `ref`, the URL never changes and the user
cannot share or bookmark a specific contact, refresh to a detail view, or
use browser back/forward. Putting view state in the store is worse — the
store owns domain data, not UI position. The router is already the canonical
source of truth for "where the user is"; using it for navigation state
keeps that contract consistent.

The concrete consequence caught during implementation: `editMode: boolean`
was initially added to `ContactsState`. It was removed in the same session
once the routing approach was decided — the store had no business knowing
whether the form was open.

**Alternatives considered:**
- Local `ref` for selected id and edit mode — no shareable URLs, back/forward broken
- Pinia store for view state — store owns data, not position; wrong abstraction

**What belongs in the router:**
- Which entity is selected (`/contacts/view/:id`)
- Which mode is active (`/contacts/edit/:id` vs `/contacts/add`)

**What stays as a local ref:**
- Transient UI state with no URL meaning (e.g. a confirmation dialog, a tooltip open state)

**Consequences:**
- All contacts views are deep-linkable and shareable
- Browser back/forward work without extra implementation
- Container tests use `createMemoryHistory` + a real router rather than mocking refs — tests are more realistic
- The display branch must handle three explicit states — loading, not-found, and populated — because data arrives asynchronously after the route is already active. A catch-all `v-else` that defaults to the form is wrong; each state needs its own branch.
- `onMounted` fires once per component instance; route changes within the same component do not re-trigger it

---

## Decision 21 — Date fields are ISO strings throughout; display components own formatting

**Decision:** Date fields are `string | null` (ISO 8601) everywhere in the app —
domain types, store state, service layer, and form payloads. No `Date` objects
exist outside the `DatePicker` block itself. The `DatePicker` block accepts and
emits `string | null`; it converts internally to a `Date` for the calendar widget
and converts back to an ISO string on selection. Display components are responsible
for formatting a date string for presentation (e.g. `new Date(value).toLocaleDateString()`).

**Why:**
ISO strings are JSON-safe and survive `JSON.parse` without any coercion — the value
you store is the value you read back. Introducing `Date` objects into domain types
requires a serialization boundary in the service (with `fromRecord`/`toRecord` helpers
and a `Stored[Domain]` type), which adds boilerplate for every domain with a date field.
Since the only consumer that ever needs a real `Date` object is the DatePicker, it
is simpler for the block to own that conversion internally than to push it into the
service layer for the entire application.

**Alternatives considered:**
- `Date | null` in domain types with service serialization boundary — rejected: adds `StoredDomain` / `fromRecord` / `toRecord` to every domain, more moving parts for no practical gain
- `Date | null` coerced ad-hoc in components — rejected: spreads type noise across the presentation layer

**Consequences:**
- Domain types use `string | null` for all date fields (e.g. `birthday: string | null`)
- Services have no date-specific conversion logic — ISO strings are stored and returned as-is
- Display components call `new Date(value).toLocaleDateString()` (or equivalent) when rendering
- The `DatePicker` block is the single place where `Date` objects exist; it handles the ISO string ↔ `Date` conversion internally

---

## Decision 22 — CQRS split: one Lambda for reads, one for writes

**Decision:** Use two Lambda functions — `query` and `command` — instead of
one handler per domain.

**Why:**
A per-domain split (contacts handler, matters handler) produces four functions
with identical structure and shared IAM concerns. A CQRS split along the
read/write axis is more aligned with how the backend actually scales: read
patterns and write patterns diverge (caching, concurrency, latency budgets).
Two functions also keeps cold-start surface area minimal while the domain count
is small.

The query handler is simple by design — it performs a full table scan and
returns all records. Client-side filtering handles the rest. This keeps the
backend thin until there is a demonstrated need for server-side filtering or
pagination.

**Alternatives considered:**
- One Lambda per domain — four functions, identical pattern, more IAM boilerplate
- One Lambda for everything — simpler deploy, but mixes read and write code paths and complicates IAM scoping
- Per-operation functions — too granular for this scale; unjustified overhead

**Consequences:**
- Query Lambda has read-only IAM on both tables
- Command Lambda has write-only IAM on both tables — cannot read its own writes
- If a command needs to return the saved record it must reconstruct it from the request, not re-query
- Introducing server-side filtering means changing the query handler only — command is unaffected
- If read and write scaling needs diverge significantly, Lambda reserved concurrency can be set independently

---

## Decision 23 — CloudFront routes /api/* to API Gateway via a CloudFront Function

**Decision:** The SPA calls all API endpoints as relative paths (`/api/contacts`).
A CloudFront behavior matches `/api/*` and routes those requests to the API Gateway
origin. A CloudFront Function at the viewer-request stage strips the `/api` prefix
before CloudFront forwards the request.

**Why:**
The obvious alternative — giving the frontend the API Gateway URL and making
cross-origin requests — requires CORS headers on every response, adds a preflight
round-trip to every mutating request, and leaks the infrastructure URL into the
app. By routing through CloudFront the browser sees a single origin. No CORS
configuration is needed anywhere. The SPA uses simple relative paths with no
knowledge of where the API actually lives.

A CloudFront Function was chosen over Lambda@Edge for the rewrite because the
operation is a single URI string replacement — well within the CloudFront Function
execution budget and significantly cheaper per invocation.

**Alternatives considered:**
- CORS on API Gateway + environment-injected URL — works but adds request overhead and couples the app to the infrastructure URL
- API Gateway custom domain as a CloudFront origin path — achieves same routing but requires a custom domain and ACM certificate
- Lambda@Edge for the rewrite — same outcome, but Lambda@Edge is heavier and more expensive for a trivial string operation

**Consequences:**
- The SPA never needs to know the API Gateway URL
- No `config.json` fetch at startup, no build-time environment variable for the API URL
- All API calls are relative paths — the app works identically on localhost (via a dev proxy) and in production
- The CloudFront Function must be kept to the JS 2.0 runtime — no Node APIs available
- CORS headers on API Gateway are retained in case direct access is ever needed for testing, but the browser path never triggers them

---

## Decision 24 — Separate DynamoDB tables per domain

**Decision:** Each domain (contacts, matters) has its own DynamoDB table.

**Why:**
Single-table DynamoDB design is a valid pattern for related data accessed
together, but it adds complexity — composite keys, entity type prefixes,
access pattern design — that is not justified when each domain is queried
independently. Separate tables are simpler to reason about, simpler to
grant IAM permissions on, and easier to monitor in CloudWatch.

**Alternatives considered:**
- Single table with `entityType` prefix — correct for co-located access patterns, but our domains are queried independently
- Single table per Lambda (one for query, one for command) — wrong axis; tables are a data concern, not a compute concern

**Consequences:**
- IAM is scoped per table and per Lambda role — query Lambda cannot write, command Lambda cannot read
- Table names are injected as environment variables; neither Lambda has a hardcoded table reference
- Adding a new domain means adding a new table and updating both Lambda environment configs
- CloudWatch metrics and DynamoDB capacity are visible and configurable per domain

---

## Adding a new decision

## Decision 25 — Feature specs are immutable; deviations are recorded separately

**Decision:** Feature specs in `docs/features/` describe design intent and are
never edited to match an implementation. Approved deviations are appended to a
**Build notes** section at the bottom of the spec in past tense, with a date
and explanation.

**Why:**
Editing the spec to match what was built destroys the information. The gap
between spec and implementation is meaningful — it tells you where a constraint
was hit, where a design assumption was wrong, and where a future cleanup
opportunity exists. If the spec is kept in sync with the build, that signal is
lost permanently.

Asking before deviating (rather than documenting after) is equally important.
An agent that makes a unilateral workaround and records it after the fact has
already made a product decision that belongs to the designer or engineer.

**Alternatives considered:**
- Update the spec when implementation differs — loses intent, hides gaps
- No deviation tracking at all — deviations accumulate silently with no record

**Consequences:**
- Specs remain valid as independent build inputs across multiple sessions
- The build notes section grows over time and surfaces patterns worth fixing
- Builders must pause and ask when blocked — slightly slower but prevents
  silent drift between design and implementation

---

When the team makes a significant architectural choice, add an entry here.
A good decision entry answers three questions:

1. **What** was decided
2. **Why** this option over the alternatives
3. **What** are the consequences — including the uncomfortable ones
