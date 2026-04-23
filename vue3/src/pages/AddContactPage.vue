<template>
  <AppLayout :breadcrumbs="[{ label: 'Contacts', to: '/contacts' }, { label: 'Add Contact' }]">
    <AddContactContainer />
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/layouts/AppLayout.vue'
import AddContactContainer from '@/components/modules/contacts/AddContactContainer.vue'
</script>
