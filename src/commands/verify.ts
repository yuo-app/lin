import { defineCommand } from 'citty'
import { console } from '../utils'

export default defineCommand({
  meta: {
    name: 'verify',
    description: 'verify translations (not implemented)',
  },
  async run({ args: _args }) {
    console.loading('Load data', async () => {
      await new Promise(resolve => setTimeout(resolve, 3000))
    })
  },
})
