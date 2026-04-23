# Matters Feature

This document describes the design intent for the matters feature.
Build components and stories from this spec. If a technical constraint prevents
following the spec exactly, stop and ask before proceeding. Approved deviations
are recorded in the **Build notes** section at the bottom — the spec text itself
is never modified to match an implementation.

---

## Dependencies

| Dependency | Why |
|---|---|
| Blocks (`docs/features/blocks.md`) | `FormField`, `DatePicker`, `StatusBadge`, `RowActions` must exist; `ContactPicker` is new and built as part of this feature |
| Contacts (`docs/features/contacts.md`) | The contacts store (`useContactsStore`) must exist — the matters container and orchestration composable coordinate across both domains |

Build contacts completely (dumb layer + store) before starting this feature.

---

## Overview

A matter is a legal case or engagement. It has a lifecycle (open → pending →
closed), a reference number, a description, and references to contacts in
specific roles — a primary client, optional additional parties, and an optional
assigned attorney. All contact references are contacts within the system.

The matters feature depends on the contacts feature — the contacts store must
exist before the matters container can be built.

---

## Matter data shape

| Field | Type | Required | UI control |
|---|---|---|---|
| `id` | `string` | — | (system-generated) |
| `referenceNumber` | `string` | ✅ | Text input |
| `title` | `string` | ✅ | Text input |
| `description` | `string` | — | Textarea |
| `status` | `'open' \| 'pending' \| 'closed'` | ✅ | Select |
| `startDate` | `string \| null` | ✅ | Date picker (ISO string stored; picker accepts/emits `Date \| null` and the form converts at the boundary) |
| `closeDate` | `string \| null` | — | Date picker (same boundary pattern) |
| `clientId` | `string \| null` | ✅ | `ContactPicker` block (single, client type) |
| `additionalPartyIds` | `string[]` | — | `ContactPicker` block (multi, party type) |
| `attorneyId` | `string \| null` | — | `ContactPicker` block (single, attorney type) |
| `tags` | `string[]` | — | Multi-select combobox |

Predefined tag options: `Litigation`, `Contract`, `Advisory`, `Pro Bono` (extensible).

---

## Blocks required

### New block: `ContactPicker`

A filterable typeahead for selecting one or more contacts. Dumb — receives the
eligible contact list via props and filters by name in the UI. The container
decides which subset of contacts to pass for each role.

**Props:**

| Prop | Type | Required | Default |
|---|---|---|---|
| `contacts` | `Contact[]` | ✅ | — |
| `modelValue` | `string \| string[] \| null` | ✅ | — |
| `contactType` | `'client' \| 'attorney' \| 'party'` | ✅ | — |
| `multiple` | `boolean` | — | `false` |
| `placeholder` | `string` | — | derived from `contactType` |
| `disabled` | `boolean` | — | `false` |

**Emits:** `update:modelValue(value: string | string[] | null)`

**Placeholder defaults:** `"Search clients"` / `"Search attorneys"` / `"Search parties"`

**Story states required:** Default (empty), Selected (single), Multi-selected, Disabled

### Blocks reused from contacts

| Block | Purpose |
|---|---|
| `FormField` | Text inputs — reference number, title |
| `DatePicker` | Start date, close date |
| `StatusBadge` | Matter status display — extend to accept matter statuses (see below) |
| `RowActions` | Table row edit/delete menu |

### `StatusBadge` extension

Extend the existing `StatusBadge` to accept matter statuses:

| Status | Variant |
|---|---|
| `open` | `default` (primary) |
| `pending` | `secondary` |
| `closed` | `outline` |

---

## Module components

### `MatterList`

Read-only list of all matters.

**Props:** `matters: Matter[]`, `contacts: Contact[]` (for resolving client and attorney names), `loading?: boolean`

**Emits:** `select(id: string)`, `edit(id: string)`, `delete(id: string)`, `add()`

**Columns:** Reference number, Title, Status badge, Client name, Start date, Row actions

**Header action:** Add matter button (emits `add()`)

**Story states required:**
- Default — populated list
- Empty — no matters, explanatory message
- Loading — spinner in place of rows

---

### `MatterDisplay`

Read-only detail card for a single matter.

**Props:** `matter: Matter`, `contacts: Contact[]` (for resolving names from IDs)

**Emits:** `back()`, `edit(id: string)`, `delete(id: string)`

**Layout:** Reference number + title + status badge in header; field grid in
body (dates, client, attorney, additional parties, description, tags); Edit /
Delete in footer.

**Story states required:**
- Default — all fields present
- With close date and additional parties
- Minimal — only required fields

---

### `MatterForm`

Shared add and edit form. Mode determined by `initialValues`.

**Props:** `initialValues?: Partial<Matter>`, `contacts: Contact[]`, `loading?: boolean`

