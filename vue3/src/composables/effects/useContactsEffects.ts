import { onMounted } from 'vue'
import { useContactsStore } from '@/stores/contacts/useContactsStore'

/**
 * Fetches contacts on mount. Use in the contacts Container.
 */
export function useContactsEffects() {
  const store = useContactsStore()

  onMounted(() => {
    store.fetchContacts()
  })

  return { store }
}
