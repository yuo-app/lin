declare module 'i18next-parser' {
  interface ParserOptions {
    [key: string]: any
  }

  interface ParsedKey {
    key: string
    [key: string]: any
  }

  export class Parser {
    constructor(options?: ParserOptions)
    parse(content: string, filename: string): ParsedKey[]
  }

  export const parser: typeof Parser
}
