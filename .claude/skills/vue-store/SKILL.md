---
name: vue-store
# prettier-ignore
description: Generate a complete Pinia domain store with wrapper, reducers, service, types, and tests. Use when creating a store, adding a domain, or scaffolding state management.
---

# Vue Store Skill

Generates a complete domain store in `src/stores/[domain]/`
with its full test suite in `tests/src/stores/[domain]/`.

---

## Required output

Every domain MUST generate all files. Do not consider the
task complete until all of the following exist:

**Store source:**
1. `src/stores/[domain]/use[Domain]Store.ts` — public wrapper API
2. `src/stores/[domain]/[domain]Reducers.ts` — pure state transforms
3. `src/stores/[domain]/[domain]Service.ts` — API calls, internal only
4. `src/stores/[domain]/types.ts` — domain types

**Store tests:**
5. `tests/src/stores/[domain]/use[Domain]Store.test.ts`
6. `tests/src/stores/[domain]/[domain]Reducers.test.ts`
7. `tests/src/stores/[domain]/[domain]Service.test.ts`

**Lambda:**
8. `functions/[domain]/handler.ts` — Lambda handler for this domain

**CDK:**
9. `cdk/lib/api-stack.ts` — updated to add the domain's Lambda function and API routes

---

## Rules

- One folder per domain
- The wrapper is the ONLY public API — never expose the service
- State exposed as `computed()` or `readonly()` — never mutable
- Reducers are pure functions — no side effects, no API calls
- Services are internal — never returned from the wrapper
- No cross-domain imports in stores — use orchestration composables
- Use `reducerPipeline` from `@/utils/reducerPipeline` for chaining
- All async actions follow the consistent loading/error pattern

---

## types.ts

```ts
// stores/contacts/types.ts
export interface Contact {
  id: string
  name: string
  email: string
  phone?: string
}

export interface ContactsState {
  contacts: Contact[]
  activeContactId: string | null
}

export const initialContactsState: ContactsState = {
  contacts: [],
  activeContactId: null,
}
```

---

## [domain]Reducers.ts

Pure functions only. No side effects. No API calls.

```ts
// stores/contacts/contactsReducers.ts
import type { ContactsState, Contact } from './types'

export function setContactsReducer(
  state: ContactsState,
  contacts: Contact[]
): ContactsState {
  return { ...state, contacts }
}

export function setActiveContactReducer(
  state: ContactsState,
  id: string | null
): ContactsState {
  return { ...state, activeContactId: id }
}

export function upsertContactReducer(
  state: ContactsState,
  contact: Contact
): ContactsState {
  const exists = state.contacts.some(c => c.id === contact.id)
  const contacts = exists
    ? state.contacts.map(c => c.id === contact.id ? contact : c)
    : [...state.contacts, contact]
  return { ...state, contacts }
}
```

---

## [domain]Service.ts

External calls only. Internal to the wrapper — never exported
from the store index or exposed to components.

```ts
// stores/contacts/contactsService.ts
import type { Contact } from './types'

export const contactsService = {
  async fetchAll(): Promise<Contact[]> {
    const res = await fetch('/api/contacts')
    if (!res.ok) throw new Error('Failed to fetch contacts')
    return res.json()
  },

  async save(contact: Contact): Promise<Contact> {
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    })
    if (!res.ok) throw new Error('Failed to save contact')
    return res.json()
  },
}
```

---

## use[Domain]Store.ts

The public API. Exposes readonly state and named actions.
Every async action follows the loading/error pattern.

