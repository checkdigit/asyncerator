// operator/map.ts

export default async function* <T, U>(iterator: AsyncIterable<T>, mapFunction: (value: T) => U) {
  for await (const item of iterator) {
    yield mapFunction(item);
  }
}
