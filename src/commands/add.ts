import fs from 'node:fs/promises'
import process from 'node:process'
import { text } from '@clack/prompts'
import { defineCommand } from 'citty'
import OpenAI from 'openai'
import { commonArgs, resolveConfig } from '../config'
import { loadI18nConfig } from '../i18n'
import {
  r,
  setNestedKey,
} from '../utils'

export default defineCommand({
  meta: {
    name: 'add',
    description: 'add a key to the locales with all the translations',
  },
  args: {
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
    locale: {
      alias: 'l',
      type: 'string',
      description: 'translate only the specified locale',
    },
    force: {
      alias: 'f',
      type: 'boolean',
      description: 'force add key overriding existing ones',
      default: false,
    },
    ...commonArgs,
  },
  async run({ args }) {
    const { config } = await resolveConfig(args)
    const i18n = loadI18nConfig()

    args._.shift() // remove the key
    let prompt: string | symbol

    if (args._.length === 0) {
      prompt = await text({
        message: `Enter ${i18n.default} translation for key ${args.key}`,
        placeholder: 'Press [ENTER] to skip',
      })

      if (typeof prompt === 'symbol')
        return
    }
    else {
      prompt = args._.join(' ')
    }

    for (const locale of i18n.locales) {
      const localeFilePath = r(`${locale}.json`, i18n)
      const localeJson = JSON.parse(await fs.readFile(localeFilePath, { encoding: 'utf8' }))
      let translation = prompt

      const openai = new OpenAI({ apiKey: process.env[config.env] })
      if (locale !== i18n.default) {
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a simple translator API that translates text from ${i18n.default} to ${locale}.
You are given a key which provides important context, and the text to translate.
Return a JSON object with just the translated text, so omit the key.`,
            },
            {
              role: 'user',
              content: `{"key": "${args.key}", "text": "${prompt}"}`,
            },
          ],
          ...config.options,
          response_format: { type: 'json_object' },
        })

        let content
        try {
          content = JSON.parse(completion.choices[0].message.content || '{}').text
        }
        catch {
          throw new Error('Error while translating text')
        }

        if (typeof content !== 'string')
          throw new Error('Error while translating text')

        translation = content
      }

      setNestedKey(localeJson, args.key, translation)
      await fs.writeFile(localeFilePath, JSON.stringify(localeJson, null, 2), { encoding: 'utf8' })
    }
  },
})
