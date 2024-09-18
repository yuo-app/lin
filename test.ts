type Primitive = string | number | boolean | null | undefined

type NestedKeyOf<T> = T extends Primitive
  ? never
  : T extends any[]
    ? never
    : {
        [K in keyof T & (string | number)]: K extends string | number
          ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
          : never;
      }[keyof T & (string | number)]

type NestedValueOf<T, K extends string> = K extends keyof T
  ? T[K]
  : K extends `${infer F}.${infer R}`
    ? F extends keyof T
      ? NestedValueOf<T[F], R>
      : never
    : never

type SetType<T, K extends string, V> = K extends keyof T
  ? Omit<T, K> & Record<K, V>
  : K extends `${infer F}.${infer R}`
    ? F extends keyof T
      ? Omit<T, F> & Record<F, SetType<T[F], R, V>>
      : T
    : T

type DeleteType<T, K extends string> = K extends keyof T
  ? Omit<T, K>
  : K extends `${infer F}.${infer R}`
    ? F extends keyof T
      ? Omit<T, F> & Record<F, DeleteType<T[F], R>>
      : T
    : T

export function nestedKeyOperations<T extends Record<string | number, any>, K extends NestedKeyOf<T>>(
  obj: T,
  key: K,
) {
  const keys = key.split('.').map(k => !Number.isNaN(Number(k)) ? Number(k) : k)
  let current: any = obj
  const parents: any[] = []

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (!(k in current)) {
      current[k] = typeof keys[i + 1] === 'number' ? [] : {}
    }
    parents.push(current)
    current = current[k]
  }

  const lastKey = keys[keys.length - 1]

  return {
    value: current[lastKey] as NestedValueOf<T, K>,
    set: <V extends NestedValueOf<T, K>>(newValue: V): SetType<T, K, V> => {
      current[lastKey] = newValue
      return obj as SetType<T, K, V>
    },
    delete: (): DeleteType<T, K> => {
      delete current[lastKey]
      return obj as DeleteType<T, K>
    },
  }
}

// Example usage
const obj = {
  error: {
    500: {
      title: 'Internal Server Error',
      message: 'Something went wrong',
    },
    404: {
      title: 'Not Found',
    },
  },
  success: {
    message: 'Operation successful',
  },
}

const before = nestedKeyOperations(obj, 'fail.message')
const after = before.set('Success!')
const test = nestedKeyOperations(after, 'fail.message')

console.log('after:', after)
console.log('test:', test.value)
