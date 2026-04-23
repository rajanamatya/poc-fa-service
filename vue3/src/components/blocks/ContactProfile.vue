<template>
  <div>
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <div class="w-14 h-14 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center flex-shrink-0">
        {{ contact.firstName[0] }}{{ contact.lastName[0] }}
      </div>
      <div>
        <h1 class="text-2xl font-semibold text-foreground">{{ contact.firstName }} {{ contact.lastName }}</h1>
        <p class="text-sm text-muted-foreground">{{ contact.email }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="activeTab = tab"
        :class="[
          'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
          activeTab === tab
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:text-foreground',
        ]"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Cards grid -->
    <div class="grid grid-cols-3 gap-4 items-start">
      <!-- Contact card -->
      <div class="bg-sidebar border border-border rounded-lg p-5">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-base font-semibold text-primary">Contact</h2>
          <button class="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Edit contact">
            <SquarePen class="w-4 h-4" />
          </button>
        </div>
        <p class="text-xs text-muted-foreground mb-4">Contact ID: {{ contact.clientId.slice(0, 8) }}</p>

        <dl class="space-y-3 text-sm">
          <div>
            <dt class="text-xs text-muted-foreground">First Name</dt>
            <dd class="text-foreground border-b border-border pb-2">{{ contact.firstName }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">Last Name</dt>
            <dd class="text-foreground border-b border-border pb-2">{{ contact.lastName }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">State</dt>
            <dd class="text-foreground border-b border-border pb-2">{{ contact.state }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">Email</dt>
            <dd class="flex items-center justify-between text-foreground border-b border-border pb-2">
              {{ contact.email }}
              <Mail class="w-3.5 h-3.5 text-muted-foreground" />
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">Phone</dt>
            <dd class="flex items-center justify-between text-foreground border-b border-border pb-2">
              {{ contact.phone ?? '—' }}
              <Phone class="w-3.5 h-3.5 text-muted-foreground" />
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">Created</dt>
            <dd class="text-foreground">{{ formatDate(contact.createdAt) }}</dd>
          </div>
        </dl>
      </div>

      <!-- Up Next card -->
      <div class="bg-sidebar border border-border rounded-lg p-5">
        <h2 class="text-base font-semibold text-primary mb-4">Up Next</h2>
        <div class="bg-yellow-200 rounded-lg p-4">
          <div class="flex items-start gap-3 mb-3">
            <CheckCircle2 class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p class="font-semibold text-foreground text-sm">Complete Client Intake</p>
              <p class="text-xs text-muted-foreground mt-1">
                Get your client matched with the right estate planner in minutes.
              </p>
            </div>
          </div>
          <button
            @click="$emit('startIntake')"
            class="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ClipboardCheck class="w-4 h-4" />
            Start Intake
          </button>
        </div>
      </div>

      <!-- Activity card -->
      <div class="bg-sidebar border border-border rounded-lg p-5">
        <h2 class="text-base font-semibold text-primary mb-4">Activity</h2>
        <div class="flex items-start gap-3">
          <div class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
            <CirclePlus class="w-3.5 h-3.5" />
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">Profile created</p>
            <p class="text-xs text-muted-foreground">{{ formatDateTime(contact.createdAt) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SquarePen, Mail, Phone, CheckCircle2, ClipboardCheck, CirclePlus } from 'lucide-vue-next'
import type { Contact } from '@/stores/contacts/types'

defineProps<{ contact: Contact }>()
defineEmits<{ startIntake: [] }>()

const tabs = ['Summary', 'Activities', 'Intake']
const activeTab = ref('Summary')

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
</script>