```ts
// stores/contacts/useContactsStore.ts
import { ref, computed, readonly } from 'vue'
import { defineStore } from 'pinia'
import { reducerPipeline } from '@/utils/reducerPipeline'
import { contactsService } from './contactsService'
import {
  setContactsReducer,
  setActiveContactReducer,
  upsertContactReducer,
} from './contactsReducers'
import { initialContactsState } from './types'
import type { Contact } from './types'

const usePiniaContactsStore = defineStore('contacts', {
  state: () => ({ ...initialContactsState }),
})

export function useContactsStore() {
  const store = usePiniaContactsStore()

  // ── Readonly state ─────────────────────────────────────
  const contacts = computed(() => store.contacts)
  const activeContact = computed(() =>
    store.contacts.find(c => c.id === store.activeContactId) ?? null
  )

  // ── Async: fetch all ───────────────────────────────────
  const isFetchingContacts = ref(false)
  const fetchContactsError = ref<Error | null>(null)

  async function fetchContacts(): Promise<void> {
    isFetchingContacts.value = true
    fetchContactsError.value = null
    try {
      const raw = await contactsService.fetchAll()
      store.$patch(reducerPipeline(setContactsReducer)(store.$state, raw))
    } catch (err) {
      fetchContactsError.value = err as Error
    } finally {
      isFetchingContacts.value = false
    }
  }

  // ── Async: save ────────────────────────────────────────
  const isSavingContact = ref(false)
  const saveContactError = ref<Error | null>(null)

  async function saveContact(contact: Contact): Promise<void> {
    isSavingContact.value = true
    saveContactError.value = null
    try {
      const saved = await contactsService.save(contact)
      store.$patch(reducerPipeline(upsertContactReducer)(store.$state, saved))
    } catch (err) {
      saveContactError.value = err as Error
    } finally {
      isSavingContact.value = false
    }
  }

  // ── Sync: set active ───────────────────────────────────
  function setActiveContact(id: string | null): void {
    store.$patch(reducerPipeline(setActiveContactReducer)(store.$state, id))
  }

  return {
    // State (readonly)
    contacts,
    activeContact,

    // Fetch actions
    isFetchingContacts: readonly(isFetchingContacts),
    fetchContactsError: readonly(fetchContactsError),
    fetchContacts,

    // Save actions
    isSavingContact: readonly(isSavingContact),
    saveContactError: readonly(saveContactError),
    saveContact,

    // Sync actions
    setActiveContact,
  }
}
```

---

## Reducer tests

Highest value tests — pure functions, no mocks needed.

```ts
// tests/stores/contacts/contactsReducers.test.ts
import { describe, expect, it } from 'vitest'
import {
  setContactsReducer,
  upsertContactReducer,
} from '@/stores/contacts/contactsReducers'
import { initialContactsState } from '@/stores/contacts/types'

describe('setContactsReducer', () => {
  it('sets contacts on state', () => {
    const contacts = [{ id: '1', name: 'Jane', email: 'jane@example.com' }]
    const result = setContactsReducer(initialContactsState, contacts)
    expect(result.contacts).toEqual(contacts)
  })

  it('does not mutate original state', () => {
    const state = { ...initialContactsState }
    setContactsReducer(state, [])
    expect(state.contacts).toEqual([])
  })
})

describe('upsertContactReducer', () => {
  it('adds a new contact', () => {
    const contact = { id: '1', name: 'Jane', email: 'jane@example.com' }
    const result = upsertContactReducer(initialContactsState, contact)
    expect(result.contacts).toHaveLength(1)
  })

  it('updates an existing contact', () => {
    const contact = { id: '1', name: 'Jane', email: 'jane@example.com' }
    const state = { ...initialContactsState, contacts: [contact] }
    const updated = { ...contact, name: 'Jane Smith' }
    const result = upsertContactReducer(state, updated)
    expect(result.contacts[0].name).toBe('Jane Smith')
    expect(result.contacts).toHaveLength(1)
  })
})
```

---

## Service tests

Test against mocked HTTP — no Vue or Pinia involved.

```ts
// tests/stores/contacts/contactsService.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { contactsService } from '@/stores/contacts/contactsService'

describe('contactsService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('fetchAll returns contacts on success', async () => {
    const data = [{ id: '1', name: 'Jane', email: 'jane@example.com' }]
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => data,
    } as Response)

    const result = await contactsService.fetchAll()
    expect(result).toEqual(data)
  })

  it('fetchAll throws on failure', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
    await expect(contactsService.fetchAll()).rejects.toThrow()
  })
})
```

