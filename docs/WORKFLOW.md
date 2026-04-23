# Development Workflow

This document describes the order in which features are built and why.
It is the primary reference for engineers learning to work in this codebase.

Read `ARCHITECTURE.md` first to understand the layers.
Read `DECISIONS.md` when you disagree with a pattern.

---

## Working with feature specs

Feature specs in `docs/features/` describe design intent. They are not updated
to match the implementation — the gap between spec and build is meaningful
information.

**When building from a spec:**

- Follow the spec as written. If something is technically impossible or the spec
  is ambiguous, **stop and ask** before proceeding. Do not make unilateral
  decisions about deviations and document them after the fact.
- If a constraint (library limitation, type system, shadcn behaviour) means the
  spec cannot be followed exactly, surface it clearly: explain the constraint,
  propose the closest alternative, and wait for confirmation.
- Once a deviation is approved, append it to the **Build notes** section at the
  bottom of the spec. Never modify the original spec text.

**Build notes format:**

```markdown
## Build notes

> Append-only. Original spec text is never modified — approved deviations are
> recorded here. Write in past tense. Explain why so future readers can judge
> whether the workaround is still valid.

**[date] — short title**
What was specified, what was built instead, and why.
```

---

## The core principle: dumb first

Every feature is built from the outside in — presentation before logic.

You start with what the user sees (blocks and dumb components), prove the UI
is correct in Storybook, then wire in state and services underneath. At no point
do you need a running backend to make progress on the UI. The store and service
layers are added last, when the component API is stable.

**Why this order matters:**

- Stories are cheap to write and fast to verify — you see the result instantly
- Component APIs stabilise under real use before logic is attached to them
- If the design changes, you only throw away dumb components — not store logic
- Each layer is independently testable: stories for dumb, unit tests for smart

---

## The progression

```
1. shadcn primitives    install the UI components you will need
2. blocks               shared, reusable building blocks
3. module dumb          feature-specific display and form components
4. smart container      wires the module to state
5. store                state, reducers, service — one domain
6. composables          cross-domain coordination and page lifecycle
7. page + routing       assembles everything into a route
```

Each layer depends only on the layers above it — never below. A block never
imports from a module. A container never calls a service directly.

---

## Step 1 — Install shadcn primitives

Before writing any component, identify the shadcn UI primitives the feature needs.
Install them via the MCP server (preferred) or CLI fallback:

```bash
pnpm dlx shadcn-vue add button input label table card
```

Check `src/components/ui/` — if a primitive is already installed, do not reinstall it.

**Skill:** none — use MCP or CLI directly.

---

## Step 2 — Blocks

Blocks are reusable, domain-agnostic building blocks. They live in
`src/components/blocks/` and are shared across every feature.

**Before building a new block**, check `docs/blocks.md` — it may already exist.

A block:
- Has no knowledge of any domain or store
- Accepts typed props and emits events up
- Has a Storybook story as its quality mechanism
- Never has a test file

**Skill:** `vue-block`

**Done when:** every story state passes visual review in Storybook.

### What makes a good block

A UI pattern becomes a block when it appears in more than one place, or when
it is complex enough to be worth isolating (e.g. a date picker, a contact avatar).

The `RowActions` block is a good example — the edit/delete dropdown appeared in
both `ContactList` and `MatterList`. Once the pattern was clear, it was extracted
to a block and both lists were updated to use it.

---

## Step 3 — Module dumb components

Dumb components live inside a module folder (`src/components/modules/[Name]/`).
They are feature-specific but still have no store knowledge.

A module typically has:

| Component | Purpose |
|---|---|
| `[Name]List` | Table or list of all items — rows are clickable |
| `[Name]Display` | Read-only detail card for one item |
| `[Name]Form` | Shared add and edit form — mode determined by `initialValues` |

**Skill:** `vue-module-dumb`

**Done when:** all story states pass, all emits are wired with `fn()` and visible in the Actions panel.

### Emit conventions for dumb components

- **List components** emit `select(id)`, `edit(id)`, `delete(id)`, `add()`
- **Display components** emit `back()`, `edit(id)`, `delete(id)` — edit/delete always carry the entity id; back navigates to the list
- **Form components** emit `submit(values)`, `cancel()` — submit carries the full edited form state, not `initialValues`
- Parameterless emits are a smell unless the component genuinely has no context to pass

### Form component pattern (Decision 19)

Forms copy `initialValues` into a local `ref` on setup. All edits mutate
only that local copy. Data only flows out via `emit('submit', { ...values })`.
Cancel discards local state with no side effects.

```
initialValues  →  seeds local values ref (read once)
user edits     →  mutate only local values ref
save clicked   →  emit('submit', { ...values })   ← edited state, not initialValues
cancel clicked →  emit('cancel')                  ← local state discarded
```

---

## Step 4 — Smart container

The container is the single component in a module that owns state coordination.
It is the boundary between application state and the presentation layer.

**It owns:**
- Store wrapper imports (via composable when coordinating multiple domains)
- Loading flag composition
- Wiring emits from dumb components to store actions and router navigation

