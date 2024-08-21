import { defineCommand } from 'citty'
import { loadI18nConfig } from '../i18n'

export default defineCommand({
  meta: {
    name: 'add',
    description: 'add a key to the locales with all the translations',
  },
  async run() {
    const i18n = loadI18nConfig()
    console.log(i18n.default)

    // very WIP
  },
})
