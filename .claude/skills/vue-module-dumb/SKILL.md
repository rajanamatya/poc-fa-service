---
name: vue-module-dumb
# prettier-ignore
description: Generate dumb Vue 3 display and edit form components + stories inside a module. Use when creating a display component, edit form, or any dumb component inside a module.
---

# Vue Module Dumb Component Skill

Generates dumb components inside `src/components/modules/[Module]/`.
These are the presentational siblings of a Container component.
Always creates both the component and its Storybook story.

---

## Required output

Every dumb module component MUST generate both files. Do not
consider the task complete until both exist:

1. `[Name].vue` — the component
2. `[Name].stories.ts` — the story

> Dumb module components are presentation only. They never
> have tests. Tests belong exclusively in the Container.

---

## Rules

- Lives in `src/components/modules/[Module]/`
- No store imports ever
- Receives all data via props
- Emits all actions up to container
- Never fetches data or calls APIs
- Always pair with a `.stories.ts` file
- Use CSS variable tokens, never hardcoded colors
- Use shadcn-vue Card as the outer wrapper where appropriate
- Never add a `.test.ts` file — tests belong in containers

---

## Display component template

Used for read-only presentation of data.

```vue
<!-- modules/[Module]/[Feature]Display.vue -->
<script setup lang="ts">
import {
  Card, CardContent,
  CardHeader, CardTitle,
  CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  // typed data shape
  title: string
  description?: string
}

defineProps<Props>()

defineEmits<{
  edit: []
  delete: []
}>()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
    </CardHeader>
    <CardContent>
      <p class="text-muted-foreground">{{ description }}</p>
    </CardContent>
    <CardFooter class="flex justify-end gap-2">
      <Button variant="outline" @click="$emit('edit')">
        Edit
      </Button>
      <Button
        variant="destructive"
        @click="$emit('delete')"
      >
        Delete
      </Button>
    </CardFooter>
  </Card>
</template>
```

---

## Edit form component template

Used for editing data, emits submit/cancel.

```vue
<!-- modules/[Module]/[Feature]EditForm.vue -->
<script setup lang="ts">
import {
  Card, CardContent,
  CardHeader, CardTitle,
  CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import FormField from '@/components/blocks/FormField/FormField.vue'
import { ref } from 'vue'

interface Props {
  initialValues: Record<string, string>
  loading?: boolean
}

const props = defineProps<Props>()

defineEmits<{
  submit: [values: Record<string, string>]
  cancel: []
}>()

const values = ref({ ...props.initialValues })
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Edit</CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <slot :values="values" />
    </CardContent>
    <CardFooter class="flex justify-between">
      <Button
        variant="outline"
        @click="$emit('cancel')"
      >
        Cancel
      </Button>
      <Button
        :disabled="loading"
        @click="$emit('submit', values)"
      >
        {{ loading ? 'Saving...' : 'Save' }}
      </Button>
    </CardFooter>
  </Card>
</template>
```

---

## Story template

```ts
// stories/modules/[Module]/[Feature]Display.stories.ts
import type { Meta, StoryObj } from '@storybook/vue3'
import FeatureDisplay from './FeatureDisplay.vue'

const meta: Meta<typeof FeatureDisplay> = {
  title: 'Modules/[Module]/[Feature]Display',
  component: FeatureDisplay,
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Example Title',
    description: 'Example description text',
  },
}
```

---

## File structure output

```
src/components/modules/[Module]/
├── [Feature]Display.vue
└── [Feature]EditForm.vue

stories/modules/[Module]/
├── [Feature]Display.stories.ts
└── [Feature]EditForm.stories.ts
```
