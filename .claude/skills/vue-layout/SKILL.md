---
name: vue-layout
# prettier-ignore
description: Generate a slot-based Vue 3 layout component + story. Use when creating a layout, page layout, SettingsLayout, or any slot-based page structure.
---

# Vue Layout Skill

Generates a layout component in `src/components/layouts/`.
Layouts are purely structural — slots only, no props, no state,
no store imports.

---

## Required output

Always generate the component. Story is strongly recommended
for documentation purposes:

1. `[Name]Layout.vue` — required
2. `[Name]Layout.stories.ts` — recommended

> Layouts are structural only. They never have tests.
> No logic means nothing to unit test.

---

## Rules

- Lives in `src/components/layouts/[Name]/`
- Named slots only — no props
- No state, no store imports, no logic
- Tailwind for structure and spacing only
- CSS variables for colors (`bg-background`, `border-border`)
- Always include a default slot for main content
- Named slots for regions: header, sidebar, footer etc.
- Never add a `.test.ts` file — layouts have no logic to test

---

## Layout template

```vue
<!-- layouts/[Name]Layout/[Name]Layout.vue -->
<template>
  <div class="min-h-screen bg-background text-foreground">

    <!-- Header region -->
    <header
      v-if="$slots.header"
      class="border-b border-border"
    >
      <div class="mx-auto max-w-7xl px-4 py-4">
        <slot name="header" />
      </div>
    </header>

    <div class="mx-auto max-w-7xl px-4 py-6">
      <div class="flex gap-6">

        <!-- Sidebar region -->
        <aside
          v-if="$slots.sidebar"
          class="w-64 shrink-0"
        >
          <slot name="sidebar" />
        </aside>

        <!-- Main content (default slot) -->
        <main class="flex-1 min-w-0">
          <slot />
        </main>

      </div>
    </div>

    <!-- Footer region -->
    <footer
      v-if="$slots.footer"
      class="border-t border-border mt-auto"
    >
      <div class="mx-auto max-w-7xl px-4 py-4">
        <slot name="footer" />
      </div>
    </footer>

  </div>
</template>
```

---

## Usage in a page

```vue
<!-- pages/settings.vue -->
<template>
  <SettingsLayout>
    <template #header>
      <AppHeader />
    </template>

    <template #sidebar>
      <SettingsNav />
    </template>

    <!-- default slot -->
    <UserCardContainer />

    <template #footer>
      <AppFooter />
    </template>
  </SettingsLayout>
</template>
```

---

## Common layout variants

### Full width — no sidebar
```vue
<template>
  <div class="min-h-screen bg-background">
    <header class="border-b border-border">
      <slot name="header" />
    </header>
    <main class="mx-auto max-w-7xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
```

### Centered card — for auth/onboarding
```vue
<template>
  <div class="min-h-screen bg-muted flex items-center justify-center">
    <div class="w-full max-w-md">
      <slot />
    </div>
  </div>
</template>
```

### Two column — equal width
```vue
<template>
  <div class="min-h-screen bg-background">
    <slot name="header" />
    <div class="grid grid-cols-2 gap-6 p-6">
      <slot name="left" />
      <slot name="right" />
    </div>
  </div>
</template>
```

---

## Story template (recommended)

```ts
// stories/layouts/[Name]Layout/[Name]Layout.stories.ts
import type { Meta, StoryObj } from '@storybook/vue3'
import NameLayout from './NameLayout.vue'

const meta: Meta = {
  title: 'Layouts/NameLayout',
  component: NameLayout,
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { NameLayout },
    template: `
      <NameLayout>
        <template #header>
          <div class="text-sm font-medium">Header</div>
        </template>
        <template #sidebar>
          <div class="text-sm">Sidebar</div>
        </template>
        <div class="text-sm">Main content</div>
      </NameLayout>
    `,
  }),
}
```

---

## File structure output

```
src/components/layouts/[Name]Layout/
└── [Name]Layout.vue

stories/layouts/[Name]Layout/
└── [Name]Layout.stories.ts  (recommended)
```
