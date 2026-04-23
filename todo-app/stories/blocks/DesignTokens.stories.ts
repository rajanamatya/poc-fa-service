import type { Meta, StoryObj } from '@storybook/vue3'
import DesignTokens from '@/components/blocks/DesignTokens.vue'

const meta: Meta<typeof DesignTokens> = {
  title: 'Blocks/DesignTokens',
  component: DesignTokens,
}

export default meta
type Story = StoryObj<typeof DesignTokens>

export const Default: Story = {}

export const DarkMode: Story = {
  decorators: [
    (story) => ({
      components: { story },
      template: '<div class="dark"><story /></div>',
    }),
  ],
}
