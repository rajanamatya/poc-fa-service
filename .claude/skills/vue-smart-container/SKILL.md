---
name: vue-smart-container
# prettier-ignore
description: Generate a smart Vue 3 container component + Vitest test. Use when creating a container, connecting a module to a store, or wiring up state to a module.
---

# Vue Smart Container Skill

Generates a `[Feature]Container.vue` in `src/components/modules/[Name]/`
and its test in `tests/components/modules/[Name]/`.

---

## Required output

Every container MUST generate both files. Do not consider
the task complete until both exist:

1. `[Feature]Container.vue` — the smart component
2. `tests/src/components/modules/[Name]/[Feature]Container.test.ts`

> Containers have logic and store interaction — they always
> need tests. They never have stories.

---

## Rules

- Named `[Feature]Container.vue`
- Only file in the module that imports store wrappers
- Never imports raw Pinia stores directly — always the wrapper
- Passes readonly data down as props
- Handles all emits from dumb children
- Composes loading flags before passing to children
- For complex workflows — use an orchestration composable
- For page lifecycle — use an effects composable
- No template logic beyond v-if for view/edit toggle

---

## When to use a composable instead

Use an **orchestration composable** when the container needs to:
- Coordinate actions across two or more stores
- Produce derived state from multiple domains
- Run a multi-step workflow (e.g. fetch then merge then save)

Use an **effects composable** when the container needs to:
- Trigger fetches on mount
- Reset state on unmount
- React to route param changes

If either applies, generate the composable alongside the container
and reference it. See `vue-composable` skill for composable generation.

```vue
<!-- Simple case — container handles it directly -->
<script setup lang="ts">
import { useContactsStore } from '@/stores/contacts/useContactsStore'

const contacts = useContactsStore()
</script>

<!-- Complex case — delegate to composable -->
<script setup lang="ts">
import { useContactMerge } from '@/composables/orchestration/useContactMerge'

const { mergedContact, isMerging, merge } = useContactMerge()
</script>
```

---

## Container template

```vue
<!-- modules/ContactCard/ContactCardContainer.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useContactsStore } from '@/stores/contacts/useContactsStore'
import ContactDisplay from './ContactDisplay.vue'
import ContactEditForm from './ContactEditForm.vue'

const contacts = useContactsStore()
const isEditing = ref(false)

// Compose loading flags before passing down
const isLoading = computed(() =>
  contacts.isFetchingContact.value ||
  contacts.isSavingContact.value
)

async function handleSubmit(values: ContactFormValues) {
  await contacts.saveContact(values)
  if (!contacts.saveContactError.value) {
    isEditing.value = false
  }
}
</script>

<template>
  <ContactDisplay
    v-if="!isEditing"
    :contact="contacts.activeContact.value"
    :loading="contacts.isFetchingContact.value"
    @edit="isEditing = true"
  />
  <ContactEditForm
    v-else
    :initial-values="contacts.activeContact.value"
    :loading="isLoading"
    :error="contacts.saveContactError.value"
    @submit="handleSubmit"
    @cancel="isEditing = false"
  />
</template>
```

---

## Test template

```ts
// tests/src/components/modules/ContactCard/ContactCardContainer.test.ts
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContactCardContainer from '@/components/modules/ContactCard/ContactCardContainer.vue'

// Mock the store wrapper — never test through raw Pinia
vi.mock('@/stores/contacts/useContactsStore', () => ({
  useContactsStore: vi.fn(() => ({
    activeContact: { value: { name: 'Jane Smith', email: 'jane@example.com' } },
    isFetchingContact: { value: false },
    isSavingContact: { value: false },
    saveContactError: { value: null },
    saveContact: vi.fn(),
  })),
}))

describe('ContactCardContainer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders ContactDisplay by default', () => {
    const wrapper = mount(ContactCardContainer)
    expect(wrapper.findComponent({ name: 'ContactDisplay' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ContactEditForm' }).exists()).toBe(false)
  })

  it('switches to ContactEditForm on edit emit', async () => {
    const wrapper = mount(ContactCardContainer)
    await wrapper.findComponent({ name: 'ContactDisplay' }).vm.$emit('edit')
    expect(wrapper.findComponent({ name: 'ContactEditForm' }).exists()).toBe(true)
  })

  it('returns to ContactDisplay on cancel emit', async () => {
    const wrapper = mount(ContactCardContainer)
    await wrapper.findComponent({ name: 'ContactDisplay' }).vm.$emit('edit')
    await wrapper.findComponent({ name: 'ContactEditForm' }).vm.$emit('cancel')
    expect(wrapper.findComponent({ name: 'ContactDisplay' }).exists()).toBe(true)
  })

  it('calls saveContact on submit emit', async () => {
    const { useContactsStore } = await import('@/stores/contacts/useContactsStore')
    const store = useContactsStore()
    const wrapper = mount(ContactCardContainer)
    await wrapper.findComponent({ name: 'ContactDisplay' }).vm.$emit('edit')
    await wrapper.findComponent({ name: 'ContactEditForm' }).vm.$emit('submit', { name: 'Jane' })
    expect(store.saveContact).toHaveBeenCalledWith({ name: 'Jane' })
  })
})
```

---

## File structure output

```
src/components/modules/[Name]/
└── [Feature]Container.vue

tests/src/components/modules/[Name]/
└── [Feature]Container.test.ts
```
