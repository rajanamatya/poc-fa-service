<template>
  <div class="border border-border rounded-lg overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-muted/50">
          <th class="text-left px-4 py-3 font-medium text-foreground">Name <ArrowUpDown class="inline w-3 h-3 ml-1 text-muted-foreground" /></th>
          <th class="text-left px-4 py-3 font-medium text-foreground">Email <ArrowUpDown class="inline w-3 h-3 ml-1 text-muted-foreground" /></th>
          <th class="text-left px-4 py-3 font-medium text-foreground">Phone</th>
          <th class="text-left px-4 py-3 font-medium text-foreground">State <ArrowUpDown class="inline w-3 h-3 ml-1 text-muted-foreground" /></th>
          <th class="text-left px-4 py-3 font-medium text-foreground">Intake Status <ArrowUpDown class="inline w-3 h-3 ml-1 text-muted-foreground" /></th>
          <th class="text-left px-4 py-3 font-medium text-foreground">Referral Status <ArrowUpDown class="inline w-3 h-3 ml-1 text-muted-foreground" /></th>
          <th class="text-left px-4 py-3 font-medium text-foreground">Date Added <ArrowUpDown class="inline w-3 h-3 ml-1 text-muted-foreground" /></th>
          <th class="w-10"></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="c in contacts"
          :key="c.clientId"
          class="border-t border-border hover:bg-muted/30 transition-colors"
        >
          <td class="px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                {{ c.firstName[0] }}{{ c.lastName[0] }}
              </div>
              <div>
                <div class="font-medium text-foreground">{{ c.firstName }} {{ c.lastName }}</div>
                <div class="text-xs text-muted-foreground">{{ c.email }}</div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3 text-muted-foreground">{{ c.email }}</td>
          <td class="px-4 py-3 text-muted-foreground">{{ c.phone ?? '—' }}</td>
          <td class="px-4 py-3 text-muted-foreground">{{ c.state }}</td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center gap-1.5">
              <span :class="intakeIconClass(c.intakeStatus)">
                <component :is="intakeIcon(c.intakeStatus)" class="w-3.5 h-3.5" />
              </span>
              {{ intakeLabel(c.intakeStatus) }}
            </span>
          </td>
          <td class="px-4 py-3">
            <span :class="referralBadgeClass(c.referralStatus)" class="text-xs px-2.5 py-1 rounded-full font-medium capitalize">
              {{ c.referralStatus }}
            </span>
          </td>
          <td class="px-4 py-3 text-muted-foreground">{{ formatDate(c.createdAt) }}</td>
          <td class="px-4 py-3">
            <button
              @click="$emit('view', c.clientId)"
              class="w-7 h-7 rounded-full bg-yellow-300 flex items-center justify-center hover:bg-yellow-400 transition-colors"
              aria-label="View contact"
            >
              <ArrowUpRight class="w-3.5 h-3.5 text-foreground" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ArrowUpDown, ArrowUpRight, CheckCircle2, Clock, Circle } from 'lucide-vue-next'
import type { Contact } from '@/stores/contacts/types'

defineProps<{ contacts: Contact[] }>()
defineEmits<{ view: [id: string] }>()

const intakeLabels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
}

const intakeLabel = (s: string) => intakeLabels[s] ?? s

function intakeIcon(status: Contact['intakeStatus']) {
  switch (status) {
    case 'complete': return CheckCircle2
    case 'in_progress': return Clock
    default: return Circle
  }
}

function intakeIconClass(status: Contact['intakeStatus']) {
  switch (status) {
    case 'complete': return 'text-green-600'
    case 'in_progress': return 'text-yellow-500'
    default: return 'text-muted-foreground'
  }
}

function referralBadgeClass(status: Contact['referralStatus']) {
  switch (status) {
    case 'connected': return 'bg-green-100 text-green-800 border border-green-300'
    case 'viewed': return 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    case 'referred': return 'bg-orange-100 text-orange-800 border border-orange-300'
    default: return 'bg-muted text-muted-foreground border border-border'
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
