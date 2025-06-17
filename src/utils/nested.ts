import type { DeleteType, NestedKeyOf, NestedValueOf } from '@/types'

type NestedObject = Record<string | number, any>

export function findNestedKey<T extends NestedObject, K extends NestedKeyOf<T>>(
  obj: T,
  key: K,
) {
  const keys = key.split('.').map(k => !Number.isNaN(Number(k)) ? Number(k) : k)
  let current: any = obj
  const parents: any[] = []

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (!(k in current))
      current[k] = typeof keys[i + 1] === 'number' ? [] : {}

    parents.push(current)
    current = current[k]
  }

  const lastKey = keys[keys.length - 1]

  return {
    value: current[lastKey] as NestedValueOf<T, K>,
    delete: (): DeleteType<T, K> => {
      delete current[lastKey]
      return obj as DeleteType<T, K>
    },
  }
}

export function findNestedValue(obj: any, path: string): any {
  if (!path)
    return obj

  let current = obj
  for (const part of path.split('.')) {
    if (typeof current === 'object' && current !== null && Object.prototype.hasOwnProperty.call(current, part))
      current = current[part]
    else
      return undefined
  }
  return current
}

export function countKeys(obj: NestedObject): number {
  let count = 0

  for (const key of Object.keys(obj)) {
    count++

    const value = obj[key]
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null && !Array.isArray(item))
            count += countKeys(item)
        }
      }
      else {
        count += countKeys(value)
      }
    }
  }

  return count
}

export function sortKeys(obj: NestedObject, refObj?: NestedObject): NestedObject {
  if (typeof obj !== 'object' || obj === null)
    return obj

  if (Array.isArray(obj))
    return obj.map(item => sortKeys(item, undefined))

  const sortedKeys = Object.keys(obj).sort((a, b) => {
    if (refObj === undefined) {
      return a.localeCompare(b)
    }
    else {
      const aInRef = a in refObj
      const bInRef = b in refObj

      if (aInRef && bInRef) {
        const refKeysList = Object.keys(refObj)
        return refKeysList.indexOf(a) - refKeysList.indexOf(b)
      }
      else if (aInRef) {
        return -1
      }
      else if (bInRef) {
        return 1
      }
      else {
        return a.localeCompare(b)
      }
    }
  })

  const sortedObj: NestedObject = {}
  for (const key of sortedKeys) {
    if (refObj && typeof obj[key] === 'object' && obj[key] !== null && typeof refObj[key] === 'object' && refObj[key] !== null)
      sortedObj[key] = sortKeys(obj[key], refObj[key])

    else if (typeof obj[key] === 'object' && obj[key] !== null)
      sortedObj[key] = sortKeys(obj[key])

    else
      sortedObj[key] = obj[key]
  }

  return sortedObj
}

export function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
  return Object.keys(obj).flatMap((key) => {
    const newKey = prefix ? `${prefix}.${key}` : key
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]))
      return [newKey, ...getAllKeys(obj[key], newKey)]

    return [newKey]
  })
}
