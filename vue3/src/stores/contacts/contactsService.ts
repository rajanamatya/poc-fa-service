import type { Contact, CreateContactPayload } from './types'

export const contactsService = {
  async getContacts(): Promise<Contact[]> {
    const res = await fetch('/api/contacts')
    if (!res.ok) throw new Error(`Failed to fetch contacts: ${res.status}`)
    return res.json()
  },

  async getContact(id: string): Promise<Contact> {
    const res = await fetch(`/api/contacts/${id}`)
    if (!res.ok) throw new Error(`Failed to fetch contact: ${res.status}`)
    return res.json()
  },

  async createContact(payload: CreateContactPayload): Promise<Contact> {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Failed to create contact: ${res.status}`)
    return res.json()
  },

  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact> {
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error(`Failed to update contact: ${res.status}`)
    return res.json()
  },

  async deleteContact(id: string): Promise<void> {
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Failed to delete contact: ${res.status}`)
  },
}
