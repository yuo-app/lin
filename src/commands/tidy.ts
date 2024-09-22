import { defineCommand } from 'citty'
import { commonArgs } from '../config'
import { console, sortKeys } from '../utils/'

export default defineCommand({
  meta: {
    name: 'tidy',
    description: 'check everything is set up correctly, and sort locale jsons',
  },
  args: {
    ...commonArgs,
  },
  async run({ args: _args }) {
    // console.log(sortKeys(nestedObj))
  },
})
