import type { Config, Models, Provider } from './types'
import process from 'node:process'

export const providers = [
  'openai',
  'anthropic',
  'google',
  'xai',
  'mistral',
  'groq',
  'cerebras',
  'azure',
] as const

export const integrations = [
  'i18next',
  'nextjs',
  'nuxt',
  'vue-i18n',
  'angular',
  'svelte',
  'ember-intl',
  'gatsby',
  'solid',
  'qwik',
  'astro',
  'astro-i18next',
  'remix',
] as const

export const DEFAULT_CONFIG = {
  locale: '',
  cwd: process.cwd(),
  debug: false,
  undo: true,

  context: '',
  integration: '',

  options: {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    apiKey: undefined,
    temperature: 0,
  },
} satisfies Config

export const availableModels: Models = {
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
    { value: 'claude-opus-4-0', alias: 'Claude 4 Opus' },
    { value: 'claude-sonnet-4-0', alias: 'Claude 4 Sonnet' },
    { value: 'claude-3-7-sonnet-latest', alias: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-sonnet-latest', alias: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-latest', alias: 'Claude 3.5 Haiku' },
  ],
  google: [
    { value: 'gemini-2.5-pro-preview-06-05', alias: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash-preview-05-20', alias: 'Gemini 2.5 Flash' },
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
  cerebras: [
    { value: 'qwen-3-32b', alias: 'Qwen 3 32B' },
    { value: 'deepseek-r1-distill-llama-70b', alias: 'DeepSeek R1 Distill Llama 70B' },
    { value: 'llama-4-scout-17b-16e-instruct', alias: 'Llama 4 Scout' },
    { value: 'llama3.1-8b', alias: 'Llama 3.1 8B' },
    { value: 'llama-3.3-70b', alias: 'Llama 3.3 70B' },
  ],
  azure: [
    { value: 'model-router', alias: 'Auto', mode: 'json', iq: 3, speed: 4 },
    { value: 'gpt-4.1', alias: 'GPT 4.1', mode: 'json', iq: 3, speed: 4 },
    { value: 'gpt-4.1-mini', alias: 'GPT 4.1 mini', mode: 'json', iq: 3, speed: 4 },
    { value: 'gpt-4.1-nano', alias: 'GPT 4.1 nano', mode: 'json', iq: 3, speed: 5 },
    { value: 'grok-3', alias: 'Grok 3', mode: 'json', iq: 4, speed: 4 },
    { value: 'grok-3-mini', alias: 'Grok 3 mini', mode: 'json', iq: 3, speed: 4 },
    { value: 'DeepSeek-R1-0528', alias: 'DeepSeek R1', mode: 'custom', iq: 4, speed: 1 },
    { value: 'DeepSeek-V3-0324', alias: 'DeepSeek V3', mode: 'custom', iq: 3, speed: 3 },
    { value: 'gpt-4o', alias: 'GPT 4o', mode: 'json', iq: 3, speed: 4 },
    { value: 'gpt-4o-mini', alias: 'GPT 4o mini', mode: 'json', iq: 2, speed: 4 },
    { value: 'Phi-4', alias: 'Phi 4', mode: 'json', iq: 3, speed: 2 },
  ],
} as const

export type ModelValue = (typeof availableModels)[Provider][number]['value']
export type ModelAlias = (typeof availableModels)[Provider][number]['alias']
