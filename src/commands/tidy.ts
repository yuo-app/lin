import fs from 'node:fs'
import { defineCommand } from 'citty'
import { commonArgs, resolveConfig } from '../config'
import { loadI18nConfig } from '../i18n'
import { catchError, checkArg, console, countKeys, ICONS, normalizeLocales, r, sortKeys } from '../utils'

export default defineCommand({
  meta: {
    name: 'tidy',
    description: 'check everything is set up correctly, and sort locale jsons',
  },
  args: {
    ...commonArgs,
    sort: {
      type: 'positional',
      description: 'sort the locales alphabetically or according to the default locale',
      required: false,
      valueHint: 'abc | def',
    },
  },
  async run({ args }) {
    const i18n = loadI18nConfig()

    let locales = typeof args.locale === 'string' ? [args.locale] : args.locale || []
    locales = catchError(normalizeLocales)(locales, i18n)
    const localesToCheck = locales.length > 0 ? locales : i18n.locales

    const defaultLocaleJson = JSON.parse(fs.readFileSync(r(`${i18n.default}.json`, i18n), { encoding: 'utf8' }))
    const keyCount = countKeys(defaultLocaleJson)

    console.log(ICONS.note, `Locales: ${localesToCheck.map(l => `**${l}**`).join(', ')}`)
    console.log(ICONS.note, `Keys: ${keyCount}`)

    catchError(checkArg)(args.sort, ['abc', 'def'])

    let sortFn = sortKeys
    if (args.sort === 'abc' || args.sort === undefined) {
      console.log(ICONS.info, `Sorting locales **alphabetically**`)
      sortFn = sortKeys
    }
    else if (args.sort === 'def') {
      console.log(ICONS.info, `Sorting locales according to **default locale**`)
      sortFn = (obj: any) => sortKeys(obj, defaultLocaleJson)
    }

    for (const locale of localesToCheck) {
      const localeFilePath = r(`${locale}.json`, i18n)
      const localeJson = JSON.parse(fs.readFileSync(localeFilePath, { encoding: 'utf8' }))
      fs.writeFileSync(localeFilePath, JSON.stringify(sortFn(localeJson), null, 2), { encoding: 'utf8' })
    }

    console.log(ICONS.success, `Sorted locales: ${localesToCheck.map(l => `**${l}**`).join(', ')}`)
  },
})
