import type { Contact } from './types'

export const contactsReducers = {
  setContacts: (_state: Contact[], contacts: Contact[]): Contact[] => contacts,

  addContact: (state: Contact[], contact: Contact): Contact[] => [contact, ...state],

  updateContact: (
    state: Contact[],
    { id, updated }: { id: string; updated: Contact },
  ): Contact[] => state.map((c) => (c.clientId === id ? updated : c)),

  deleteContact: (state: Contact[], id: string): Contact[] =>
    state.filter((c) => c.clientId !== id),
}
