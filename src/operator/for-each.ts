// operator/for-each.ts

export default async function* <T>(iterator: AsyncIterable<T>, forEachFunction: (value: T) => void) {
  for await (const item of iterator) {
    forEachFunction(item);
    yield item;
  }
}
