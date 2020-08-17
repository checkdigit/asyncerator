// operator/for-each.ts

export default async function* <T>(
  iterator: AsyncIterable<T>,
  forEachFunction: (value: T) => void
): AsyncGenerator<T, void, undefined> {
  for await (const item of iterator) {
    forEachFunction(item);
    yield item;
  }
}
