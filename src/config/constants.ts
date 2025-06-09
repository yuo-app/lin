import type { Config, Models, Provider } from './types'
import process from 'node:process'

export const providers = [
  'openai',
  'anthropic',
  'google',
  'xai',
  'mistral',
  'groq',
  'azure',
] as const

export const integrations = [
  'i18n',
  'i18next',
  'astro',
  'astro-routing',
  'nextjs',
  'vue-i18n',
  '@nuxtjs/i18n',
  'sveltekit-i18n',
] as const

export const DEFAULT_CONFIG = {
  locale: '',
  cwd: process.cwd(),
  debug: false,

  context: '',
  integration: 'i18n',

  options: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: undefined,
    temperature: 0,
  },
} satisfies Config

export const availableModels = {
  openai: [
    { value: 'gpt-4.1', alias: 'GPT 4.1' },
    { value: 'gpt-4.1-mini', alias: 'GPT 4.1 mini' },
    { value: 'gpt-4.1-nano', alias: 'GPT 4.1 nano' },
    { value: 'o4-mini', alias: 'o4 mini' },
    { value: 'o3', alias: 'o3' },
    { value: 'o3-mini', alias: 'o3 mini' },
    { value: 'gpt-4o', alias: 'GPT 4o' },
    { value: 'gpt-4o-mini', alias: 'GPT 4o mini' },
  ],
  anthropic: [
    { value: 'claude-3-7-sonnet-latest', alias: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-sonnet-latest', alias: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-latest', alias: 'Claude 3.5 Haiku' },
  ],
  google: [
    { value: 'gemini-2.5-pro-exp-05-06', alias: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash-preview-04-17', alias: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.0-flash', alias: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', alias: 'Gemini 2.0 Flash Lite' },
  ],
  xai: [
    { value: 'grok-3', alias: 'Grok 3' },
    { value: 'grok-3-mini', alias: 'Grok 3 mini' },
    { value: 'grok-3-fast', alias: 'Grok 3 fast' },
    { value: 'grok-3-mini-fast', alias: 'Grok 3 mini fast' },
  ],
  mistral: [
    { value: 'mistral-large-latest', alias: 'Mistral Large' },
    { value: 'mistral-small-latest', alias: 'Mistral Small' },
    { value: 'open-mixtral-8x22b', alias: 'Open Mixtral 8x22B' },
    { value: 'open-mixtral-8x7b', alias: 'Open Mixtral 8x7B' },
    { value: 'open-mistral-7b', alias: 'Open Mistral 7B' },
  ],
  groq: [
    { value: 'deepseek-r1-distill-llama-70b', alias: 'DeepSeek R1 Distill Llama 70B' },
    { value: 'qwen-qwq-32b', alias: 'QwQ 32B' },
    { value: 'meta-llama/llama-4-maverick-17b-128e-instruct', alias: 'Llama 4 Maverick' },
    { value: 'meta-llama/llama-4-scout-17b-16e-instruct', alias: 'Llama 4 Scout' },
    { value: 'llama-3.3-70b-versatile', alias: 'Llama 3.3 70B' },
    { value: 'llama-3.1-8b-instant', alias: 'Llama 3.1 8B Instant' },
    { value: 'gemma2-9b-it', alias: 'Gemma2 9B IT' },
  ],
  azure: [], // Azure models are deployment-specific, user provides deployment name as model
} as const satisfies Models

export type ModelValue = (typeof availableModels)[Provider][number]['value']
export type ModelAlias = (typeof availableModels)[Provider][number]['alias']
