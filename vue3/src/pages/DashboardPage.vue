<template>
  <AppLayout :breadcrumbs="[{ label: 'Dashboard' }]">
    <div class="flex items-center justify-center min-h-full px-4">
      <div class="text-center max-w-lg">
        <!-- Icon -->
        <div
          class="mx-auto mb-6 w-16 h-16 rounded-xl bg-primary flex items-center justify-center"
        >
          <Users class="w-8 h-8 text-primary-foreground" />
        </div>

        <!-- Welcome text -->
        <h2 class="text-2xl font-semibold text-foreground mb-2">Welcome, Alexander</h2>
        <p class="text-sm text-muted-foreground leading-relaxed mb-8">
          Get started by adding your first client contact. Once added, you can track intake
          status, manage referrals to Estate Planners, and monitor activity.
        </p>

        <!-- Action buttons -->
        <div class="flex items-center justify-center gap-3 mb-10">
          <router-link
            to="/contacts/add"
            class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus class="w-4 h-4" />
            Add Your First Contact
          </router-link>
          <router-link
            to="/contacts"
            class="inline-flex items-center gap-2 px-5 py-2.5 border border-primary text-primary rounded-md text-sm font-medium hover:bg-primary/5 transition-colors"
          >
            Browse Contacts
            <ArrowRight class="w-4 h-4" />
          </router-link>
        </div>

        <!-- Steps -->
        <div class="flex justify-center gap-12">
          <div v-for="step in steps" :key="step.number" class="text-center">
            <div class="text-2xl font-bold text-primary mb-1">{{ step.number }}</div>
            <div class="text-xs text-muted-foreground">{{ step.label }}</div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { Users, UserPlus, ArrowRight } from 'lucide-vue-next'
import AppLayout from '@/components/layouts/AppLayout.vue'

const steps = [
  { number: '1', label: 'Add a client profile' },
  { number: '2', label: 'Match with an Estate Planner' },
  { number: '3', label: 'Track referral progress' },
]
</script>
