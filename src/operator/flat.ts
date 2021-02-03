// operator/flat.ts

export default async function* <T>(
  iterator: AsyncIterable<T>,
  depth = 1
): AsyncGenerator<T extends (infer U)[] ? U : T, void, undefined> {
  for await (const item of iterator) {
    if (depth >= 1 && Array.isArray(item)) {
      for (const element of item.flat(depth - 1)) {
        yield element as T extends (infer U)[] ? U : T;
      }
    } else {
      yield item as T extends (infer U)[] ? U : T;
    }
  }
}
