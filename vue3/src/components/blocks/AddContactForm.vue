<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Name row -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">
          First Name <span class="text-yellow-600">*</span>
        </label>
        <input
          v-model="form.firstName"
          type="text"
          placeholder="First name"
          required
          class="w-full px-3 py-2 bg-sidebar border border-border rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">
          Last Name <span class="text-yellow-600">*</span>
        </label>
        <input
          v-model="form.lastName"
          type="text"
          placeholder="Last name"
          required
          class="w-full px-3 py-2 bg-sidebar border border-border rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>

    <!-- Email / Phone / State row -->
    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">
          Email <span class="text-yellow-600">*</span>
        </label>
        <input
          v-model="form.email"
          type="email"
          placeholder="email@example.com"
          required
          class="w-full px-3 py-2 bg-sidebar border border-border rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">Phone</label>
        <input
          v-model="form.phone"
          type="tel"
          placeholder="(555) 555-5555"
          class="w-full px-3 py-2 bg-sidebar border border-border rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">
          State of Residence <span class="text-yellow-600">*</span>
        </label>
        <select
          v-model="form.state"
          required
          class="w-full px-3 py-2 bg-sidebar border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
        >
          <option value="" disabled>Select a state</option>
          <option v-for="s in states" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <!-- Advisor Notes -->
    <div>
      <label class="block text-sm font-medium text-foreground mb-1">Advisor Notes</label>
      <div class="flex items-center gap-1 px-2 py-1.5 bg-sidebar border border-border border-b-0 rounded-t-md">
        <button type="button" v-for="btn in toolbarButtons" :key="btn.label" :aria-label="btn.label"
          class="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <component :is="btn.icon" class="w-4 h-4" />
        </button>
        <span class="flex-1" />
        <button type="button" aria-label="Undo" class="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Undo2 class="w-4 h-4" />
        </button>
        <button type="button" aria-label="Redo" class="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Redo2 class="w-4 h-4" />
        </button>
      </div>
      <textarea
        v-model="form.notes"
        rows="4"
        placeholder="Add any notes about this client..."
        class="w-full px-3 py-2 bg-sidebar border border-border rounded-b-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-2">
      <button
        type="button"
        @click="$emit('cancel')"
        class="px-5 py-2 border border-primary text-primary rounded-full text-sm font-medium hover:bg-primary/5 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        :disabled="saving"
        class="px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        Save Contact
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import {
  Bold, Italic, Strikethrough, AlignLeft,
  List, ListOrdered, Minus, Undo2, Redo2,
} from 'lucide-vue-next'

defineProps<{ saving: boolean }>()
const emit = defineEmits<{
  submit: [payload: { firstName: string; lastName: string; email: string; phone?: string; state: string; notes?: string }]
  cancel: []
}>()

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  state: '',
  notes: '',
})

const toolbarButtons = [
  { label: 'Bold', icon: Bold },
  { label: 'Italic', icon: Italic },
  { label: 'Strikethrough', icon: Strikethrough },
  { label: 'Align', icon: AlignLeft },
  { label: 'Bullet list', icon: List },
  { label: 'Numbered list', icon: ListOrdered },
  { label: 'Divider', icon: Minus },
]

const states = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
]

const handleSubmit = () => {
  emit('submit', {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone || undefined,
    state: form.state,
    notes: form.notes || undefined,
  })
}
</script>
