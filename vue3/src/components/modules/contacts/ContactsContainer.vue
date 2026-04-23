<template>
  <div class="p-6">
    <h1 class="text-xl font-semibold text-foreground mb-1">Contacts</h1>
    <p class="text-sm text-muted-foreground mb-6">Manage your client contacts.</p>

    <ContactsToolbar v-model:search="search" />

    <!-- Loading -->
    <div v-if="loading && contacts.length === 0" class="text-center py-12 text-muted-foreground">
      Loading contacts...
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm">
      {{ error }}
    </div>

    <!-- Table -->
    <ContactsTable
      v-if="contacts.length > 0"
      :contacts="paginatedContacts"
      @view="handleView"
    />

    <!-- Empty state -->
    <div v-else-if="!loading" class="text-center py-16 text-muted-foreground">
      <p class="text-lg font-medium mb-1">No contacts yet</p>
      <p class="text-sm mb-4">Add your first contact to get started.</p>
      <router-link to="/contacts/add" class="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
        <Plus class="w-4 h-4" /> Add Contact
      </router-link>
    </div>

    <!-- Pagination -->
    <div v-if="contacts.length > 0" class="flex items-center justify-between mt-4 text-sm text-muted-foreground">
      <span>{{ filteredContacts.length }} of {{ contacts.length }} contact(s)</span>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          Rows per page
          <select v-model="perPage" class="px-2 py-1 border border-border rounded text-sm bg-sidebar text-foreground">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <div class="flex items-center gap-1">
          <button @click="currentPage = 1" :disabled="currentPage === 1" class="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronsLeft class="w-4 h-4" /></button>
          <button @click="currentPage--" :disabled="currentPage === 1" class="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronLeft class="w-4 h-4" /></button>
          <button @click="currentPage++" :disabled="currentPage === totalPages" class="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronRight class="w-4 h-4" /></button>
          <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" class="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronsRight class="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'
import { useContactsEffects } from '@/composables/effects/useContactsEffects'
import ContactsToolbar from '@/components/blocks/ContactsToolbar.vue'
import ContactsTable from '@/components/blocks/ContactsTable.vue'

const router = useRouter()
const { store } = useContactsEffects()

const contacts = computed(() => store.contacts)
const loading = computed(() => store.loading)
const error = computed(() => store.error)

const search = ref('')
const currentPage = ref(1)
const perPage = ref(10)

const filteredContacts = computed(() => {
  if (!search.value) return contacts.value
  const q = search.value.toLowerCase()
  return contacts.value.filter(
    (c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredContacts.value.length / perPage.value)))

const paginatedContacts = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filteredContacts.value.slice(start, start + perPage.value)
})

const handleView = (id: string) => {
  router.push(`/contacts/${id}`)
}
</script>
