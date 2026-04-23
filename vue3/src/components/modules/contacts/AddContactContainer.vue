<template>
  <div class="p-6 max-w-3xl">
    <h1 class="text-xl font-semibold text-foreground mb-1">Add Contact</h1>
    <p class="text-sm text-muted-foreground mb-6">Create a new client contact profile.</p>

    <AddContactForm
      :saving="saving"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useContactsStore } from '@/stores/contacts/useContactsStore'
import AddContactForm from '@/components/blocks/AddContactForm.vue'
import type { CreateContactPayload } from '@/stores/contacts/types'

const router = useRouter()
const store = useContactsStore()
const saving = ref(false)

const handleSubmit = async (payload: CreateContactPayload) => {
  try {
    saving.value = true
    await store.addContact(payload)
    router.push('/contacts')
  } catch {
    // error handled by store
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  router.push('/')
}
</script>
