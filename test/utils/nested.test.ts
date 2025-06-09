import { describe, expect, it } from 'vitest'
import { countKeys, findNestedKey, sortKeys } from '@/utils/nested'

describe('nested utils', () => {
  describe('findNestedKey', () => {
    it('should find a top-level key', () => {
      const obj = { a: 1, b: 2 }
      const result = findNestedKey(obj, 'a')
      expect(result.value).toBe(1)
    })

    it('should find a nested key', () => {
      const obj = { a: { b: { c: 3 } } }
      const result = findNestedKey(obj, 'a.b.c')
      expect(result.value).toBe(3)
    })

    it('should find a key in an array', () => {
      const obj = { a: [{ b: 4 }, { b: 5 }] }
      const result = findNestedKey(obj, 'a.1.b')
      expect(result.value).toBe(5)
    })

    it('should create intermediate objects if key does not exist', () => {
      const obj = { a: 1 }
      const result = findNestedKey(obj as any, 'b.c.d')
      expect(result.value).toBeUndefined()
      expect((obj as any).b.c.d).toBeUndefined()
    })

    it('should create intermediate arrays if key part is a number and does not exist', () => {
      const obj = { a: 1 }
      const result = findNestedKey(obj as any, 'b.0.c')
      expect(result.value).toBeUndefined()
      expect(Array.isArray((obj as any).b)).toBe(true)
      expect((obj as any).b[0].c).toBeUndefined()
    })

    it('should delete a top-level key', () => {
      const obj = { a: 1, b: 2 }
      const result = findNestedKey(obj, 'a')
      const updatedObj = result.delete()
      expect(updatedObj).toEqual({ b: 2 })
      expect(obj).toEqual({ b: 2 }) // Original object should be mutated
    })

    it('should delete a nested key', () => {
      const obj = { a: { b: { c: 3, d: 4 } } }
      const result = findNestedKey(obj, 'a.b.c')
      const updatedObj = result.delete()
      expect(updatedObj).toEqual({ a: { b: { d: 4 } } })
      expect(obj).toEqual({ a: { b: { d: 4 } } })
    })

    it('should delete a key within an array (by index)', () => {
      const obj = { a: [{ b: 1 }, { c: 2 }] }
      // Note: Deleting from an array like this will leave a 'hole' (sparse array) or shift elements
      // depending on the underlying JS engine behavior for delete on array indices.
      // The current implementation of findNestedKey uses 'delete', which creates sparse arrays.
      const result = findNestedKey(obj, 'a.0')
      const updatedObj = result.delete()
      const expected: any = { a: [] }
      expected.a[1] = { c: 2 } // Simulating sparse array
      expect(updatedObj).toEqual(expected)
      expect(obj.a.length).toBe(2) // Length remains same, but item at index 0 is undefined
      expect(obj.a[0]).toBeUndefined()
      expect(obj.a[1]).toEqual({ c: 2 })
    })

    it('should handle deleting a non-existent key gracefully', () => {
      const obj = { a: 1 }
      const result = findNestedKey(obj as any, 'b.c') // b.c will be created
      const updatedObj = result.delete() // then c will be deleted
      expect(updatedObj).toEqual({ a: 1, b: {} })
      expect(obj).toEqual({ a: 1, b: {} })
    })
  })

  describe('countKeys', () => {
    it('should count keys in a flat object', () => {
      const obj = { a: 1, b: 2, c: 3 }
      expect(countKeys(obj)).toBe(3)
    })

    it('should count keys in a nested object', () => {
      const obj = { a: 1, b: { c: 2, d: { e: 3 } } }
      // a, b, c, d, e = 5 keys
      expect(countKeys(obj)).toBe(5)
    })

    it('should count keys in an object with arrays (arrays themselves are not counted as keys, their object elements are)', () => {
      const obj = { a: [1, 2], b: { c: [{ d: 1 }, { e: 2 }] } }
      // a, b, c, d, e = 5 keys
      expect(countKeys(obj)).toBe(5)
    })

    it('should return 0 for an empty object', () => {
      const obj = {}
      expect(countKeys(obj)).toBe(0)
    })

    it('should handle null and undefined values correctly', () => {
      const obj = { a: null, b: undefined, c: { d: null } }
      // a, b, c, d = 4 keys
      expect(countKeys(obj)).toBe(4)
    })

    it('should not count keys in array elements that are not plain objects', () => {
      const obj = { a: [1, 'string', true, null, undefined, [5, 6]] }
      // a = 1 key
      expect(countKeys(obj)).toBe(1)
    })

    it('should count keys deeply within nested arrays of objects', () => {
      const obj = {
        a: [
          { b: 1, c: { d: 2 } }, // b, c, d = 3 keys
          { e: 3 }, // e = 1 key
        ],
        f: 4, // f = 1 key
      }
      // a, b, c, d, e, f = 6 keys
      expect(countKeys(obj)).toBe(6)
    })
  })

  describe('sortKeys', () => {
    it('should sort a flat object alphabetically', () => {
      const obj = { c: 3, a: 1, b: 2 }
      const sorted = sortKeys(obj)
      expect(Object.keys(sorted)).toEqual(['a', 'b', 'c'])
      expect(sorted).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('should sort a nested object alphabetically', () => {
      const obj = { c: { e: 5, d: 4 }, a: 1, b: { g: 7, f: 6 } }
      const sorted = sortKeys(obj)
      expect(Object.keys(sorted)).toEqual(['a', 'b', 'c'])
      expect(Object.keys(sorted.b)).toEqual(['f', 'g'])
      expect(Object.keys(sorted.c)).toEqual(['d', 'e'])
      expect(sorted).toEqual({ a: 1, b: { f: 6, g: 7 }, c: { d: 4, e: 5 } })
    })

    it('should sort an object based on a reference object', () => {
      const obj = { name: 'John', age: 30, city: 'New York' }
      const refObj = { age: 0, name: '', city: '' }
      const sorted = sortKeys(obj, refObj)
      expect(Object.keys(sorted)).toEqual(['age', 'name', 'city'])
      expect(sorted).toEqual({ age: 30, name: 'John', city: 'New York' })
    })

    it('should sort nested objects based on a nested reference object', () => {
      const obj = { a: 1, c: { e: 5, d: 4 }, b: { g: 7, f: 6 } }
      const refObj = { b: { f: 0, g: 0 }, a: 0, c: { d: 0, e: 0 } }
      const sorted = sortKeys(obj, refObj)
      expect(Object.keys(sorted)).toEqual(['b', 'a', 'c'])
      expect(Object.keys(sorted.b)).toEqual(['f', 'g'])
      expect(Object.keys(sorted.c)).toEqual(['d', 'e'])
      expect(sorted).toEqual({ b: { f: 6, g: 7 }, a: 1, c: { d: 4, e: 5 } })
    })

    it('should handle arrays by returning them as is (not sorting their contents unless elements are objects)', () => {
      const obj = { a: [3, 1, 2], b: [{ c: 1 }, { a: 2 }] }
      const sorted = sortKeys(obj)
      expect(sorted.a).toEqual([3, 1, 2])
      // elements of b should be sorted if they are objects
      expect(Object.keys(sorted.b[0])).toEqual(['c'])
      expect(Object.keys(sorted.b[1])).toEqual(['a'])

      const objWithSortedArrayElements = { a: [{ z: 1, x: 0 }, { y: 2 }] }
      const sortedWithArrayElements = sortKeys(objWithSortedArrayElements)
      expect(Object.keys(sortedWithArrayElements.a[0])).toEqual(['x', 'z'])
      expect(Object.keys(sortedWithArrayElements.a[1])).toEqual(['y'])
    })

    it('should return an empty object if an empty object is provided', () => {
      const obj = {}
      const sorted = sortKeys(obj)
      expect(sorted).toEqual({})
    })

    it('should handle keys in obj not present in refObj by sorting them alphabetically at the end', () => {
      const obj = { name: 'John', age: 30, city: 'New York', country: 'USA' }
      const refObj = { age: 0, name: '' } // city and country not in ref
      const sorted = sortKeys(obj, refObj)
      // age, name (from ref), then city, country (alphabetical)
      expect(Object.keys(sorted)).toEqual(['age', 'name', 'city', 'country'])
    })

    it('should handle keys in refObj not present in obj by ignoring them', () => {
      const obj = { name: 'John', age: 30 }
      const refObj = { age: 0, name: '', city: '' } // city not in obj
      const sorted = sortKeys(obj, refObj)
      expect(Object.keys(sorted)).toEqual(['age', 'name'])
    })

    it('should return the same object if it is not an object or is null', () => {
      expect(sortKeys(null as any)).toBeNull()
      expect(sortKeys(undefined as any)).toBeUndefined()
      expect(sortKeys(123 as any)).toBe(123)
      expect(sortKeys('string' as any)).toBe('string')
    })
  })
})
