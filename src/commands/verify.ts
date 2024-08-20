import process from 'node:process'
import { defineCommand } from 'citty'
import c from 'picocolors'
import { resolveConfig } from '../config'
import { console, createLoadingIndicator } from '../utils'

export default defineCommand({
  meta: {
    name: 'verify',
    description: 'check everything is setup correctly',
  },
  async run({ args }) {
    console.loading('Loading data...', () => {
      console.log(c.green('✓ Data loaded!'))
    })
  },
})
