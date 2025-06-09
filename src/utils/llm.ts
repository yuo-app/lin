import type { AzureLLMProviderOptions, Config, ModelDefinition, Provider } from '../config'
import type { I18nConfig } from '../config/i18n'
import type { LocaleJson } from './locale'
import type { DeepRequired } from '@/types'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createAzure } from '@ai-sdk/azure'
import { createCerebras } from '@ai-sdk/cerebras'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createXai } from '@ai-sdk/xai'
import { confirm } from '@clack/prompts'
import { generateObject, type LanguageModelV1Middleware, wrapLanguageModel, zodSchema } from 'ai'
import { z } from 'zod'
import { availableModels, providers } from '../config'
import { console, formatLog, ICONS } from './console'
import { handleCliError } from './general'
import { normalizeLocales } from './locale'

function sanitizeJsonString(jsonString: string): string {
  let processedString = jsonString
  const thinkTagEnd = '</think>'
  const thinkIndex = processedString.lastIndexOf(thinkTagEnd)
  if (thinkIndex !== -1)
    processedString = processedString.substring(thinkIndex + thinkTagEnd.length)

  const match = processedString.match(/\{[\s\S]*\}/)
  if (match)
    processedString = match[0]

  try {
    const parsed = JSON.parse(processedString)
    return JSON.stringify(parsed)
  }
  catch {
    const cleaned = jsonString
      .replace(/^```json\s*|```\s*$/g, '')
      .replace(/^\s+|\s+$/g, '')
      .replace(/^[^{]*(\{.*\})[^}]*$/, '$1')
      .replace(/\/\/.*$/gm, '')
      .replace(/([^S\\])\\(?!["\\/bfnrtu])/g, '$1')

    return cleaned
  }
}

const jsonExtractionMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate }) => {
    const result = await doGenerate()

    if (result.text) {
      try {
        const cleaned = sanitizeJsonString(result.text)

        try {
          JSON.parse(cleaned)
          result.text = cleaned
        }
        catch {
          console.log(ICONS.warning, 'Initial sanitization failed, trying more aggressive approach')

          const match = result.text.match(/\{[\s\S]*\}/)
          if (match) {
            const jsonCandidate = match[0]
            try {
              const extractedObject = JSON.parse(jsonCandidate)
              result.text = JSON.stringify(extractedObject)
            }
            catch {
              console.log(ICONS.error, 'Failed to extract valid JSON even with aggressive approach')
            }
          }
        }
      }
      catch {
        console.log(ICONS.error, 'JSON sanitization failed unexpectedly')
      }
    }
    return result
  },
}

export function getWithLocales(withLocale: string | string[] | undefined, i18n: I18nConfig) {
  const withArgArray = typeof withLocale === 'string' ? [withLocale] : withLocale || []

  const localesToNormalize = withArgArray.filter(locale => locale !== '')
  const includeContext = localesToNormalize.length > 0

  if (localesToNormalize.length === 0)
    return { withLocales: [], includeContext }

  const normalizedWithLocales = normalizeLocales(localesToNormalize, i18n)
  return { withLocales: normalizedWithLocales, includeContext }
}

