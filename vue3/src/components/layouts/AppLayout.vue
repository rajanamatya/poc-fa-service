<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-60 flex flex-col bg-sidebar border-r border-sidebar-border">
      <!-- Logo -->
      <div class="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        <LayoutGrid class="w-5 h-5 text-muted-foreground" />
        <span class="font-bold text-sm text-foreground">WealthCounsel</span>
        <span class="text-muted-foreground text-xs">| Financial Advisor</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-4">
        <p class="text-xs font-semibold text-muted-foreground mb-3 px-2">Menu</p>
        <ul class="space-y-1">
          <li v-for="item in navItems" :key="item.label">
            <router-link
              :to="item.to"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive(item.to)
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-foreground hover:bg-muted',
              ]"
            >
              <component :is="item.icon" class="w-4 h-4" />
              {{ item.label }}
              <ChevronRight v-if="item.children" class="w-4 h-4 ml-auto" />
            </router-link>
          </li>
        </ul>
      </nav>

      <!-- Bottom action -->
      <div class="p-3">
        <router-link
          to="/contacts/add"
          class="flex items-center gap-2 w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <PlusCircle class="w-4 h-4" />
          Add Contact
        </router-link>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top bar with breadcrumbs -->
      <header class="flex items-center justify-between h-10 px-4 bg-topbar text-topbar-foreground">
        <div class="flex items-center gap-2 text-sm">
          <LayoutDashboard class="w-4 h-4" />
          <template v-for="(crumb, i) in (breadcrumbs ?? [])" :key="i">
            <span class="text-topbar-foreground/60" v-if="i > 0">›</span>
            <router-link
              v-if="crumb.to && i < (breadcrumbs ?? []).length - 1"
              :to="crumb.to"
              class="font-medium hover:underline"
            >
              {{ crumb.label }}
            </router-link>
            <span v-else class="font-medium">{{ crumb.label }}</span>
          </template>
        </div>
        <div class="flex items-center gap-3">
          <button class="relative" aria-label="Notifications">
            <Bell class="w-4 h-4" />
            <span
              class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-400 text-[9px] font-bold text-foreground rounded-full flex items-center justify-center"
            >
              3
            </span>
          </button>
          <div
            class="w-7 h-7 rounded-full bg-primary-foreground text-primary text-xs font-bold flex items-center justify-center"
          >
            AC
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import {
  LayoutGrid,
  LayoutDashboard,
  Bell,
  PlusCircle,
  ChevronRight,
  Home,
  Users,
  Scale,
} from 'lucide-vue-next'

interface Breadcrumb {
  label: string
  to?: string
}

defineProps<{
  breadcrumbs?: Breadcrumb[]
}>()

const route = useRoute()

const navItems = [
  { label: 'Dashboard', to: '/', icon: Home },
  { label: 'Contacts', to: '/contacts', icon: Users },
  { label: 'Attorneys', to: '/attorneys', icon: Scale, children: true },
]

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
