import type { Meta, StoryObj } from '@storybook/vue3'
import AddContactForm from '@/components/blocks/AddContactForm.vue'
import { fn } from '@storybook/test'

const meta: Meta<typeof AddContactForm> = {
  title: 'Blocks/AddContactForm',
  component: AddContactForm,
  args: {
    saving: false,
    onSubmit: fn(),
    onCancel: fn(),
  },
}

export default meta
type Story = StoryObj<typeof AddContactForm>

export const Default: Story = {}

export const Saving: Story = {
  args: { saving: true },
}
