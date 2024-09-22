import { defineCommand } from 'citty'
import { console, sortKeys } from '../utils/'

export default defineCommand({
  meta: {
    name: 'tidy',
    description: 'check everything is set up correctly, and sort locale jsons',
  },
  async run({ args: _args }) {
    const nestedObj = {
      c: {
        b: 2,
        a: 1,
      },
      b: [3, 1, 2],
      a: {
        z: 26,
        y: 25,
      },
    }

    const refObj = {
      a: {
        y: null,
        z: null,
      },
      b: null,
      c: {
        a: null,
        b: null,
      },
    }

    console.log(sortKeys(nestedObj))
    console.log(sortKeys(nestedObj, 'abc'))
    console.log(sortKeys(nestedObj, 'ref', refObj))
  },
})
