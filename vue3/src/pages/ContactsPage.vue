<template>
  <AppLayout :breadcrumbs="[{ label: 'Contacts' }]">
    <ContactsContainer />
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/layouts/AppLayout.vue'
import ContactsContainer from '@/components/modules/contacts/ContactsContainer.vue'
</script>