---

## Wrapper tests

Test loading flags, error states, and state patches.

```ts
// tests/stores/contacts/useContactsStore.test.ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useContactsStore } from '@/stores/contacts/useContactsStore'

vi.mock('@/stores/contacts/contactsService', () => ({
  contactsService: {
    fetchAll: vi.fn(),
    save: vi.fn(),
  },
}))

describe('useContactsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('sets isFetchingContacts during fetch', async () => {
    const { contactsService } = await import('@/stores/contacts/contactsService')
    let resolve: (v: unknown) => void
    vi.mocked(contactsService.fetchAll).mockReturnValue(
      new Promise(r => { resolve = r })
    )
    const store = useContactsStore()
    const promise = store.fetchContacts()
    expect(store.isFetchingContacts.value).toBe(true)
    resolve!([])
    await promise
    expect(store.isFetchingContacts.value).toBe(false)
  })

  it('populates fetchContactsError on failure', async () => {
    const { contactsService } = await import('@/stores/contacts/contactsService')
    vi.mocked(contactsService.fetchAll).mockRejectedValue(new Error('Network error'))
    const store = useContactsStore()
    await store.fetchContacts()
    expect(store.fetchContactsError.value?.message).toBe('Network error')
  })
})
```

---

## Lambda handler

One handler per domain. Mirrors the store's operations.
Import types from `@shared/types` — never from `src/`.

```ts
// functions/[domain]/handler.ts
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda'
import type { [Domain], ApiResponse } from '@shared/types'

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const method = event.httpMethod

    if (method === 'GET') {
      const items: [Domain][] = []
      const response: ApiResponse<[Domain][]> = { data: items }
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(response) }
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body ?? '{}') as [Domain]
      const response: ApiResponse<[Domain]> = { data: body }
      return { statusCode: 201, headers: corsHeaders(), body: JSON.stringify(response) }
    }

    if (method === 'PUT') {
      const body = JSON.parse(event.body ?? '{}') as [Domain]
      const response: ApiResponse<[Domain]> = { data: body }
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(response) }
    }

    return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ error: 'Not found' }) }
  } catch {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Internal server error' }) }
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  }
}
```

---

## CDK — add domain to api-stack

Add the new Lambda function and routes to `cdk/lib/api-stack.ts`.
Each domain gets its own `NodejsFunction` and resource block.

```ts
// cdk/lib/api-stack.ts — add imports at top
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as path from 'path'
```

Inside the `constructor`, after the `RestApi` definition:

```ts
// Add [domain] Lambda and routes
const [domain]Function = new nodejs.NodejsFunction(this, '[Domain]Function', {
  entry: path.join(__dirname, '../../functions/[domain]/handler.ts'),
  handler: 'handler',
  runtime: lambda.Runtime.NODEJS_20_X,
  bundling: {
    tsconfig: path.join(__dirname, '../../functions/tsconfig.json'),
  },
  environment: { STAGE: props.stageName },
})

const [domain]Resource = api.root.addResource('[domain]')
[domain]Resource.addMethod('GET', new apigateway.LambdaIntegration([domain]Function))
[domain]Resource.addMethod('POST', new apigateway.LambdaIntegration([domain]Function))
[domain]Resource.addResource('{id}').addMethod('PUT', new apigateway.LambdaIntegration([domain]Function))
```

---

## File structure output

```
src/stores/[domain]/
├── use[Domain]Store.ts
├── [domain]Reducers.ts
├── [domain]Service.ts
└── types.ts

tests/src/stores/[domain]/
├── use[Domain]Store.test.ts
├── [domain]Reducers.test.ts
└── [domain]Service.test.ts

functions/[domain]/
└── handler.ts

cdk/lib/
└── api-stack.ts  (updated)
```
