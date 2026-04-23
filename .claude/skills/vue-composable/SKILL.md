---
name: vue-composable
# prettier-ignore
description: Generate a Vue 3 orchestration or effects composable + test. Use when coordinating two stores, adding page lifecycle logic, or when a container is getting complex.
---

# Vue Composable Skill

Generates a composable in either `src/composables/orchestration/`
or `src/composables/effects/` with its test in `tests/src/composables/`.

---

## Required output

Every composable MUST generate both files. Do not consider
the task complete until both exist:

1. `src/composables/[type]/use[Name].ts` — the composable
2. `tests/src/composables/[type]/use[Name].test.ts` — the test

> Composables have logic — they always need tests.
> They never have stories.

---

## Choosing the right type

### Orchestration composable
Use when the feature needs to:
- Coordinate actions across two or more stores
- Produce derived state that spans multiple domains
- Run a multi-step workflow (fetch → transform → save)
- Encapsulate business logic too complex for a container

**Lives in:** `src/composables/orchestration/`
**Example:** `useContactMerge.ts`, `useContactImport.ts`

### Effects composable
Use when the feature needs to:
- Fetch data on mount and reset on unmount
- React to route param changes
- Manage page-level UI state (active tab, scroll position)
- Handle keyboard shortcuts or global event listeners

**Lives in:** `src/composables/effects/`
**Example:** `useContactsPageService.ts`, `useContactDetailPageService.ts`

---

## Orchestration composable template

```ts
// composables/orchestration/useContactMerge.ts
import { computed, ref } from 'vue'
import { useContactsStore } from '@/stores/contacts/useContactsStore'
import { useOrganisationsStore } from '@/stores/organisations/useOrganisationsStore'

export function useContactMerge() {
  const contacts = useContactsStore()
  const organisations = useOrganisationsStore()

  // ── Derived cross-domain state ─────────────────────────
  const enrichedContact = computed(() => {
    const contact = contacts.activeContact.value
    if (!contact) return null
    const org = organisations.findById(contact.organisationId)
    return { ...contact, organisation: org ?? null }
  })

  // ── Multi-step workflow ────────────────────────────────
  const isMerging = ref(false)
  const mergeError = ref<Error | null>(null)

  async function mergeContact(sourceId: string, targetId: string) {
    isMerging.value = true
    mergeError.value = null
    try {
      await contacts.fetchContact(sourceId)
      await contacts.fetchContact(targetId)
      await contacts.saveContact({
        ...contacts.activeContact.value!,
        mergedFromId: sourceId,
      })
      organisations.invalidateContact(sourceId)
    } catch (err) {
      mergeError.value = err as Error
    } finally {
      isMerging.value = false
    }
  }

  return {
    enrichedContact,
    isMerging: readonly(isMerging),
    mergeError: readonly(mergeError),
    mergeContact,
  }
}
```

---

## Effects composable template

```ts
// composables/effects/useContactsPageService.ts
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useContactsStore } from '@/stores/contacts/useContactsStore'

export function useContactsPageService() {
  const route = useRoute()
  const contacts = useContactsStore()

  // ── Page loading state ─────────────────────────────────
  const isPageLoading = computed(() =>
    contacts.isFetchingContacts.value
  )

  // ── Lifecycle ──────────────────────────────────────────
  onMounted(async () => {
    await contacts.fetchContacts()
  })

  onUnmounted(() => {
    contacts.setActiveContact(null)
  })

  // ── React to route changes ─────────────────────────────
  watch(
    () => route.params.id as string,
    async (id) => {
      if (id) await contacts.fetchContact(id)
    },
    { immediate: true }
  )

  return {
    isPageLoading,
  }
}
```

---

## Using composables in a container

```vue
<!-- Simple — no composable needed -->
<script setup lang="ts">
import { useContactsStore } from '@/stores/contacts/useContactsStore'
const contacts = useContactsStore()
</script>

<!-- Complex orchestration — delegate to composable -->
<script setup lang="ts">
import { useContactMerge } from '@/composables/orchestration/useContactMerge'
const { enrichedContact, isMerging, mergeContact } = useContactMerge()
</script>

<!-- Page lifecycle — effects composable handles mount/unmount -->
<script setup lang="ts">
import { useContactsStore } from '@/stores/contacts/useContactsStore'
import { useContactsPageService } from '@/composables/effects/useContactsPageService'

const contacts = useContactsStore()
const { isPageLoading } = useContactsPageService()
</script>
```

---

## Orchestration test template

Mock store wrappers — never the underlying Pinia store.

```ts
// tests/src/composables/orchestration/useContactMerge.test.ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useContactMerge } from '@/composables/orchestration/useContactMerge'

vi.mock('@/stores/contacts/useContactsStore', () => ({
  useContactsStore: vi.fn(() => ({
    activeContact: { value: { id: '1', name: 'Jane', organisationId: 'org-1' } },
    isFetchingContact: { value: false },
    fetchContact: vi.fn(),
    saveContact: vi.fn(),
  })),
}))

vi.mock('@/stores/organisations/useOrganisationsStore', () => ({
  useOrganisationsStore: vi.fn(() => ({
    findById: vi.fn(() => ({ id: 'org-1', name: 'Acme' })),
    invalidateContact: vi.fn(),
  })),
}))

describe('useContactMerge', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('enriches contact with organisation', () => {
    const { enrichedContact } = useContactMerge()
    expect(enrichedContact.value?.organisation?.name).toBe('Acme')
  })

  it('sets isMerging during merge', async () => {
    const { useContactsStore } = await import('@/stores/contacts/useContactsStore')
    const store = useContactsStore()
    let resolve: (v: unknown) => void
    vi.mocked(store.fetchContact).mockReturnValue(
      new Promise(r => { resolve = r })
    )
    const { isMerging, mergeContact } = useContactMerge()
    const promise = mergeContact('1', '2')
    expect(isMerging.value).toBe(true)
    resolve!(undefined)
    await promise
    expect(isMerging.value).toBe(false)
  })
})
```

---

## Effects test template

```ts
// tests/src/composables/effects/useContactsPageService.test.ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useContactsPageService } from '@/composables/effects/useContactsPageService'

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: {} })),
}))

vi.mock('@/stores/contacts/useContactsStore', () => ({
  useContactsStore: vi.fn(() => ({
    isFetchingContacts: { value: false },
    fetchContacts: vi.fn(),
    setActiveContact: vi.fn(),
  })),
}))

describe('useContactsPageService', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('fetches contacts on mount', async () => {
    const { useContactsStore } = await import('@/stores/contacts/useContactsStore')
    const store = useContactsStore()
    useContactsPageService()
    expect(store.fetchContacts).toHaveBeenCalled()
  })
})
```

---

## File structure output

```
src/composables/
├── orchestration/
│   └── use[Name].ts
└── effects/
    └── use[Name].ts

tests/src/composables/
├── orchestration/
│   └── use[Name].test.ts
└── effects/
    └── use[Name].test.ts
```
