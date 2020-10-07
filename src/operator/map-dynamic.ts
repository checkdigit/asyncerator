// operator/map-dynamic.ts

export default async function* <T, U>(
  iterator: AsyncIterable<T>,
  dynamicMapFunction: (value: T) => Promise<U>
): AsyncGenerator<U, void, undefined> {
  for await (const item of iterator) {
    yield await dynamicMapFunction(item);
  }
}
