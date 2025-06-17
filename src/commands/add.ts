import type { LocaleJson } from '@/utils'
import fs from 'node:fs'
import { text } from '@clack/prompts'
import { defineCommand } from 'citty'
import { allArgs, resolveConfig } from '@/config'
import {
  catchError,
  console,
  countKeys,
  deletionGuard,
  findNestedKey,
  getWithLocales,
  ICONS,
  mergeMissingTranslations,
  normalizeLocales,
  provideSuggestions,
  r,
  translateKeys,
} from '@/utils'
import { saveUndoState } from '@/utils/undo'

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
    const i18n = config.i18n

    const key = args.key as string
    const positionalArgs = [...(args._ as string[])]
    positionalArgs.shift()
    let translation = positionalArgs.join(' ')
    const translationProvided = positionalArgs.length > 0

    const defaultLocaleJson = JSON.parse(fs.readFileSync(r(`${i18n.defaultLocale}.json`, i18n), { encoding: 'utf8' }))

    if (key.endsWith('.')) {
      provideSuggestions(defaultLocaleJson, key)
      return
    }

    if (!translationProvided) {
      const suggested = provideSuggestions(defaultLocaleJson, key, { suggestOnExact: true })
      if (suggested) {
        return
      }
      else {
        const promptValue = await text({
          message: `Enter ${i18n.defaultLocale} translation for key \`${key}\``,
          placeholder: 'Press [ENTER] to skip',
        })

        if (typeof promptValue === 'symbol' || promptValue === undefined || promptValue === '')
          return

        translation = promptValue
      }
    }

    let locales = typeof args.locale === 'string' ? [args.locale] : args.locale || []
    locales = catchError(normalizeLocales)(locales, i18n)
    const localesToCheck = locales.length > 0 ? locales : i18n.locales

    const { withLocales, includeContext } = getWithLocales(args.with, i18n)
    const withLocaleJsons: Record<string, LocaleJson> = {}
    for (const locale of withLocales)
      withLocaleJsons[locale] = JSON.parse(fs.readFileSync(r(`${locale}.json`, i18n), { encoding: 'utf8' }))

    if (withLocales.length > 0)
      console.log(ICONS.info, `With: ${withLocales.map(l => `**${l}**`).join(', ')}`)

    if (args.debug) {
      console.log(ICONS.note, `Provider: \`${config.options.provider}\``)
      console.log(ICONS.note, `Model: \`${config.options.model}\``)
      if (config.options.temperature !== undefined)
        console.log(ICONS.note, `Temperature: \`${config.options.temperature}\``)
    }

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
        keysToTranslate[locale] = { [args.key]: translation }
      keysToTranslateAndDefault[locale] = { [args.key]: translation }
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

      saveUndoState(Object.keys(translationsToWrite), config as any)
      for (const localePath of Object.keys(translationsToWrite))
        fs.writeFileSync(localePath, `${JSON.stringify(translationsToWrite[localePath], null, 2)}\n`, { encoding: 'utf8' })
    }
    else {
      console.log(ICONS.success, 'All locales are up to date.')
      console.log(ICONS.note, `Keys: ${countKeys(JSON.parse(fs.readFileSync(r(`${i18n.defaultLocale}.json`, i18n), { encoding: 'utf8' })))}`)
    }
  },
})
