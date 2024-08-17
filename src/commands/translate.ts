import { defineCommand } from 'citty'
import { loadI18nConfig } from '../i18n'

export default defineCommand({
  meta: {
    name: 'translate',
    description: 'translate a key in a locale',
  },
  async run() {
    const i18n = loadI18nConfig()
    console.log(i18n.default)

    // very WIP
  },
})
