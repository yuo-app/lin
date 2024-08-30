import { defineCommand } from 'citty'
import { console } from '../utils'

export default defineCommand({
  meta: {
    name: 'verify',
    description: 'check everything is setup correctly',
  },
  async run({ args }) {
    console.loading('Load data', async () => {
      await new Promise(resolve => setTimeout(resolve, 3000))
    })
  },
})