**It never:**
- Imports raw Pinia stores
- Calls services directly
- Contains business logic
- Has a Storybook story

**Skill:** `vue-smart-container`

**Done when:** the container test passes and the feature is visually wired end-to-end.

### Navigation state lives in the router (Decision 20)

Which view is active and which entity is selected are derived from the route —
not held in local refs or the Pinia store.

- `route.name` determines which child component renders
- `route.params.id` is the selected entity id
- `router.push()` is how the container changes view
- Local `ref` is only for transient UI state with no URL meaning (e.g. a confirmation dialog)

### Display branch must handle three explicit states

When the container shows a detail view, the display branch must have three
explicit states — not a single condition or a catch-all `v-else`:

1. **Loading** — data is in-flight (`loading` is true); show a spinner
2. **Not found** — data has loaded but the id does not match any item
3. **Populated** — item is present; show the display component

This matters for deep links: the URL is active before the store has data.

### When a composable is needed

If the container imports two or more store wrappers, extract an orchestration composable.
If the container fetches data on mount or reacts to route changes, extract an effects composable.

---

## Step 5 — Store

Each domain store has four files:

| File | Purpose |
|---|---|
| `use[Domain]Store.ts` | Public API — readonly state + named actions |
| `[domain]Reducers.ts` | Pure state transforms — no side effects |
| `[domain]Service.ts` | External calls — internal to wrapper only |
| `types.ts` | Domain types and initial state |

**Skill:** `vue-store`

**Done when:** wrapper, reducer, and service tests all pass.

The reducer tests are the highest-value tests in the codebase — they cover
the most logic with the least setup.

### Date fields are ISO strings throughout (Decision 21)

Date fields are `string | null` everywhere — domain types, store state, services,
and form payloads. No `Date` objects exist outside the `DatePicker` block, which
handles the ISO string ↔ `Date` conversion internally. Display components are
responsible for formatting a date string for presentation. Never introduce
`StoredDomain` / `fromRecord` / `toRecord` for date fields.

### Store state shape

Domain data only — `items[]`, `loading`, `error`. Navigation state (`selectedId`,
view mode) is never stored in Pinia. UI-only state belongs in the router or a
local container ref.

---

## Step 6 — Composables

Use composables when a container grows beyond coordinating one store.

| Type | Folder | Use when |
|---|---|---|
| Orchestration | `src/composables/orchestration/` | Two or more stores need coordinating |
| Effects | `src/composables/effects/` | Page needs data on mount or route reactions |

**Skill:** `vue-composable`

---

## Step 7 — Page and routing

Pages assemble containers into routes. They contain no logic of their own —
a page is a layout wrapper and a container, nothing more.

Add routes to `src/router/index.ts` and create the page in `src/pages/[domain]/`.

### Route pattern for a standard domain

```
/[domain]              name: '[domain]'        → list view
/[domain]/add          name: '[domain]-add'    → add form
/[domain]/view/:id     name: '[domain]-view'   → detail view
/[domain]/edit/:id     name: '[domain]-edit'   → edit form
```

Root `/` redirects to the primary domain. All four routes use the same page
component — the container derives which view to render from `route.name`.

---

## Step 8 — Deploy to AWS

Run this step once all domains are working end-to-end locally with localStorage
and all tests pass. Do not run it mid-feature.

**Skill:** `aws-deploy`

The skill has two phases:

- **Phase 1 — Scaffold** (no AWS account needed): generates `cdk/`, Lambda
  functions, shared API types, and the CloudFront/S3 hosting stack. Run this
  to review and customise the infrastructure before committing to a deployment.

- **Phase 2 — Deploy** (requires AWS credentials): deploys the API stack,
  updates `.env.local` with the invoke URL, builds the SPA with
  `VITE_USE_LOCAL_STORAGE` unset (so the API service is active), deploys the
  hosting stack, and smoke-tests all endpoints. No service code changes are
  needed — switching backends is controlled entirely by the env var.

The Vite dev server proxy (`/api/*` → API Gateway) mirrors the CloudFront
routing exactly — no code changes are needed between local and deployed environments.

---

## Reference implementation: Contacts

The contacts feature is the completed reference implementation for this workflow.
When in doubt about how a layer should look, read the contacts implementation.

| Step | Files |
|---|---|
| App shell | `src/layouts/AppLayout/AppLayout.vue`, `src/components/blocks/AppNav/AppNav.vue`, `src/App.vue` |
| Blocks | `src/components/blocks/FormField/`, `StatusBadge/`, `ContactAvatar/`, `DatePicker/`, `RowActions/`, `ContactPicker/` |
| Module dumb | `src/components/modules/contacts/ContactList/`, `ContactDisplay/`, `ContactForm/` |
| Store | `src/stores/contacts/` |
| Container | `src/components/modules/contacts/ContactsContainer/ContactsContainer.vue` |
| Page + routing | `src/pages/contacts/ContactsPage.vue`, `src/router/index.ts` |
| Tests | `tests/src/stores/contacts/`, `tests/src/components/modules/contacts/` |

