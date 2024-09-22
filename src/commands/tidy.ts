import fs from 'node:fs'
import path from 'node:path'
import { defineCommand } from 'citty'
import c from 'picocolors'
import { commonArgs, resolveConfig } from '../config'
import { loadI18nConfig } from '../i18n'
import { catchError, checkArg, console, countKeys, findMissingKeys, ICONS, normalizeLocales, r, shapeMatches, sortKeys } from '../utils'

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
    const { config } = await resolveConfig(args)
    const { i18n, sources } = await loadI18nConfig(config)

    let locales = typeof args.locale === 'string' ? [args.locale] : args.locale || []
    locales = catchError(normalizeLocales)(locales, i18n)
    const localesToCheck = locales.length > 0 ? locales : i18n.locales

    const defaultLocaleJson = JSON.parse(fs.readFileSync(r(`${i18n.defaultLocale}.json`, i18n), { encoding: 'utf8' }))
    const keyCount = countKeys(defaultLocaleJson)

    console.log(ICONS.note, `Config path: ${path.dirname(sources[0])}\\\`${path.basename(sources[0])}\``)
    console.log(ICONS.note, `Locale${localesToCheck.length > 1 ? 's' : ''}: (\`${localesToCheck.length}\`) ${localesToCheck.map(l => `**${l}**`).join(', ')}`)
    console.log(ICONS.note, `Keys: \`${keyCount}\``)

    catchError(checkArg)(args.sort, ['abc', 'def'])

    let sortFn = sortKeys
    if (args.sort === 'abc') {
      console.log(ICONS.info, `Sorting locales **alphabetically**`)
    }
    else if (args.sort === 'def') {
      console.log(ICONS.info, `Sorting locales according to **default locale**`)
      sortFn = (obj: any) => sortKeys(obj, defaultLocaleJson)
    }
    else {
      return
    }

    for (const locale of localesToCheck) {
      const localeFilePath = r(`${locale}.json`, i18n)
      const localeJson = JSON.parse(fs.readFileSync(localeFilePath, { encoding: 'utf8' }))
      if (!shapeMatches(defaultLocaleJson, localeJson)) {
        const defaultLarger = keyCount > countKeys(localeJson)
        const missingKeys = defaultLarger ? findMissingKeys(defaultLocaleJson, localeJson) : findMissingKeys(localeJson, defaultLocaleJson)
        console.log(ICONS.warning, `Locale **${locale}** is not up to date. Skipping...`, c.dim(`(found ${defaultLarger ? 'missing' : 'extra'}: ${Object.keys(missingKeys)})`))
        continue
      }
      fs.writeFileSync(localeFilePath, JSON.stringify(sortFn(localeJson), null, 2), { encoding: 'utf8' })
    }

    console.log(ICONS.success, `Sorted locales: ${localesToCheck.map(l => `**${l}**`).join(', ')}`)
  },
})
