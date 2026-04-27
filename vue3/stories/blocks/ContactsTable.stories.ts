import type { Meta, StoryObj } from '@storybook/vue3'
import ContactsTable from '@/components/blocks/ContactsTable.vue'
import type { Contact } from '@/stores/contacts/types'
import { fn } from '@storybook/test'

const mockContacts: Contact[] = [
  {
    clientId: 'id-001',
    advisorId: null,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phone: '(555) 123-4567',
    state: 'California',
    notes: null,
    intakeStatus: 'complete',
    referralStatus: 'connected',
    consentStatus: 'accepted',
    consentGivenAt: '2026-02-01T00:00:00Z',
    createdAt: '2026-01-15T10:30:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    clientId: 'id-002',
    advisorId: null,
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: null,
    state: 'Texas',
    notes: null,
    intakeStatus: 'in_progress',
    referralStatus: 'referred',
    consentStatus: 'pending',
    consentGivenAt: null,
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
  },
  {
    clientId: 'id-003',
    advisorId: null,
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice.j@example.com',
    phone: '(555) 987-6543',
    state: 'New York',
    notes: 'VIP client',
    intakeStatus: 'not_started',
    referralStatus: 'none',
    consentStatus: 'pending',
    consentGivenAt: null,
    createdAt: '2026-04-10T14:00:00Z',
    updatedAt: '2026-04-10T14:00:00Z',
  },
]

const meta: Meta<typeof ContactsTable> = {
  title: 'Blocks/ContactsTable',
  component: ContactsTable,
  args: {
    contacts: mockContacts,
    onView: fn(),
  },
}

export default meta
type Story = StoryObj<typeof ContactsTable>

export const Default: Story = {}

export const Empty: Story = {
  args: { contacts: [] },
}

export const SingleContact: Story = {
  args: { contacts: [mockContacts[0]] },
}
