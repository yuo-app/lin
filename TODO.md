# TODO

- [ ] `translate` command
  - [x] Base functionality: translates all locales
  - [x] skip locale json files that are completely translated
  - [ ] if there is an incomplete local json, then the gpt will add the missing parts (still put everything in the context window)
  - [ ] Usage with `--manual [key]`: Prompts the user to enter the translation for each key in all the locales that are not yet translated. If a key is specified then all languages are prompted.
- [ ] `add` command (`lin add <key>`)
  - [ ] Default usage: Running `lin add <key>` prompts the user to enter the translation for the key in the default language. It is then automatically translated to all the locales and saved in the locale json files.
  - [ ] If a key already exists, show error and prompt to use `lin translate --manual [key]` instead.
  - [ ] Usage with `--locale`: Prompts the user to enter the translation for the key in the specified locale.
  - [ ] Usage with `--manual`: Prompts the user to enter the translation for the key for all the locales.
- [ ] `convert` command
- [ ] i18n loader
- [ ] support for other i18n integrations
