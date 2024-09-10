export interface I18nConfig {
  locales: string[]
  default: string
  directory: string
}

export function loadI18nConfig(): I18nConfig {
  return {
    locales: ['en-US', 'hu-HU', 'ko-KR', 'zh-CN'],
    default: 'en-US',
    directory: './locales',
  }
}
