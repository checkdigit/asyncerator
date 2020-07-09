// operator/filter.ts

export default async function* <T>(iterator: AsyncIterable<T>, filterFunction: (value: T) => boolean) {
  for await (const item of iterator) {
    if (filterFunction(item)) {
      yield item;
    }
  }
}
