# Contacts Feature

This document describes the design intent for the contacts feature.
Build components and stories from this spec. If a technical constraint prevents
following the spec exactly, stop and ask before proceeding. Approved deviations
are recorded in the **Build notes** section at the bottom — the spec text itself
is never modified to match an implementation.

---

## Dependencies

| Dependency | Why |
|---|---|
| Blocks (`docs/features/blocks.md`) | `FormField`, `StatusBadge`, `ContactAvatar`, `RowActions`, `DatePicker` must exist before module components are built |

Contacts has no feature dependencies. It is the first domain built and serves
as the reference implementation for all subsequent features.

---

## Overview

Contacts are people and organisations the firm works with. Every contact has a
status lifecycle (lead → active → inactive) and may be assigned to matters in
specific roles (client, attorney, additional party). The contacts feature is
the reference implementation for all subsequent features in this codebase.

---

## Contact data shape

| Field | Type | Required | UI control |
|---|---|---|---|
| `id` | `string` | — | (system-generated) |
| `firstName` | `string` | ✅ | Text input |
| `lastName` | `string` | ✅ | Text input |
| `email` | `string` | ✅ | Text input (type email) |
| `phone` | `string` | — | Text input (type tel) |
| `company` | `string` | ✅ | Text input |
| `jobTitle` | `string` | — | Text input |
| `contactType` | `'individual' \| 'organization' \| 'non-profit'` | ✅ | Select |
| `status` | `'active' \| 'inactive' \| 'lead'` | ✅ | Select |
| `birthday` | `string \| null` | — | Date picker (ISO string stored; picker accepts/emits `Date \| null` and the form converts at the boundary) |
| `tags` | `string[]` | — | Multi-select combobox |

Predefined tag options: `VIP`, `Newsletter`, `Partner` (extensible).

`contactType` is used by the `ContactPicker` block in `MatterForm` to filter
eligible contacts by role. The container decides which subset to pass.

---

## Blocks required

| Block | Purpose |
|---|---|
| `FormField` | Label + input + error — see blocks.md |
| `StatusBadge` | Coloured status badge — see blocks.md |
| `ContactAvatar` | Circular avatar with initials fallback — see blocks.md |
| `RowActions` | Three-dot edit/delete menu for table rows — see blocks.md |
| `DatePicker` | Calendar popover — see blocks.md |

Check `docs/blocks.md` before building any block — it may already exist.

---

## Module components

### `ContactList`

Read-only list of all contacts.

**Props:** `contacts: Contact[]`, `loading?: boolean`

**Emits:** `select(id: string)`, `edit(id: string)`, `delete(id: string)`, `add()`

**Columns:** Avatar + full name, Email, Company, Status badge, Row actions

**Header action:** Add contact button (emits `add()`)

**Story states required:**
- Default — populated list
- Empty — no contacts, explanatory message
- Loading — spinner in place of rows

---

### `ContactDisplay`

Read-only detail card for a single contact.

**Props:** `contact: Contact`

**Emits:** `back()`, `edit(id: string)`, `delete(id: string)`

**Layout:** Avatar + name + status in header; field grid in body; tags as badges;
Back (left, ghost) / Edit + Delete (right) in footer.

**Story states required:**
- Default — all optional fields present
- With birthday
- With tags
- Minimal — only required fields

---

### `ContactForm`

Shared add and edit form. Mode is determined by `initialValues` — if it
contains an `id`, the form is in edit mode; otherwise add mode.

**Props:** `initialValues?: Partial<Contact>`, `loading?: boolean`

**Emits:** `submit(values: ContactFormValues)`, `cancel()`

**Fields:** First name, Last name, Email, Phone, Company, Job title, Status,
Birthday (date picker), Tags (multi-select combobox)

**Submit validation:** The submit button is never disabled for required-field
reasons. On click, `validate()` runs and immediately shows errors on all empty
required fields via the `FormField` external `error` prop. Individual fields
also self-validate on blur via `FormField`'s internal `touched` state.

**Date boundary:** The `DatePicker` block emits `Date | null`. The form converts
this to an ISO string on the way into `values.birthday`, and converts back to
`Date | null` when populating the picker from `initialValues`. No date objects
leave the form.

**Story states required:**
- Empty — add mode, all fields blank
- Populated — edit mode, all fields filled
- Loading — populated + `loading: true`
- Submit validation — interactive, click submit on empty form

---

## Container: `ContactsContainer`

The single smart component in the module. Owns store coordination and
route-driven navigation.

**No props, no emits, no Storybook story.**

**Navigation:** Which view is active and which contact is selected are derived
from the route — never held in local refs or the store.

| Route name | View rendered |
|---|---|
| `contacts` | `ContactList` |
| `contacts-add` | `ContactForm` (empty) |
| `contacts-view` | `ContactDisplay` |
| `contacts-edit` | `ContactForm` (pre-filled) |

**Display branch:** When showing a detail view, three explicit states are
required — loading (data in-flight), not-found (id not in store after load),
populated (contact found). A catch-all `v-else` is not acceptable.

**On submit:** Await the store action. Navigate to the list only if
`store.error` is null after completion.

**Test required:** Vitest unit test using `shallowMount` + memory router +
mocked store wrapper.

---

## Store

Four files following the domain store pattern:

| File | Purpose |
|---|---|
| `types.ts` | `ContactsState`, `initialContactsState`; re-exports `Contact` / `ContactFormValues` |
| `contactReducers.ts` | Pure reducers: `setLoading`, `setError`, `setContacts`, `addContact`, `updateContact`, `removeContact` |
| `contactLocalStorageService.ts` | localStorage implementation — active when `VITE_USE_LOCAL_STORAGE` is set |
| `contactApiService.ts` | HTTP fetch implementation — active by default |
| `contactService.ts` | Env-based selector — re-exports one of the two implementations |
| `useContactsStore.ts` | Public API: readonly state + named actions |

**State shape:**
```ts
interface ContactsState {
  contacts: Contact[]
  loading: boolean
  error: string | null
}
```

Navigation state (`selectedId`, view mode) is never in the store — it lives in
the router.

**Date handling:** Date fields are ISO strings throughout the store and services.
Conversion between `Date | null` and `string | null` happens only at the form
boundary (see `ContactForm` above).

**Tests required:**
- `contactReducers.test.ts` — pure function tests, no setup needed
- `useContactsStore.test.ts` — mocked service

---

## Routing

| Path | Route name | View |
|---|---|---|
| `/contacts` | `contacts` | List |
| `/contacts/add` | `contacts-add` | Add form |
| `/contacts/view/:id` | `contacts-view` | Detail |
| `/contacts/edit/:id` | `contacts-edit` | Edit form |

Root `/` redirects to `/contacts`. All four routes use the same page component.
URLs are shareable — deep-linking to `/contacts/view/:id` must work.

---

## shadcn primitives required

```
button  badge  avatar  card  input  label  select
table  dropdown-menu  popover  calendar  command  separator
```

Check `src/components/ui/` before installing — primitives may already be present.

---

## Skills

| Layer | Skill |
|---|---|
| Blocks | `vue-block` |
| Module dumb components + stories | `vue-module-dumb` |
| Container + test | `vue-smart-container` |
| Store | `vue-store` |
| Additional stories | `vue-story` |

---

## Build notes

> Append-only. Original spec text is never modified — approved deviations are
> recorded here. Write in past tense. Explain why so future readers can judge
> whether the workaround is still valid.
