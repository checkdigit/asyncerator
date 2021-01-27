// sink/drop.ts

/**
 * Drop the results of an async iterable iterator into /dev/null.
 */
export default async function <T>(iterator: AsyncIterable<T>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _ of iterator) {
    // do nothing
  }
}
