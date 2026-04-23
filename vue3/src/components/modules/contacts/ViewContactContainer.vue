<template>
  <div class="p-6">
    <div v-if="loading" class="text-center py-12 text-muted-foreground">Loading contact...</div>
    <div v-else-if="error" class="text-center py-12 text-destructive">{{ error }}</div>
    <ContactProfile v-else-if="contact" :contact="contact" @start-intake="handleStartIntake" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { contactsService } from '@/stores/contacts/contactsService'
import type { Contact } from '@/stores/contacts/types'
import ContactProfile from '@/components/blocks/ContactProfile.vue'

const route = useRoute()
const contact = ref<Contact | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const id = route.params.id as string
    contact.value = await contactsService.getContact(id)
  } catch {
    error.value = 'Failed to load contact'
  } finally {
    loading.value = false
  }
})

const handleStartIntake = () => {
  // TODO: navigate to intake flow
  console.log('Start intake for', contact.value?.clientId)
}
</script>
