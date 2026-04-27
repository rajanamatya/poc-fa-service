import type { Meta, StoryObj } from '@storybook/vue3'
import AppLayout from '@/components/layouts/AppLayout.vue'

const meta: Meta<typeof AppLayout> = {
  title: 'Layouts/AppLayout',
  component: AppLayout,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof AppLayout>

export const Default: Story = {
  args: {
    breadcrumbs: [{ label: 'Dashboard' }],
  },
  render: (args) => ({
    components: { AppLayout },
    setup: () => ({ args }),
    template: `
      <AppLayout v-bind="args">
        <div class="p-6 text-foreground">
          <h1 class="text-2xl font-semibold mb-2">Dashboard</h1>
          <p class="text-muted-foreground">Page content goes here.</p>
        </div>
      </AppLayout>
    `,
  }),
}

export const WithBreadcrumbs: Story = {
  args: {
    breadcrumbs: [
      { label: 'Contacts', to: '/contacts' },
      { label: 'Jane Doe' },
    ],
  },
  render: (args) => ({
    components: { AppLayout },
    setup: () => ({ args }),
    template: `
      <AppLayout v-bind="args">
        <div class="p-6 text-foreground">
          <h1 class="text-2xl font-semibold">Contact Detail</h1>
        </div>
      </AppLayout>
    `,
  }),
}
