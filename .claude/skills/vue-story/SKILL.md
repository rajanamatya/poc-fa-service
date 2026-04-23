---
name: vue-story
# prettier-ignore
description: Generate a Storybook story for any Vue 3 component. Use when adding a story, writing stories for a component, adding Storybook coverage, or documenting a component.
---

# Vue Story Skill

Generates a `.stories.ts` file for any Vue 3 component.
Always infers the correct title path from the component location:
- `ui/` → `title: 'UI/ComponentName'`
- `blocks/` → `title: 'Blocks/ComponentName'`
- `modules/` → `title: 'Modules/ModuleName/ComponentName'`
- `layouts/` → `title: 'Layouts/ComponentName'`

---

## Rules

- Always use `Meta<typeof Component>` for full type safety
- Always include a `Default` story
- Add variant stories for every meaningful prop combination
- Use `argTypes` for interactive controls in Storybook UI
- Use `render` function for components needing slots
- Never import from stores
- Wrap in a padded container for visual breathing room
- Always wire every component emit with `fn()` from `storybook/test` in the meta `args` block — never leave emits unwired

---

## Base story template

```ts
// [Component].stories.ts
import type { Meta, StoryObj } from '@storybook/vue3'
import { fn } from 'storybook/test'
import ComponentName from './ComponentName.vue'

const meta: Meta<typeof ComponentName> = {
  title: 'Blocks/ComponentName',
  component: ComponentName,
  decorators: [
    () => ({
      template: '<div class="p-6"><story /></div>',
    }),
  ],
  args: {
    // Wire every emit — use the on+PascalCase form of the event name.
    onSomeEvent: fn(),
  },
  argTypes: {
    // map props to controls
    label: { control: 'text' },
    disabled: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['default', 'outline', 'destructive'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Example Label',
  },
}
```

---

## Variant stories

Always add stories for key states:

```ts
// Disabled state
export const Disabled: Story = {
  args: {
    label: 'Disabled Field',
    disabled: true,
  },
}

// Error state
export const WithError: Story = {
  args: {
    label: 'Email',
    error: 'Email is required',
  },
}

// Loading state
export const Loading: Story = {
  args: {
    label: 'Submit',
    loading: true,
  },
}
```

---

## Wiring actions

Import `fn` from `storybook/test` and add every emit to the meta `args` block.
Actions defined at meta level are inherited by all stories automatically.

**Event name mapping:**
- Regular emits: `emit('select', id)` → `onSelect: fn()`
- Kebab-case emits: `emit('create-contact')` → `'onCreate-contact': fn()` (on + original name, quoted)

**List/display components** — wire all interaction events, always carry the entity id:

```ts
import type { Meta, StoryObj } from '@storybook/vue3'
import { fn } from 'storybook/test'
import ContactList from '@/components/modules/contacts/ContactList/ContactList.vue'

const meta: Meta<typeof ContactList> = {
  title: 'Modules/Contacts/ContactList',
  component: ContactList,
  args: {
    onSelect: fn(),   // emit('select', id)
    onEdit: fn(),     // emit('edit', id)
    onDelete: fn(),   // emit('delete', id)
    onAdd: fn(),      // emit('add')
  },
}
```

**Form components** — pass `initialValues` to seed the populated state story. Wire `onSubmit` and `onCancel`.
The form copies `initialValues` into local state on setup; `onSubmit` receives the user's edited values as a spread (`{ ...values }`), never the original prop (Decision 19):

```ts
import type { Meta, StoryObj } from '@storybook/vue3'
import { fn } from 'storybook/test'
import ContactForm from '@/components/modules/contacts/ContactForm/ContactForm.vue'

const meta: Meta<typeof ContactForm> = {
  title: 'Modules/Contacts/ContactForm',
  component: ContactForm,
  args: {
    onSubmit: fn(),   // emit('submit', { ...values }) — current edited state, not initialValues
    onCancel: fn(),   // emit('cancel')
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {},
}

export const Populated: Story = {
  args: {
    initialValues: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      status: 'active',
    },
  },
}
```

---

## Slot-based components

Use `render` when the component relies on slots:

```ts
export const WithSlot: Story = {
  render: (args) => ({
    components: { ComponentName },
    setup() { return { args } },
    template: `
      <ComponentName v-bind="args">
        <p>Slot content goes here</p>
      </ComponentName>
    `,
  }),
  args: {
    label: 'With Slot',
  },
}
```

---

## Card-based module components

For display/edit components inside modules:

```ts
import type { Meta, StoryObj } from '@storybook/vue3'
import { fn } from 'storybook/test'
import UserDisplay from './UserDisplay.vue'

const meta: Meta<typeof UserDisplay> = {
  title: 'Modules/UserCard/UserDisplay',
  component: UserDisplay,
  decorators: [
    () => ({
      template: '<div class="p-6 max-w-md"><story /></div>',
    }),
  ],
  args: {
    onEdit: fn(),    // always carry the entity id: emit('edit', user.id)
    onDelete: fn(),  // always carry the entity id: emit('delete', user.id)
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    user: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'Admin',
    },
  },
}
```

---

## Layout stories

For layouts use named slot placeholders:

```ts
import type { Meta, StoryObj } from '@storybook/vue3'
import SettingsLayout from './SettingsLayout.vue'

const meta: Meta = {
  title: 'Layouts/SettingsLayout',
  component: SettingsLayout,
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { SettingsLayout },
    template: `
      <SettingsLayout>
        <template #header>
          <div class="font-medium text-sm">App Header</div>
        </template>
        <template #sidebar>
          <nav class="text-sm text-muted-foreground">
            Sidebar Nav
          </nav>
        </template>
        <div class="text-sm">Main content area</div>
      </SettingsLayout>
    `,
  }),
}
```

---

## Story checklist

For every component always cover:

| State        | Required |
|--------------|----------|
| Default      | ✅ Always |
| Disabled     | ✅ If prop exists |
| Error        | ✅ If prop exists |
| Loading      | ✅ If prop exists |
| Empty        | ✅ If shows data |
| With slots   | ✅ If has slots |
| Actions wired | ✅ Always — `fn()` for every emit in meta args |
| Dark mode    | Optional |

---

## File structure output

```
stories/[layer]/[Name]/
└── [Name].stories.ts
```
