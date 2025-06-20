# TODO

## v1.0.0

- [x] REFACTOR
- [x] support a ton of i18n frameworks
- [x] **`undo` command:** undo the last command, store prev file in .lin folder
- [x] support any LLM
- [x] model presets

## v1.1.0

- [x] key suggestions
- [x] better context management
- [x] **`check` command:** lint codebase for missing keys (compare to default locale json), `--fix` to add empty keys, `--remove-unused` to remove unused keys

## v2.0.0

- [x] **`sync` command:** rename old `translate` command to `sync`
- [x] **NEW `translate` command:** the e2e magic command: `check -f` + default locale values from t('key', 'default value') + `sync`
- [x] add github action example with `translate`
- [x] batch size config for how many locales to translate at once

## later

- [ ] vercel ai sdk v5
- [ ] custom llm system prompt:

  ```ts
  {
    system: (targetLocale, ...args) => `...`
    system: (targetLocale, ...args) => {
      switch (targetLocale) {
        case 'ko-KR':
          return `...`
        default:
          return `...`
      }
    }
  }
  ```

- [ ] config for llm reasoning tokens and reasoning effort
- [ ] `estimateTokens: boolean` config to enable/disable token estimation, show estimated tokens and ask before the llm call
- [ ] **`verify` command:** reflect on the quality of the translations, check if the translations are accurate
- [ ] **`convert` command:** convert a project to use i18n by extracting all the strings from the code and adding them to the locale json files.