export async function deletionGuard(keyCountsBefore: Record<string, number>, keyCountsAfter: Record<string, number>, locales: string[]): Promise<boolean> {
  console.logL(ICONS.result)
  const negativeDiffs: Record<string, number> = {}
  for (const [index, locale] of Object.keys(keyCountsBefore).entries()) {
    const diff = keyCountsAfter[locale] - keyCountsBefore[locale]

    const isLast = index === locales.length - 1
    if (Object.keys(keyCountsBefore).length === 1 || isLast)
      console.logL(`${locale} (${diff > 0 ? '+' : ''}${diff})`)
    else
      console.logL(`${locale} (${diff > 0 ? '+' : ''}${diff}), `)

    if (diff < 0)
      negativeDiffs[locale] = diff
  }
  console.log()

  if (Object.keys(negativeDiffs).length > 0) {
    const result = await confirm({
      message: formatLog(`${ICONS.warning} This will remove ${Object.keys(negativeDiffs).map(l => `\`${-negativeDiffs[l]}\` keys from **${l}**`).join(', ')}. Continue?`),
      initialValue: false,
    })
    if (typeof result !== 'boolean' || !result)
      return false
  }
  return true
}

function getInstance(provider: Provider) {
  switch (provider) {
    case 'openai':
      return createOpenAI
    case 'anthropic':
      return createAnthropic
    case 'google':
      return createGoogleGenerativeAI
    case 'xai':
      return createXai
    case 'mistral':
      return createMistral
    case 'groq':
      return createGroq
    case 'cerebras':
      return createCerebras
    case 'azure':
      return createAzure
    default:
      handleCliError(`Unsupported provider: ${provider}`, `Supported providers are: ${providers.join(', ')}.`)
  }
}

const localeJsonSchema: z.ZodType<LocaleJson> = z.lazy(() =>
  z.record(z.string(), z.union([z.string(), localeJsonSchema])),
)

const translationSchema = z.record(z.string(), localeJsonSchema)

export async function translateKeys(
  keysToTranslate: Record<string, LocaleJson>,
  config: DeepRequired<Config>,
  i18n: I18nConfig,
  withLocaleJsons?: Record<string, LocaleJson>,
  includeContext?: boolean,
): Promise<Record<string, LocaleJson>> {
  const provider = config.options.provider
  const modelId = config.options.model
  if (!provider || !modelId)
    handleCliError(`Provider or modelId missing in config.options.`, [`Provider: ${provider}`, `Model: ${modelId}`])

  const providerFactory = getInstance(provider)

  const clientOptions: { apiKey?: string, [key: string]: any } = {}
  if (config.options.apiKey)
    clientOptions.apiKey = config.options.apiKey

  if (provider === 'azure') {
    const azureOptions = config.options as AzureLLMProviderOptions
    if (azureOptions.resourceName)
      clientOptions.resourceName = azureOptions.resourceName
    if (azureOptions.apiVersion)
      clientOptions.apiVersion = azureOptions.apiVersion
    if (azureOptions.baseURL)
      clientOptions.baseURL = azureOptions.baseURL
  }

  const providerClient = providerFactory(clientOptions)
  const model = providerClient.languageModel(modelId as string)

  const system = `For each locale, translate the values from the default locale (${i18n.defaultLocale}) language to the corresponding languages (denoted by the locale keys).
Return a JSON object where each top key is a locale, and the value is an object containing the translations for that locale.
${includeContext && config.context ? `Additional information from user: ${config.context}` : ''}
${withLocaleJsons && Object.keys(withLocaleJsons).length > 0 ? `Other locale JSONs from the user's codebase for context: ${JSON.stringify(withLocaleJsons)}\nAlways use dot notation when dealing with nested keys: ui.about.title` : ''}
Example input:
{"fr-FR": {"ui.home.title": "Home"}}
Example output:
{"fr-FR": {"ui.home.title": "Accueil"}}`

  const prompt = JSON.stringify(keysToTranslate)

  const modelDefinition = availableModels[provider as Provider]?.find(m => m.value === modelId) as ModelDefinition | undefined
  const mode = modelDefinition?.mode || config.options.mode || 'auto'
  const generateObjectMode = (mode === 'json' || mode === 'custom') ? 'json' : 'auto'

  let modelToUse = model
  if (mode === 'custom') {
    modelToUse = wrapLanguageModel({
      model,
      middleware: [jsonExtractionMiddleware],
    })
  }

  const { object: translatedJson } = await generateObject({
    model: modelToUse,
    schema: zodSchema(translationSchema, { useReferences: true }),
    system,
    prompt,
    temperature: config.options.temperature,
    maxTokens: config.options.maxTokens,
    topP: config.options.topP,
    frequencyPenalty: config.options.frequencyPenalty,
    presencePenalty: config.options.presencePenalty,
    seed: config.options.seed,
    mode: generateObjectMode,
  })

  if (config.debug)
    console.log('\n', ICONS.info, `System Prompt: ${system}`)
  if (config.debug)
    console.log('\n', ICONS.info, `Prompt: ${prompt}`)

  return translatedJson as Record<string, LocaleJson>
}
