<script setup lang="ts">
const colorTokens = [
  { name: '--background',            label: 'Background',            swatch: 'bg-background' },
  { name: '--foreground',            label: 'Foreground',            swatch: 'bg-foreground' },
  { name: '--card',                  label: 'Card',                  swatch: 'bg-card' },
  { name: '--card-foreground',       label: 'Card Foreground',       swatch: 'bg-card-foreground' },
  { name: '--primary',               label: 'Primary',               swatch: 'bg-primary' },
  { name: '--primary-foreground',    label: 'Primary Foreground',    swatch: 'bg-primary-foreground' },
  { name: '--secondary',             label: 'Secondary',             swatch: 'bg-secondary' },
  { name: '--secondary-foreground',  label: 'Secondary Foreground',  swatch: 'bg-secondary-foreground' },
  { name: '--destructive',           label: 'Destructive',           swatch: 'bg-destructive' },
  { name: '--destructive-foreground',label: 'Destructive Foreground',swatch: 'bg-destructive-foreground' },
  { name: '--border',                label: 'Border',                swatch: 'bg-border' },
  { name: '--input',                 label: 'Input',                 swatch: 'bg-input' },
]

const opacitySwatches = [
  { stop: 100, primary: 'bg-primary/100', foreground: 'bg-foreground/100' },
  { stop: 75,  primary: 'bg-primary/75',  foreground: 'bg-foreground/75'  },
  { stop: 50,  primary: 'bg-primary/50',  foreground: 'bg-foreground/50'  },
  { stop: 25,  primary: 'bg-primary/25',  foreground: 'bg-foreground/25'  },
  { stop: 10,  primary: 'bg-primary/10',  foreground: 'bg-foreground/10'  },
]
</script>

<template>
  <div class="p-8 space-y-10 bg-background text-foreground">
    <section>
      <h2 class="text-lg font-semibold mb-4">Color Tokens</h2>
      <div class="grid grid-cols-3 gap-4">
        <div v-for="token in colorTokens" :key="token.name" class="flex flex-col gap-1.5">
          <div class="h-14 rounded border border-border" :class="token.swatch" />
          <p class="text-sm font-medium leading-none">{{ token.label }}</p>
          <p class="text-xs text-foreground/50">{{ token.name }}</p>
        </div>
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-1">Buttons</h2>
      <p class="text-xs text-foreground/50 mb-4">Hover and focus each button to verify modifier support.</p>
      <div class="flex flex-wrap gap-3">
        <button class="px-4 py-2 rounded text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
          Primary
        </button>
        <button class="px-4 py-2 rounded text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
          Secondary
        </button>
        <button class="px-4 py-2 rounded text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/80 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 focus:ring-offset-background">
          Destructive
        </button>
        <button class="px-4 py-2 rounded text-sm font-medium border border-border bg-transparent text-foreground hover:bg-foreground/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
          Outline
        </button>
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-1">Opacity Modifiers</h2>
      <p class="text-xs text-foreground/50 mb-4">Verifies that <code class="font-mono">bg-primary/N</code> and <code class="font-mono">bg-foreground/N</code> resolve correctly.</p>
      <div class="space-y-4">
        <div>
          <p class="text-xs font-mono text-foreground/50 mb-2">bg-primary/N</p>
          <div class="flex gap-3">
            <div v-for="s in opacitySwatches" :key="s.stop" class="flex flex-col items-center gap-1.5">
              <div class="h-10 w-16 rounded border border-border" :class="s.primary" />
              <span class="text-xs font-mono text-foreground/50">{{ s.stop }}%</span>
            </div>
          </div>
        </div>
        <div>
          <p class="text-xs font-mono text-foreground/50 mb-2">bg-foreground/N</p>
          <div class="flex gap-3">
            <div v-for="s in opacitySwatches" :key="s.stop" class="flex flex-col items-center gap-1.5">
              <div class="h-10 w-16 rounded border border-border" :class="s.foreground" />
              <span class="text-xs font-mono text-foreground/50">{{ s.stop }}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-4">Typography</h2>
      <div class="space-y-2">
        <p class="text-3xl font-bold tracking-tight">Display 3xl bold</p>
        <p class="text-2xl font-semibold">Heading 2xl semibold</p>
        <p class="text-xl font-medium">Heading xl medium</p>
        <p class="text-base">Body base — the quick brown fox jumps over the lazy dog</p>
        <p class="text-sm">Body sm — the quick brown fox jumps over the lazy dog</p>
        <p class="text-xs text-foreground/50">Caption xs muted</p>
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-4">Spacing &amp; Radius</h2>
      <div class="flex items-end gap-4">
        <div
          v-for="size in ['p-2', 'p-4', 'p-6', 'p-8', 'p-12']"
          :key="size"
          :class="[size, 'rounded bg-primary/15']"
        >
          <span class="text-xs font-mono">{{ size }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
