<template>
  <div class="flex items-center gap-3 mb-4">
    <div class="relative flex-1 max-w-sm">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        :value="search"
        @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Search contacts..."
        class="w-full pl-9 pr-3 py-2 bg-sidebar border border-border rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
    <button class="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors">
      Intake Status <ChevronDown class="w-3.5 h-3.5" />
    </button>
    <button class="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors">
      Referral Status <ChevronDown class="w-3.5 h-3.5" />
    </button>
    <router-link
      to="/contacts/add"
      class="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
    >
      <Plus class="w-4 h-4" /> Add Contact
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { Search, ChevronDown, Plus } from 'lucide-vue-next'

defineProps<{ search: string }>()
defineEmits<{ 'update:search': [value: string] }>()
</script>
