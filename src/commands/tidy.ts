import fs from 'node:fs'
import path from 'node:path'
import { defineCommand } from 'citty'
import c from 'picocolors'
import { commonArgs, resolveConfig } from '../config'
import { loadI18nConfig } from '../config/i18n'
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
    const { config, sources: configSources } = await resolveConfig(args)
    const { i18n, sources: i18nSources } = await loadI18nConfig(config as any)

    let locales = typeof args.locale === 'string' ? [args.locale] : args.locale || []
    locales = catchError(normalizeLocales)(locales, i18n)
    const localesToCheck = locales.length > 0 ? locales : i18n.locales

    if (configSources.length === 0)
      console.log(ICONS.error, `Lin config not found`)
    else
      console.log(ICONS.note, `Lin config path: ${path.dirname(configSources[0])}\\\`${path.basename(configSources[0])}\``)
    if (i18nSources.length === 0)
      console.log(ICONS.error, `I18n config not found`)
    else
      console.log(ICONS.note, `I18n config path: ${path.dirname(i18nSources[0])}\\\`${path.basename(i18nSources[0])}\``)

    const defaultLocaleJson = JSON.parse(fs.readFileSync(r(`${i18n.defaultLocale}.json`, i18n), { encoding: 'utf8' }))
    const defaultKeyCount = countKeys(defaultLocaleJson)

    console.log(ICONS.note, `Provider: \`${config.options.provider}\``)
    console.log(ICONS.note, `Model: \`${config.options.model}\``)
    if (config.options.temperature !== undefined)
      console.log(ICONS.note, `Temperature: \`${config.options.temperature}\``)

    console.log(ICONS.note, `Keys: \`${defaultKeyCount}\``)
    console.logL(ICONS.note, `Locale${localesToCheck.length > 1 ? 's' : ''} (\`${localesToCheck.length}\`): `)
    for (const locale of localesToCheck) {
      try {
        const localeJson = JSON.parse(fs.readFileSync(r(`${locale}.json`, i18n), { encoding: 'utf8' }))
        const keyCount = countKeys(localeJson)
        console.logL(`**${locale}** (\`${keyCount}\`) `)
      }
      catch {
        console.logL(c.red(`**${locale}**`), `(${ICONS.error}) `)
      }
    }
    console.log()

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

    const successfullySortedLocales: string[] = []
    for (const locale of localesToCheck) {
      const localeFilePath = r(`${locale}.json`, i18n)
      const localeJson = JSON.parse(fs.readFileSync(localeFilePath, { encoding: 'utf8' }))
      if (!shapeMatches(defaultLocaleJson, localeJson)) {
        const defaultLarger = defaultKeyCount > countKeys(localeJson)
        const missingKeys = defaultLarger ? findMissingKeys(defaultLocaleJson, localeJson) : findMissingKeys(localeJson, defaultLocaleJson)
        console.log(ICONS.warning, `Locale **${locale}** is not up to date. Skipping...`, c.dim(`(found ${defaultLarger ? 'missing' : 'extra'}: ${Object.keys(missingKeys)})`))
        continue
      }
      fs.writeFileSync(localeFilePath, `${JSON.stringify(sortFn(localeJson), null, 2)}\n`, { encoding: 'utf8' })
      successfullySortedLocales.push(locale)
    }

    if (successfullySortedLocales.length > 0)
      console.log(ICONS.success, `Sorted locales: ${successfullySortedLocales.map(l => `**${l}**`).join(', ')}`)
  },
})
