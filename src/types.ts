export type DeepReadonly<T> = {
  readonly [K in keyof T]: keyof T[K] extends never ? T[K] : DeepReadonly<T[K]>
}

export type DeepPartial<T> = {
  [K in keyof T]?: keyof T[K] extends never ? T[K] : DeepPartial<T[K]>
}

export type DeepRequired<T> = {
  [K in keyof T]-?: keyof T[K] extends never ? T[K] : DeepRequired<T[K]>
}
