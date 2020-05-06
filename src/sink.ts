// sink.ts

/**
 * Turn an async iterable iterator into an Array.
 * This will wait until the iterator is done before returning an array, so be careful using this
 * with endless iterators (in other words, don't do that).
 */
export async function toArray<T>(iterator: AsyncIterable<T>): Promise<T[]> {
  const results = [];
  for await (const result of iterator) {
    results.push(result);
  }
  return results;
}