**Emits:** `submit(values: MatterFormValues)`, `cancel()`, `create-contact()`

**Fields:** Reference number, Title, Status, Start date, Close date, Client
(required), Additional parties (multi), Attorney, Description, Tags

**`create-contact` emit:** Triggered when the user clicks "+ Add new contact"
adjacent to the client picker. The form carries no context — the container
handles the workflow. The form stays mounted while the contact is being created.

**Submit validation:** Same pattern as `ContactForm` — submit always enabled,
`validate()` runs on click, errors shown immediately via `FormField` external
`error` prop.

**Date boundary:** Same pattern as `ContactForm` — `DatePicker` emits `Date | null`,
the form converts to ISO string into `values`, and converts back when populating
the picker from `initialValues`.

**Story states required:**
- Empty — add mode
- Populated — edit mode, all fields filled
- Loading — populated + `loading: true`
- Submit validation — interactive

---

## Container: `MattersContainer`

The single smart component. Coordinates two store domains (matters + contacts)
via an orchestration composable.

**No props, no emits, no Storybook story.**

**Navigation:** Route-driven — no local `editMode` or `selectedId` state.

| Route name | View rendered |
|---|---|
| `matters` | `MatterList` |
| `matters-add` | `MatterForm` (empty) |
| `matters-view` | `MatterDisplay` |
| `matters-edit` | `MatterForm` (pre-filled) |

**Contact filtering by role:**
- Client picker — pass contacts of type `organization` and `non-profit`
- Attorney picker — pass contacts of type `individual`
- Additional parties picker — pass all contacts

**Display branch:** Three explicit states required — loading, not-found,
populated. No catch-all `v-else`.

**Add-contact modal workflow:**
1. `MatterForm` emits `create-contact()`
2. Container opens a `Dialog` overlay containing `ContactForm`
3. The matter form stays mounted behind it — in-progress field state is preserved
4. On `ContactForm` submit: `createContact(values)` is called, dialog closes;
   the new contact appears in the picker list reactively
5. On `ContactForm` cancel: dialog closes, no contact created
6. No auto-selection after creation — the user selects the new contact manually

**Test required:** Vitest unit test using `shallowMount` + memory router +
mocked composable.

---

## Orchestration composable: `useMattersContacts`

Required because the container coordinates two store domains.

**Exposes:**
- All matters store state and actions (`matters`, `loading`, `error`, `loadMatters`, `createMatter`, `updateMatter`, `deleteMatter`)
- Contacts store state and `createContact` action (`allContacts`, `contactsLoading`, `createContact`)
- Computed filtered subsets: `clientContacts`, `attorneyContacts`, `partyContacts`
- `resolveContactName(id: string): string | null` helper
- `loadAll()` — fires both stores in parallel via `Promise.all`

**Test required:** Vitest unit test with mocked store wrappers.

---

## Store

| File | Purpose |
|---|---|
| `types.ts` | `MattersState`, `initialMattersState`; re-exports `Matter` / `MatterFormValues` |
| `matterReducers.ts` | Pure reducers: `setLoading`, `setError`, `setMatters`, `addMatter`, `updateMatter`, `removeMatter` |
| `matterLocalStorageService.ts` | localStorage implementation — active when `VITE_USE_LOCAL_STORAGE` is set |
| `matterApiService.ts` | HTTP fetch implementation — active by default |
| `matterService.ts` | Env-based selector |
| `useMattersStore.ts` | Public API: readonly state + named actions |

**State shape:**
```ts
interface MattersState {
  matters: Matter[]
  loading: boolean
  error: string | null
}
```

**Date handling:** Date fields are ISO strings throughout the store and services.
Conversion happens only at the form boundary.

**Tests required:**
- `matterReducers.test.ts`
- `useMattersStore.test.ts`

---

## Routing

| Path | Route name | View |
|---|---|---|
| `/matters` | `matters` | List |
| `/matters/add` | `matters-add` | Add form |
| `/matters/view/:id` | `matters-view` | Detail |
| `/matters/edit/:id` | `matters-edit` | Edit form |

All routes use the same page component. Add `Matters` to `AppNav`.

---

## shadcn primitives required

All primitives are shared with the contacts feature. No new installs needed
if contacts is already built.

---

## Skills

| Layer | Skill |
|---|---|
| `ContactPicker` block + story | `vue-block` |
| Module dumb components + stories | `vue-module-dumb` |
| Orchestration composable + test | `vue-composable` |
| Container + test | `vue-smart-container` |
| Store | `vue-store` |
| Additional stories | `vue-story` |

---

## Build notes

> Append-only. Original spec text is never modified — approved deviations are
> recorded here. Write in past tense. Explain why so future readers can judge
> whether the workaround is still valid.
