import fs from 'node:fs'
import { defineCommand } from 'citty'
import { commonArgs, resolveConfig } from '../config'
import { loadI18nConfig } from '../i18n'
import {
  console,
  findNestedKey,
  ICONS,
  type LocaleJson,
  normalizeLocales,
  r,
} from '../utils'

export default defineCommand({
  meta: {
    name: 'del',
    description: 'remove a key from every locale',
  },
  args: {
    key: {
      type: 'positional',
      description: 'the key to remove',
      required: true,
      valueHint: 'a.b.c',
    },
    locale: {
      alias: 'l',
      type: 'string',
      description: 'delete only from the specified locale',
    },
    ...commonArgs,
  },
  async run({ args }) {
    const i18n = loadI18nConfig()

    let locales = typeof args.locale === 'string' ? [args.locale] : args.locale || []
    locales = normalizeLocales(locales, i18n)
    const localesToCheck = locales.length > 0 ? locales : i18n.locales

    for (const locale of localesToCheck) {
      const localeJson = JSON.parse(fs.readFileSync(r(`${locale}.json`, i18n), { encoding: 'utf8' })) as LocaleJson

      const nestedKey = findNestedKey(localeJson, args.key)
      if (nestedKey.value !== undefined) {
        nestedKey.delete()
        console.log(ICONS.note, `Deleted key \`${args.key}\` from **${locale}**`)
        fs.writeFileSync(r(`${locale}.json`, i18n), JSON.stringify(localeJson, null, 2), { encoding: 'utf8' })
      }
      else {
        console.log(ICONS.note, `Skipped: **${locale}** *(key not found)*`)
      }
    }
  },
})
