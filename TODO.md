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

## later

- [ ] `estimateTokens: boolean` config to enable/disable token estimation, show estimated tokens and ask before the llm call
- [ ] **`verify` command:** reflect on the quality of the translations, check if the translations are accurate
- [ ] **`convert` command:** convert a project to use i18n by extracting all the strings from the code and adding them to the locale json files.
