import type { Meta, StoryObj } from '@storybook/vue3'
import ContactsToolbar from '@/components/blocks/ContactsToolbar.vue'
import { fn } from '@storybook/test'

const meta: Meta<typeof ContactsToolbar> = {
  title: 'Blocks/ContactsToolbar',
  component: ContactsToolbar,
  args: {
    search: '',
    'onUpdate:search': fn(),
  },
}

export default meta
type Story = StoryObj<typeof ContactsToolbar>

export const Default: Story = {}

export const WithSearch: Story = {
  args: { search: 'Jane' },
}
