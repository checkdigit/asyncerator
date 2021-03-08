// node/pipeline.ts

import stream, { Readable, Transform, Writable } from 'stream';
import util from 'util';
import debug from 'debug';

import type { Asyncerator } from '../asyncerator';

const log = debug('asyncerator:pipeline');

const promisifiedPipeline = util.promisify(stream.pipeline);

export type PipelineSource<Source> = string | Readable | Iterable<Source> | AsyncIterable<Source> | Asyncerator<Source>;

export type PipelineTransformer<Input, Output> = Transform | ((input: Asyncerator<Input>) => Asyncerator<Output>);

/**
 * Unfortunately, the only known way to accurately type the pipeline function is a series of overloads.  The return value
 * is defined by the type of the last parameter, and there are zero or more transform parameters in between the
 * source and the destination.  Also, the output of each parameter in the pipeline must match the input type of the
 * subsequent parameter.  TBD if this can be typed using some cool variadic thing in the current latest (4.2) version
 * of Typescript.
 */

// zero transforms
export default function <Source>(source: PipelineSource<Source>, sink: Writable): Promise<void>;
export default function <Source, Sink>(
  source: PipelineSource<Source>,
  sink: (input: Asyncerator<Source>) => Promise<Sink>
): Promise<Sink>;
export default function <Source, Sink>(
  source: PipelineSource<Source>,
  sink: Transform | ((input: Asyncerator<Source>) => AsyncIterable<Sink>)
): Readable;

// 1 transform
export default function <Source, TransformSink>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, TransformSink>,
  sink: Writable
): Promise<void>;
export default function <Source, Sink, TransformSink>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>
): Promise<Sink>;
export default function <Source, Sink, TransformSink>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, TransformSink>,
  sink: Transform | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>)
): Readable;

// 2 transforms
export default function <Source, TransformSink, T1>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, TransformSink>,
  sink: Writable
): Promise<void>;
export default function <Source, Sink, TransformSink, T1>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, TransformSink>,
  sink: Transform | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>)
): Readable;

// 3 transforms
export default function <Source, TransformSink, T1, T2>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, TransformSink>,
  sink: Writable
): Promise<void>;
export default function <Source, Sink, TransformSink, T1, T2>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1, T2>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, TransformSink>,
  sink: Transform | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>)
): Readable;

// 4 transforms
export default function <Source, TransformSink, T1, T2, T3>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, TransformSink>,
  sink: Writable
): Promise<void>;
export default function <Source, Sink, TransformSink, T1, T2, T3>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1, T2, T3>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, TransformSink>,
  sink: Transform | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>)
): Readable;

// 5 transforms
export default function <Source, TransformSink, T1, T2, T3, T4>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, TransformSink>,
  sink: Writable
): Promise<void>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, TransformSink>,
  sink: Transform | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>)
): Readable;

// 6 transforms
export default function <Source, TransformSink, T1, T2, T3, T4, T5>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, TransformSink>,
  sink: Writable
): Promise<void>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, TransformSink>,
  sink: Transform | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>)
): Readable;

// 7 transforms
export default function <Source, TransformSink, T1, T2, T3, T4, T5, T6>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, TransformSink>,
  sink: Writable
): Promise<void>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5, T6>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5, T6>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, TransformSink>,
  sink: Transform | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>)
): Readable;

// 8 transforms
export default function <Source, TransformSink, T1, T2, T3, T4, T5, T6, T7>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, T7>,
  transform8: PipelineTransformer<T7, TransformSink>,
  sink: Writable
): Promise<void>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5, T6, T7>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, T7>,
  transform8: PipelineTransformer<T7, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5, T6, T7>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, T7>,
  transform8: PipelineTransformer<T7, TransformSink>,
  sink: Transform | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>)
): Readable;

// 9 transforms
export default function <Source, TransformSink, T1, T2, T3, T4, T5, T6, T7, T8>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, T7>,
  transform8: PipelineTransformer<T7, T8>,
  transform9: PipelineTransformer<T8, TransformSink>,
  sink: Writable
): Promise<void>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5, T6, T7, T8>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, T7>,
  transform8: PipelineTransformer<T7, T8>,
  transform9: PipelineTransformer<T8, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5, T6, T7, T8>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, T7>,
  transform8: PipelineTransformer<T7, T8>,
  transform9: PipelineTransformer<T8, TransformSink>,
  sink: Transform | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>)
): Readable;

// 10 transforms
export default function <Source, TransformSink, T1, T2, T3, T4, T5, T6, T7, T8, T9>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, T7>,
  transform8: PipelineTransformer<T7, T8>,
  transform9: PipelineTransformer<T8, T9>,
  transform10: PipelineTransformer<T9, TransformSink>,
  sink: Writable
): Promise<void>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5, T6, T7, T8, T9>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, T7>,
  transform8: PipelineTransformer<T7, T8>,
  transform9: PipelineTransformer<T8, T9>,
  transform10: PipelineTransformer<T9, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5, T6, T7, T8, T9>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, T7>,
  transform8: PipelineTransformer<T7, T8>,
  transform9: PipelineTransformer<T8, T9>,
  transform10: PipelineTransformer<T9, TransformSink>,
  sink: Transform | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>)
): Readable;

/**
 * Wrapped version of stream.pipeline.  We do this for two reasons:
 * 1) auto-promisify, if the sink is an async function or a WritableStream
 * 2) type the function based on recommended usage, since @types/node does not match current functionality.
 *
 * Note this type definition does not match the full extent of the flexibility of stream.pipeline (e.g. you
 * can pass arrays of iterables, etc) but just the expected usage with the asyncerator library.
 *
 * @param args
 */

export default function <Sink>(...args: unknown[]): Promise<Sink | void> | Readable {
  // eslint-disable-next-line @typescript-eslint/ban-types
  const sink = (args[args.length - 1] ?? {}) as object;

  /**
   * The sink is an async function, so return a promise
   */
  if (sink.constructor.name === 'AsyncFunction') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return (promisifiedPipeline(...args) as unknown) as Promise<Sink>;
  }

  /**
   * The sink is WritableStream, so return a promise<void>.  Reject on error.
   */
  if ((sink as Writable).writable && !(sink as Readable).readable) {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      stream.pipeline(...args, (error: unknown) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * The sink is a transform, i.e. AsyncGenerator-like, or a Duplex stream.  In this case we return a ReadWriteStream.
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return stream.pipeline(...args, (error) => {
    if (error) {
      log('error', error);
    } else {
      log('complete');
    }
  });
}
