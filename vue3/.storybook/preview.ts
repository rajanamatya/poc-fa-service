import '../src/assets/globals.css'
import type { Preview } from '@storybook/vue3'
import { setup } from '@storybook/vue3'
import { createRouter, createMemoryHistory } from 'vue-router'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/contacts', component: { template: '<div />' } },
    { path: '/contacts/add', component: { template: '<div />' } },
    { path: '/contacts/:id', component: { template: '<div />' } },
    { path: '/attorneys', component: { template: '<div />' } },
  ],
})

setup((app) => {
  app.use(router)
})

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
  },
}

export default preview
