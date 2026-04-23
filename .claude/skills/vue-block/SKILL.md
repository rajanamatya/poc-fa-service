---
name: vue-block
# prettier-ignore
description: Generate a dumb Vue 3 block component + Storybook story. Use when creating a block, FormField, StatusBadge, or any reusable building block component.
---

# Vue Block Skill

Generates a dumb block component in `src/components/blocks/`.
Always creates both the component and its Storybook story.

---

## Required output

Every block MUST generate both files. Do not consider
the task complete until both exist:

1. `[Name].vue` — the component
2. `[Name].stories.ts` — the story

> Blocks are presentation only. They never have tests.
> Stories are the sole quality mechanism for this layer.

---

## Rules

- Lives in `src/components/blocks/[ComponentName]/`
- No store imports ever
- No internal state unless purely UI (e.g. tooltip open/close)
- Props typed with TypeScript interface
- Always emit events up, never handle logic internally
- Always pair with a `.stories.ts` file
- Use CSS variable tokens, never hardcoded colors
- Never add a `.test.ts` file — tests belong in containers

---

## Component template

```vue
<!-- blocks/[Name]/[Name].vue -->
<script setup lang="ts">
interface Props {
  // required prop example
  label: string
  // optional prop example
  error?: string
  disabled?: boolean
}

defineProps<Props>()

defineEmits<{
  // example emit
  change: [value: string]
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <!-- use CSS variable tokens -->
    <label class="text-sm font-medium text-foreground">
      {{ label }}
    </label>

    <!-- slot for composability -->
    <slot />

    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
```

---

## Story template

```ts
// stories/blocks/[Name]/[Name].stories.ts
import type { Meta, StoryObj } from '@storybook/vue3'
import ComponentName from './ComponentName.vue'

const meta: Meta<typeof ComponentName> = {
  title: 'Blocks/ComponentName',
  component: ComponentName,
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Field Label',
  },
}

export const WithError: Story = {
  args: {
    label: 'Field Label',
    error: 'This field is required',
  },
}

export const Disabled: Story = {
  args: {
    label: 'Field Label',
    disabled: true,
  },
}
```

### play functions (interactive states)

Use a `play` function to simulate user interaction for stories that need to
show an open/active state (e.g. a popover open, a dropdown expanded).

**Important:** In Storybook 10, import from `storybook/test` — NOT `@storybook/test`.
`@storybook/test` is a Storybook 8 package and will cause a peer dependency conflict.

```ts
import { userEvent, within } from 'storybook/test'

export const Open: Story = {
  args: { ... },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button'))
  },
}
```

---

## File structure output

```
src/components/blocks/[Name]/
└── [Name].vue

stories/blocks/[Name]/
└── [Name].stories.ts
```

---

## Example — FormField block

```vue
<!-- blocks/FormField/FormField.vue -->
<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  id: string
  label: string
  type?: string
  placeholder?: string
  error?: string
  disabled?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <Label :for="id">{{ label }}</Label>
    <Input
      :id="id"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="error && 'border-destructive'"
    />
    <p v-if="error" class="text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
```