---

## Session prompt templates

Each domain is built in two sessions: one for the dumb layer, one for the smart layer.
Copy the relevant template and fill in `[Domain]` / `[domain]`.

### Session A — Dumb layer (blocks + module components + stories)

```
Build the dumb layer for the [domain] feature.

Read first:
- docs/features/[domain].md — the agreed design and build order
- docs/WORKFLOW.md — conventions for emits, form patterns, story coverage
- docs/blocks.md — check whether any needed blocks already exist
- src/components/blocks/ — existing blocks to reuse or extend
- src/components/modules/contacts/ — reference implementation for component structure

What to build (follow the order in the feature doc):
1. Any new blocks needed — use vue-block skill
2. Module dumb components + stories — use vue-module-dumb skill

Emit conventions:
- Display components must emit back(), edit(id), delete(id)
- List components must emit select(id), edit(id), delete(id), add()
- Form components must emit submit(values), cancel()

Done when: all stories exist and all story states pass visual review.
```

### Session B — Smart layer (store + composable + container + page + routing)

```
Build the smart layer for the [domain] feature.
The dumb components are already built — do not modify them unless a bug is found.

Read first:
- docs/features/[domain].md — the agreed design
- docs/ARCHITECTURE.md — Containers and Stores sections
- docs/DECISIONS.md — especially Decisions 19, 20, 21
- src/stores/contacts/ — the store pattern to follow exactly
- src/components/modules/contacts/ContactsContainer/ — the container pattern to follow exactly

What to build (in order):
1. Store — use vue-store skill
   - Two service files: `[domain]LocalStorageService.ts` (key `cc_[domain]`) and `[domain]ApiService.ts` (fetch)
   - `[domain]Service.ts` is a thin env-based selector: `VITE_USE_LOCAL_STORAGE ? localStorageService : apiService`
   - Date fields are ISO strings (`string | null`) throughout — domain types, store, and services. The `DatePicker` block handles `Date` conversion internally and emits `string | null`. Display components format date strings for presentation. No `StoredDomain` / `fromRecord` / `toRecord` needed
   - State shape: domain items[], loading, error only — no navigation state
2. Orchestration composable — use vue-composable skill (only if coordinating multiple stores)
3. Container — use vue-smart-container skill
   - Navigation state from router, not local refs (Decision 20)
   - Display branch: explicit loading / not-found / populated states
4. Page: src/pages/[domain]/[Domain]Page.vue — thin layout wrapper only
5. Routes: /[domain], /[domain]/add, /[domain]/view/:id, /[domain]/edit/:id
6. Nav: add the new section to `AppNav` (`src/components/blocks/AppNav/AppNav.vue`) and wire it in `App.vue`

Tests required:
- tests/src/stores/[domain]/[domain]Reducers.test.ts
- tests/src/stores/[domain]/use[Domain]Store.test.ts
- tests/src/components/modules/[domain]/[Domain]Container.test.ts

All tests must pass before the session is complete.
```

---

## Using skills

Skills generate code that follows all conventions automatically.
The fastest way to write code that passes review is to use them.

| Layer | Skill |
|---|---|
| Block + story | `vue-block` |
| Module dumb components + stories | `vue-module-dumb` |
| Story for any component | `vue-story` |
| Layout component | `vue-layout` |
| Smart container + test | `vue-smart-container` |
| Domain store | `vue-store` |
| Composable + test | `vue-composable` |
| New project | `vue-project-setup` |
| Deploy to AWS | `aws-deploy` |

---

## Common mistakes

**Building logic before UI is stable**
Adding store actions before the component API has been proven in Storybook.
The component API often changes once you see it in use — store logic written
against an unstable API is wasted work.

**Skipping stories**
Stories are not optional documentation. They are the quality mechanism for
dumb components (Decision 7). A dumb component without stories has no coverage.

**Logic in dumb components**
A dumb component that imports a store or calls a service is in the wrong layer.
Move the logic up to the container or down to the store.

**Parameterless emits on display components**
`edit()` and `delete()` without an id force the parent to already know
the active item by other means. Always carry the entity id: `edit(id: string)`.

**Navigation state in the store**
`selectedId`, `editMode`, or any view-toggle state does not belong in Pinia.
The store owns domain data. The router owns where the user is. (Decision 20)

**Date objects outside the DatePicker block**
Date fields are ISO strings (`string | null`) throughout the app. The only place
a `Date` object exists is inside the `DatePicker` block — it manages the conversion
internally. Display components format date strings for presentation (e.g.
`new Date(value).toLocaleDateString()`). Never use `Date` objects in domain types,
store state, or services, and never add `StoredDomain` / `fromRecord` / `toRecord`
for date fields. (Decision 21)

**Recreating an existing block**
Check `docs/blocks.md` before building a new block. Duplicate blocks create
visual inconsistency and maintenance burden.

**catch-all `v-else` in the container template**
A `v-else` that defaults to the form hides loading and not-found states.
Every branch in the container template must be explicit.
