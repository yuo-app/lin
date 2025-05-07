import fs from 'node:fs'
import process from 'node:process'
import { text } from '@clack/prompts'
import { defineCommand } from 'citty'
import { allArgs, resolveConfig } from '../config'
import { loadI18nConfig } from '../i18n'
import {
  catchError,
  console,
  countKeys,
  deletionGuard,
  findNestedKey,
  getWithLocales,
  ICONS,
  type LocaleJson,
  mergeMissingTranslations,
  normalizeLocales,
  r,
  translateKeys,
} from '../utils'

export default defineCommand({
  meta: {
    name: 'add',
    description: 'add a key to the locales with all the translations',
  },
  args: {
    ...allArgs,
    key: {
      type: 'positional',
      description: 'the key to add',
      required: true,
      valueHint: 'a.b.c',
    },
    translation: {
      type: 'positional',
      description: 'the text of the key for the default locale',
      required: false,
      valueHint: 'some translation text',
    },
    force: {
      alias: 'f',
      type: 'boolean',
      description: 'force add key overriding existing ones',
      default: false,
    },
    with: {
      alias: 'w',
      type: 'string',
      description: 'add a locale json to the context window',
    },
  },
  async run({ args }) {
    const { config } = await resolveConfig(args)
    const { i18n } = await loadI18nConfig(config)

    let locales = typeof args.locale === 'string' ? [args.locale] : args.locale || []
    locales = catchError(normalizeLocales)(locales, i18n)
    const localesToCheck = locales.length > 0 ? locales : i18n.locales

    args._.shift() // remove the key
    let prompt: string | symbol

    if (args._.length === 0) {
      prompt = await text({
        message: `Enter ${i18n.defaultLocale} translation for key ${args.key}`,
        placeholder: 'Press [ENTER] to skip',
      })

      if (typeof prompt === 'symbol' || prompt === undefined)
        return
    }
    else {
      prompt = args._.join(' ')
    }

    const { withLocales, includeContext } = getWithLocales(args.with, i18n)
    const withLocaleJsons: Record<string, LocaleJson> = {}
    for (const locale of withLocales)
      withLocaleJsons[locale] = JSON.parse(fs.readFileSync(r(`${locale}.json`, i18n), { encoding: 'utf8' }))

    if (withLocales.length > 0)
      console.log(ICONS.info, `With: ${withLocales.map(l => `**${l}**`).join(', ')}`)

    const keyCountsBefore: Record<string, number> = {}
    const keyCountsAfter: Record<string, number> = {}
    const keysToTranslate: Record<string, LocaleJson> = {}
    const keysToTranslateAndDefault: Record<string, LocaleJson> = {}
    const translationsToWrite: Record<string, LocaleJson> = {}
    const toOverwrite: string[] = []
    for (const locale of localesToCheck) {
      let localeJson: LocaleJson
      try {
        localeJson = JSON.parse(fs.readFileSync(r(`${locale}.json`, i18n), { encoding: 'utf8' }))
      }
      catch (error: any) {
        if (error.code === 'ENOENT') {
          console.log(ICONS.warning, `File not found for locale **${locale}**. Creating a new one.`)
          localeJson = {}
        }
        else {
          throw error
        }
      }

      if (findNestedKey(localeJson, args.key).value !== undefined) {
        if (args.force) {
          toOverwrite.push(locale)
        }
        else {
          console.log(ICONS.info, `Skipped: **${locale}**`)
          continue
        }
      }

      if (locale !== i18n.defaultLocale)
        keysToTranslate[locale] = { [args.key]: prompt }
      keysToTranslateAndDefault[locale] = { [args.key]: prompt }
      keyCountsBefore[locale] = countKeys(localeJson)
    }

    if (toOverwrite.length > 0)
      console.log(ICONS.info, `Overwriting translation for locale${toOverwrite.length > 1 ? 's' : ''}: ${toOverwrite.map(l => `**${l}**`).join(', ')}`)

    if (args.debug)
      console.log(ICONS.info, `To translate: ${JSON.stringify(keysToTranslate)}`)

    if (Object.keys(keysToTranslateAndDefault).length > 0) {
      await console.loading(`Adding \`${args.key}\` to ${Object.keys(keysToTranslateAndDefault).map(l => `**${l}**`).join(', ')}`, async () => {
        const translations = Object.keys(keysToTranslate).length > 0
          ? await translateKeys(keysToTranslate, config, i18n, withLocaleJsons, includeContext)
          : {}

        translations[i18n.defaultLocale] = keysToTranslateAndDefault[i18n.defaultLocale]

        if (args.debug)
          console.log(ICONS.info, `Translations: ${JSON.stringify(translations)}`)

        for (const [locale, newTranslations] of Object.entries(translations)) {
          const localeFilePath = r(`${locale}.json`, i18n)

          let existingTranslations = {}
          try {
            existingTranslations = JSON.parse(fs.readFileSync(localeFilePath, { encoding: 'utf8' }))
          }
          catch (error: any) {
            if (error.code !== 'ENOENT')
              throw error
          }

          const finalTranslations = mergeMissingTranslations(existingTranslations, newTranslations)
          translationsToWrite[localeFilePath] = finalTranslations
          keyCountsAfter[locale] = countKeys(finalTranslations)
        }
      })

      console.log(ICONS.note, `Keys: ${keyCountsAfter[i18n.defaultLocale]}`)

      const result = await deletionGuard(keyCountsBefore, keyCountsAfter, locales)
      if (!result)
        return

      for (const localePath of Object.keys(translationsToWrite))
        fs.writeFileSync(localePath, JSON.stringify(translationsToWrite[localePath], null, 2), { encoding: 'utf8' })
    }
    else {
      console.log(ICONS.success, 'All locales are up to date.')
      console.log(ICONS.note, `Keys: ${countKeys(JSON.parse(fs.readFileSync(r(`${i18n.defaultLocale}.json`, i18n), { encoding: 'utf8' })))}`)
    }
  },
})
