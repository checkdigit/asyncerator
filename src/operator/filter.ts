// operator/filter.ts

export default async function* <T>(
  iterator: AsyncIterable<T>,
  filterFunction: (value: T) => boolean
): AsyncGenerator<T, void, undefined> {
  for await (const item of iterator) {
    if (filterFunction(item)) {
      yield item;
    }
  }
}
