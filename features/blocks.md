# Shared Blocks

This document catalogs every block in the application.

Build blocks and stories from this spec. If a technical constraint prevents
following the spec exactly, stop and ask before proceeding. Approved deviations
are recorded in the **Build notes** section at the bottom — the spec text itself
is never modified to match an implementation.

## Dependencies

None. Blocks are domain-agnostic and have no dependencies on other features.
They must be built before any feature that uses them.

---

**Check here before building a new block.** If a block already exists, use it.
Duplicate blocks create visual inconsistency and split maintenance across two
components that should be one.

Blocks are dumb, reusable, and domain-agnostic. They never import from stores.
Each block must have a Storybook story covering all required states. Blocks have
no test files — stories are their quality mechanism.

---

## `ContactAvatar`

Displays a circular avatar for a contact. Falls back to initials when no image is provided.

**Props**

| Prop | Type | Required | Default |
|---|---|---|---|
| `firstName` | `string` | ✅ | — |
| `lastName` | `string` | ✅ | — |
| `src` | `string` | — | — |
| `size` | `'sm' \| 'md' \| 'lg'` | — | `'md'` |

**Emits:** none

**Used by:** `ContactList`, `ContactDisplay`, `ContactForm`

**Story states:** Default (initials), WithImage, Small, Large

---

## `ContactPicker`

Filterable typeahead for selecting one or more contacts. Filtering happens in
the UI — the component receives the full eligible contact list via props. The
container is responsible for passing only the appropriate subset (e.g. only
`individual` contacts for the attorney slot).

**Props**

| Prop | Type | Required | Default |
|---|---|---|---|
| `contacts` | `Contact[]` | ✅ | — |
| `modelValue` | `string \| string[] \| null` | ✅ | — |
| `contactType` | `'client' \| 'attorney' \| 'party'` | ✅ | — |
| `multiple` | `boolean` | — | `false` |
| `placeholder` | `string` | — | derived from `contactType` |
| `disabled` | `boolean` | — | `false` |

**Emits**

| Event | Args | When |
|---|---|---|
| `update:modelValue` | `value: string \| string[] \| null` | Selection changes |

**Placeholder defaults:** `"Search clients"` / `"Search attorneys"` / `"Search parties"`

**Used by:** `MatterForm`

**Story states:** Default, Open, Selected, Attorney, MultiSelected, Disabled

---

## `DatePicker`

Calendar popover for selecting a single date. Wraps shadcn `Popover` + `Calendar`.

**Props**

| Prop | Type | Required | Default |
|---|---|---|---|
| `modelValue` | `Date \| null` | — | — |
| `placeholder` | `string` | — | `'Pick a date'` |
| `disabled` | `boolean` | — | `false` |

**Emits**

| Event | Args | When |
|---|---|---|
| `update:modelValue` | `value: Date \| null` | Date selected or cleared |

**Used by:** `MatterForm`

**Story states:** Default, WithValue, Disabled, Open (uses play function)

---

## `FormField`

Label + text input + error message. Manages `touched` state internally —
blur validation happens without parent involvement. The external `error` prop
bypasses blur gating and shows immediately, used for submit-time validation.

**Props**

| Prop | Type | Required | Default |
|---|---|---|---|
| `id` | `string` | ✅ | — |
| `label` | `string` | ✅ | — |
| `type` | `string` | — | `'text'` |
| `placeholder` | `string` | — | — |
| `modelValue` | `string` | — | — |
| `required` | `boolean` | — | `false` |
| `error` | `string` | — | — |
| `disabled` | `boolean` | — | `false` |

**Emits**

| Event | Args | When |
|---|---|---|
| `update:modelValue` | `value: string` | Input changes |

**Validation behaviour:**
- `required` shows a black `*` asterisk before any interaction
- On blur: if empty and required, shows `'This field is required'` (internal)
- External `error` prop always shows immediately — parent sets this on submit

**Used by:** `ContactForm`, `MatterForm`

**Story states:** Default, Required, RequiredFilled, RequiredExternalError, Disabled, BlurValidation

---

## `RowActions`

A three-dot vertical menu for table rows. Emits `edit` and `delete` carrying
the row's entity id. Use `@click.stop` in the parent table row to prevent
row selection when the menu is opened.

**Props**

| Prop | Type | Required | Default |
|---|---|---|---|
| `id` | `string` | ✅ | — |
| `defaultOpen` | `boolean` | — | `false` |

**Emits**

| Event | Args | When |
|---|---|---|
| `edit` | `id: string` | Edit item selected |
| `delete` | `id: string` | Delete item selected |

**Notes:**
- `id` is passed straight through — the value emitted is the entity id provided by the parent (e.g. `contact.id`, `matter.id`), not a row index
- `defaultOpen` is a story helper — use it only in Storybook to show the open state without a play function (Reka UI's `DropdownMenu` uses pointer events that don't respond to `userEvent.click`)
- The Tooltip wrapper was deliberately removed — nested `as-child` (TooltipTrigger → DropdownMenuTrigger → Button) broke the dropdown's pointer event handling in Reka UI

**Used by:** `ContactList`, `MatterList`

**Story states:** Default, Open (uses `defaultOpen: true`)

---

## `StatusBadge`

Coloured badge for contact and matter status values.

**Props**

| Prop | Type | Required |
|---|---|---|
| `status` | `'active' \| 'inactive' \| 'lead' \| 'open' \| 'pending' \| 'closed'` | ✅ |

**Emits:** none

**Variant mapping**

| Status | Variant |
|---|---|
| `active`, `open` | `default` (primary) |
| `lead`, `pending` | `secondary` |
| `inactive`, `closed` | `outline` |

**Used by:** `ContactList`, `ContactDisplay`, `MatterList`, `MatterDisplay`

**Story states:** Active, Lead, Inactive, Open, Pending, Closed

---

## `DataSourceBadge`

A developer warning indicator shown when the app is running against localStorage
instead of the live API. Never present in production builds.

**Props:** none

**Emits:** none

**Appearance:** Short label reading "Using local storage" in destructive red.
Should be immediately noticeable without interrupting main content.

**Constraints:**
- No props and no variants — if visible, it always means the same thing
- The decision to render it belongs to the caller (`App.vue`), not the block
- Never repurpose for a deployed demo/offline mode — that is a separate feature

**Story states required:**
- Default — badge rendered as it appears in the app

---

## `DesignTokens` (internal)

Visual reference for all CSS design tokens — colors, typography, spacing.
Not a reusable component. Used only in Storybook to preview the token palette.

**Story states required:**
- Light mode — full token palette
- Dark mode — same palette, confirming tokens hold up visually

Both modes are required so token choices can be validated before dark mode is
implemented as a feature. This is not an implementation of dark mode — it is a
design quality check on the token system.

---

## Adding a new block

1. Check this document first — the block may already exist
2. Use the `vue-block` skill to generate the component and story
3. Wire all emits with `fn()` from `storybook/test` in the meta `args` block
4. Add it to this document when done
5. If the block is extracted from an existing component (like `RowActions` was),
   update all consumers to use the new block

---

## Build notes

> Append-only. Original spec text is never modified — approved deviations are
> recorded here. Write in past tense. Explain why so future readers can judge
> whether the workaround is still valid.

**2026-04-06 — RowActions open state story**
The spec calls for an `Open` story showing the dropdown in its open state.
Reka UI's `DropdownMenu` uses pointer events that don't respond to
`userEvent.click` in Storybook play functions. `defaultOpen: true` prop is used
instead — this is a Reka UI constraint, not a component design choice.
