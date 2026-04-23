# App Layout Feature

This document describes the design intent for the application shell.
Build components and stories from this spec. If a technical constraint prevents
following the spec exactly, stop and ask before proceeding. Approved deviations
are recorded in the **Build notes** section at the bottom — the spec text itself
is never modified to match an implementation.

---

## Dependencies

| Dependency | Why |
|---|---|
| Blocks (`docs/features/blocks.md`) | `DataSourceBadge` is a block used in the footer slot |
| Contacts (`docs/features/contacts.md`) | `AppNav` must link to the contacts section; the contacts route must exist |
| Matters (`docs/features/matters.md`) | `AppNav` must link to the matters section; the matters route must exist |

The layout shell (`AppLayout`, `AppNav`) can be scaffolded early, but the nav
cannot be fully wired until both domain routes exist. Build blocks and at least
one domain first.

---

## Overview

Every page in the application shares a common shell: a persistent top navigation
bar and a main content area. The shell is built as a slot-based layout with no
logic of its own. Application-level concerns (routing, active section, data
source) are owned by the root app component, not the layout.

---

## Layout regions

The layout defines three regions:

| Region | Purpose | Notes |
|---|---|---|
| Top navigation | Persistent nav bar, full width | Always visible |
| Main content | Page-level content | Fills remaining height |
| Bottom-right chrome | Pinned, low-profile indicators | Optional — may be empty |

---

## Navigation bar

The navigation bar is a reusable block. It has no knowledge of the router.

**Props:**
- `activeSection: 'contacts' | 'matters'` — which section is currently selected

**Emits:**
- `navigate(section: 'contacts' | 'matters')` — user requested a section change; the caller handles routing

**Story states required:**
- Contacts tab active
- Matters tab active

---

## Bottom-right chrome — local storage warning

When the app is running against localStorage instead of the live API, a
prominent warning indicator must be visible in the bottom-right corner of every
page. This is a developer signal, not a product feature.

**Appearance:** Short label reading "Using local storage" in a destructive red
colour. Should be immediately noticeable without interrupting the main content.

**When it appears:** Only when `VITE_USE_LOCAL_STORAGE` is set in the
environment. Never present in production or CI builds. The layout shell renders
the region empty when the flag is not set — no placeholder, no empty space.

**Design constraints:**
- The warning block has no props and no variants — if it is visible, it always
  means the same thing
- The root app component decides whether to render it based on the env flag; the
  block itself has no knowledge of the flag
- A deployed localStorage mode (e.g. demo, offline) is a separate feature with
  its own design — this indicator must not be repurposed for that

**Story states required:**
- The warning block rendered in isolation
- The warning block shown in context within the full app shell

---

## Data source switching

The data source is controlled by a build-time environment variable:

| Condition | Data source | Warning shown |
|---|---|---|
| `VITE_USE_LOCAL_STORAGE` set | localStorage | Yes |
| `VITE_USE_LOCAL_STORAGE` unset | AWS API | No |

This cannot be toggled at runtime. The root app component reads the flag once
at startup and uses it to decide which services are active and whether to render
the warning indicator.

---

## Build notes

> Append-only. Original spec text is never modified — approved deviations are
> recorded here. Write in past tense. Explain why so future readers can judge
> whether the workaround is still valid.
