import type { LocaleJson } from '@/utils'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { confirm } from '@clack/prompts'
import { defineCommand } from 'citty'
import { glob } from 'glob'
import * as i18nextParser from 'i18next-parser'
import c from 'picocolors'
import { commonArgs, resolveConfig } from '@/config'
import { loadI18nConfig } from '@/config/i18n'
import {
  catchError,
  checkArg,
  cleanupEmptyObjects,
  console,
  countKeys,
  findMissingKeys,
  findNestedKey,
  getAllKeys,
  ICONS,
  mergeMissingTranslations,
  normalizeLocales,
  r,
  saveUndoState,
  shapeMatches,
  sortKeys,
} from '@/utils'

export default defineCommand({
  meta: {
    name: 'check',
    description: 'validate locale files and optionally fix missing keys or sort them',
  },
  args: {
    ...commonArgs,
    'silent': {
      alias: 'S',
      type: 'boolean',
      description: 'show minimal, script-friendly output',
      default: false,
    },
    'sort': {
      alias: 's',
      type: 'string',
      description: 'sort the locales alphabetically or according to the default locale',
      required: false,
      valueHint: 'abc | def',
    },
    'keys': {
      alias: 'k',
      type: 'boolean',
      description: 'check for missing keys in other locales compared to the default locale',
      default: false,
    },
    'remove-unused': {
      alias: 'r',
      type: 'boolean',
      description: 'remove unused keys from all locales',
      default: false,
    },
    'fix': {
      alias: 'f',
      type: 'boolean',
      description: 'add missing keys with empty string values instead of erroring',
      default: false,
    },
    'info': {
      alias: 'i',
      type: 'boolean',
      description: 'show detailed info about config and locales',
      default: false,
    },
  },
  async run({ args }) {
    const { config, sources: configSources } = await resolveConfig(args)
    const { i18n, sources: i18nSources } = await loadI18nConfig(config as any)

    let locales = typeof args.locale === 'string' ? [args.locale] : args.locale || []
    locales = catchError(normalizeLocales)(locales, i18n)
    const localesToCheck = locales.length > 0 ? locales : i18n.locales

    const defaultLocaleJson = JSON.parse(fs.readFileSync(r(`${i18n.defaultLocale}.json`, i18n), { encoding: 'utf8' }))
    const defaultKeyCount = countKeys(defaultLocaleJson)

    if (args.info) {
      if (configSources.length === 0)
        console.log(ICONS.error, 'Lin config not found')
      else
        console.log(ICONS.note, `Lin config path: ${path.dirname(configSources[0])}\\\`${path.basename(configSources[0])}\``)

      if (i18nSources.length === 0)
        console.log(ICONS.error, 'I18n config not found')
      else
        console.log(ICONS.note, `I18n config path: ${path.dirname(i18nSources[0])}\\\`${path.basename(i18nSources[0])}\``)

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
      return
    }

    checkArg(args.sort, ['abc', 'def'])
    if (args.sort) {
      let sortFn = sortKeys
      if (args.sort === 'def')
        sortFn = (obj: any) => sortKeys(obj, defaultLocaleJson)

      console.log(ICONS.info, `Sorting locales ${args.sort === 'abc' ? '**alphabetically**' : 'according to **default locale**'}`)

      const successfullySortedLocales: string[] = []
      const filesToModify = localesToCheck.filter(locale => fs.existsSync(r(`${locale}.json`, i18n))).map(locale => r(`${locale}.json`, i18n))
      saveUndoState(filesToModify, config as any)

      for (const locale of localesToCheck) {
        const localeFilePath = r(`${locale}.json`, i18n)
        if (!fs.existsSync(localeFilePath))
          continue
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
      return
    }

    if (args.keys) {
      const missingKeysByLocale: Record<string, LocaleJson> = {}

      for (const locale of localesToCheck) {
        const localePath = r(`${locale}.json`, i18n)
        let localeJson: LocaleJson
        try {
          localeJson = JSON.parse(fs.readFileSync(localePath, { encoding: 'utf8' }))
        }
        catch (error: any) {
          if (error.code === 'ENOENT') {
            console.log(ICONS.error, `File not found for locale **${locale}**.`)
            localeJson = {}
          }
          else { throw error }
        }

        const missingKeys = findMissingKeys(defaultLocaleJson, localeJson)
        if (Object.keys(missingKeys).length > 0)
          missingKeysByLocale[locale] = missingKeys
      }

      if (Object.keys(missingKeysByLocale).length === 0) {
        console.log(ICONS.success, 'All locales are up to date.')
        return
      }

      for (const [locale, missing] of Object.entries(missingKeysByLocale)) {
        console.log(ICONS.warning, `Locale **${locale}** is missing \`${Object.keys(missing).length}\` keys`)
        if (!args.fix) {
          const sample = Object.keys(missing).slice(0, 10)
          if (sample.length > 0)
            console.log(ICONS.note, `Samples: ${sample.map(k => `\`${k}\``).join(', ')}${Object.keys(missing).length > sample.length ? '...' : ''}`)
        }
      }

      if (!args.fix) {
        console.log(ICONS.error, 'Missing keys detected. Run with --fix to add empty keys.')
        process.exitCode = 1
        return
      }

      console.log(ICONS.info, 'Adding missing keys with empty values...')

      const filesToWrite: Record<string, LocaleJson> = {}
      const keyCountsBefore: Record<string, number> = {}
      const keyCountsAfter: Record<string, number> = {}

      for (const [locale, missing] of Object.entries(missingKeysByLocale)) {
        const localePath = r(`${locale}.json`, i18n)
        let existing: LocaleJson = {}
        try {
          existing = JSON.parse(fs.readFileSync(localePath, { encoding: 'utf8' }))
        }
        catch (error: any) {
          if (error.code !== 'ENOENT')
            throw error
        }

        keyCountsBefore[locale] = countKeys(existing)

        const missingEmpty: LocaleJson = {}
        for (const key of Object.keys(missing))
          missingEmpty[key] = ''

        const merged = mergeMissingTranslations(existing, missingEmpty)
        filesToWrite[localePath] = merged
        keyCountsAfter[locale] = countKeys(merged)
      }

      saveUndoState(Object.keys(filesToWrite), config as any)
      for (const [filePath, content] of Object.entries(filesToWrite))
        fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`, { encoding: 'utf8' })

      console.log(ICONS.success, 'Missing keys added successfully.')
      return
    }

    if (!args.silent)
      console.log(ICONS.info, 'Checking for missing and unused keys in the codebase...')

    const { parser: Parser } = i18nextParser
    const parser = new Parser({
      ...config.parser,
      locales: i18n.locales,
      output: r(i18n.directory, i18n),
    })

    const files = await glob(config.parser.input, { cwd: config.cwd, absolute: true })

    let usedKeysInCode: string[] = []
    const parsingTask = async () => {
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8')
        const keysFromFile = parser.parse(content, file)
        usedKeysInCode.push(...keysFromFile.map((k: any) => k.key))
      }
    }

    if (args.silent)
      await parsingTask()
    else
      await console.loading('Parsing source files...', parsingTask)

    usedKeysInCode = [...new Set(usedKeysInCode)]

    const allLocaleKeys = getAllKeys(defaultLocaleJson)
    const missingKeys = usedKeysInCode.filter(key => !allLocaleKeys.includes(key))
    const unusedKeys = allLocaleKeys.filter(key => !usedKeysInCode.includes(key))

    let hasIssues = false
    if (missingKeys.length > 0) {
      hasIssues = true
      if (args.silent) {
        console.log(`Missing keys: ${missingKeys.length}`)
      }
      else {
        console.log(ICONS.warning, `Found \`${missingKeys.length}\` missing keys in default locale`)
        const sample = missingKeys.slice(0, 10)
        if (sample.length > 0)
          console.log(ICONS.note, `Samples: ${sample.map(k => `\`${k}\``).join(', ')}${missingKeys.length > sample.length ? '...' : ''}`)
      }
    }

    if (unusedKeys.length > 0) {
      hasIssues = true
      if (args.silent) {
        console.log(`Unused keys: ${unusedKeys.length}`)
      }
      else {
        console.log(ICONS.warning, `Found \`${unusedKeys.length}\` unused keys in default locale`)
        const sample = unusedKeys.slice(0, 10)
        if (sample.length > 0)
          console.log(ICONS.note, `Samples: ${sample.map(k => `\`${k}\``).join(', ')}${unusedKeys.length > sample.length ? '...' : ''}`)
      }
    }

    if (!hasIssues) {
      if (!args.silent)
        console.log(ICONS.success, 'All keys are in sync.')
      return
    }

    if (args.fix && missingKeys.length > 0) {
      if (!args.silent)
        console.log(ICONS.info, 'Adding missing keys with empty values to default locale...')
      const missingEmpty: LocaleJson = {}
      for (const key of missingKeys)
        missingEmpty[key] = ''

      const defaultLocalePath = r(`${i18n.defaultLocale}.json`, i18n)
      const merged = mergeMissingTranslations(defaultLocaleJson, missingEmpty)
      saveUndoState([defaultLocalePath], config as any)
      fs.writeFileSync(defaultLocalePath, `${JSON.stringify(merged, null, 2)}\n`, { encoding: 'utf8' })
      if (!args.silent)
        console.log(ICONS.success, 'Missing keys added successfully.')
    }

    if (args['remove-unused'] && unusedKeys.length > 0) {
      const result = args.silent
        ? true
        : await confirm({
            message: (`${ICONS.warning} This will remove ${c.cyan(`${unusedKeys.length}`)} unused keys from all locales. Continue?`),
            initialValue: false,
          })
      if (result) {
        if (!args.silent)
          console.log(ICONS.info, 'Removing unused keys from all locales...')
        const filesToModify = i18n.locales.map(locale => r(`${locale}.json`, i18n))
        saveUndoState(filesToModify, config as any)

        for (const locale of i18n.locales) {
          const localePath = r(`${locale}.json`, i18n)
          if (!fs.existsSync(localePath))
            continue
          const localeJson = JSON.parse(fs.readFileSync(localePath, { encoding: 'utf8' }))
          for (const key of unusedKeys) {
            const nested = findNestedKey(localeJson, key)
            if (nested.value !== undefined)
              nested.delete()
          }
          cleanupEmptyObjects(localeJson)
          fs.writeFileSync(localePath, `${JSON.stringify(localeJson, null, 2)}\n`, { encoding: 'utf8' })
        }
        if (!args.silent)
          console.log(ICONS.success, 'Unused keys removed successfully.')
      }
    }

    if (hasIssues && !args.fix && !args['remove-unused']) {
      if (args.silent)
        console.log('Key issues detected. Run with --fix to add missing keys or --remove-unused to delete them.')
      else
        console.log(ICONS.error, 'Key issues detected. Run with --fix to add missing keys or --remove-unused to delete them.')
      process.exitCode = 1
    }
  },
})
