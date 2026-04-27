import type { Meta, StoryObj } from '@storybook/vue3'
import ContactProfile from '@/components/blocks/ContactProfile.vue'
import type { Contact } from '@/stores/contacts/types'
import { fn } from '@storybook/test'

const mockContact: Contact = {
  clientId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  advisorId: null,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  phone: '(555) 123-4567',
  state: 'California',
  notes: null,
  intakeStatus: 'not_started',
  referralStatus: 'none',
  consentStatus: 'pending',
  consentGivenAt: null,
  createdAt: '2026-03-15T10:30:00Z',
  updatedAt: '2026-03-15T10:30:00Z',
}

const meta: Meta<typeof ContactProfile> = {
  title: 'Blocks/ContactProfile',
  component: ContactProfile,
  args: {
    contact: mockContact,
    onStartIntake: fn(),
  },
}

export default meta
type Story = StoryObj<typeof ContactProfile>

export const Default: Story = {}

export const IntakeComplete: Story = {
  args: {
    contact: { ...mockContact, intakeStatus: 'complete', referralStatus: 'connected' },
  },
}

export const NoPhone: Story = {
  args: {
    contact: { ...mockContact, phone: null },
  },
}
