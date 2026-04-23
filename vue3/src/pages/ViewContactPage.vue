<template>
  <AppLayout :breadcrumbs="[{ label: 'Contacts', to: '/contacts' }, { label: contactName }]">
    <ViewContactContainer />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layouts/AppLayout.vue'
import ViewContactContainer from '@/components/modules/contacts/ViewContactContainer.vue'

const route = useRoute()
const contactName = computed(() => (route.query.name as string) || 'Contact')
</script>
