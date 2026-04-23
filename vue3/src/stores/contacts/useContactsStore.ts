import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { Contact, CreateContactPayload } from './types'
import { contactsService } from './contactsService'
import { contactsReducers } from './contactsReducers'

export const useContactsStore = defineStore('contacts', () => {
  // ── Raw state (private) ────────────────────────────────────────────
  const _contacts = ref<Contact[]>([])
  const _loading = ref(false)
  const _error = ref<string | null>(null)

  // ── Public readonly state ──────────────────────────────────────────
  const contacts = computed(() => _contacts.value)
  const loading = readonly(_loading)
  const error = readonly(_error)
  const totalCount = computed(() => _contacts.value.length)

  // ── Actions ────────────────────────────────────────────────────────
  const clearError = () => {
    _error.value = null
  }

  const fetchContacts = async () => {
    try {
      clearError()
      _loading.value = true
      const data = await contactsService.getContacts()
      _contacts.value = contactsReducers.setContacts(_contacts.value, data)
    } catch (err) {
      _error.value = 'Failed to fetch contacts'
      console.error(err)
    } finally {
      _loading.value = false
    }
  }

  const addContact = async (payload: CreateContactPayload) => {
    try {
      clearError()
      _loading.value = true
      const created = await contactsService.createContact(payload)
      _contacts.value = contactsReducers.addContact(_contacts.value, created)
      return created
    } catch (err) {
      _error.value = 'Failed to create contact'
      console.error(err)
      throw err
    } finally {
      _loading.value = false
    }
  }

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    try {
      clearError()
      const updated = await contactsService.updateContact(id, updates)
      _contacts.value = contactsReducers.updateContact(_contacts.value, { id, updated })
      return updated
    } catch (err) {
      _error.value = 'Failed to update contact'
      console.error(err)
      throw err
    }
  }

  const deleteContact = async (id: string) => {
    try {
      clearError()
      await contactsService.deleteContact(id)
      _contacts.value = contactsReducers.deleteContact(_contacts.value, id)
    } catch (err) {
      _error.value = 'Failed to delete contact'
      console.error(err)
    }
  }

  return {
    contacts,
    loading,
    error,
    totalCount,
    fetchContacts,
    addContact,
    updateContact,
    deleteContact,
    clearError,
  }
})
