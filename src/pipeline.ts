// pipeline.ts

import stream from 'stream';
import util from 'util';

const pipeline = util.promisify(stream.pipeline);

/**
 * Wrapped version of stream.pipeline.  We do this for two reasons:
 * 1) auto-promisify
 * 2) type the function based on recommended usage, since @types/node does not match current functionality.
 *
 * Note this type definition does not match the full extent of the flexibility of stream.pipeline (e.g. you
 * can pass arrays of iterables, etc) but just the expected usage with the asyncerator library.
 *
 * @param source
 * @param transforms
 */
export default async function <T>(
  source: NodeJS.ReadableStream | Iterable<string | Buffer> | AsyncIterable<string | Buffer>,
  ...transforms: (
    | NodeJS.WritableStream
    | NodeJS.ReadWriteStream
    | Iterable<string | Buffer>
    | AsyncIterable<string | Buffer>
    | ((input: AsyncIterable<string | Buffer>) => AsyncIterable<string | Buffer>)
    | ((input: AsyncIterable<string | Buffer>) => Promise<T>)
  )[]
): // Note: we should be able to can do this in typescript 4.2
// destination:
//   | NodeJS.WritableStream
//   | Iterable<string | Buffer>
//   | AsyncIterable<string | Buffer>
//   | ((input: AsyncIterable<string | Buffer>) => Promise<T>)
Promise<T> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return pipeline(source, ...transforms);
}
