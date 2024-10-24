// node/pipeline.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import stream, { Duplex, Readable, Writable } from 'node:stream';
import { promisify } from 'node:util';

import debug from 'debug';

import type { Asyncerator } from '../asyncerator';

const log = debug('asyncerator:pipeline');

const promisifiedPipeline = promisify(stream.pipeline);

export type PipelineSource<Source> = string | Readable | Iterable<Source> | AsyncIterable<Source> | Asyncerator<Source>;

export type PipelineTransformer<Input, Output> = Duplex | ((input: Asyncerator<Input>) => Asyncerator<Output>);

export interface PipelineOptions {
  signal: AbortSignal;
}

/**
 * Unfortunately, the only known way to accurately type the pipeline function is a series of overloads.  The return value
 * is defined by the type of the last parameter, and there are zero or more transform parameters in between the
 * source and the destination.  Also, the output of each parameter in the pipeline must match the input type of the
 * later parameter.  TBD if this can be typed using some cool variadic thing in the current latest (5.x) version
 * of Typescript.
 */

// zero transforms
export default function <Source, Sink>(
  source: PipelineSource<Source>,
  sink: (input: Asyncerator<Source>) => Promise<Sink>,
  options?: PipelineOptions,
): Promise<Sink>;
export default function <Source, Sink>(
  source: PipelineSource<Source>,
  sink: Duplex | ((input: Asyncerator<Source>) => AsyncIterable<Sink>),
): Readable;
export default function <Source>(source: PipelineSource<Source>, sink: Writable): Promise<void>;

// 1 transform
export default function <Source, Sink, TransformSink>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>,
  options?: PipelineOptions,
): Promise<Sink>;
export default function <Source, Sink, TransformSink>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, TransformSink>,
  sink: Duplex | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>),
): Readable;
export default function <Source, TransformSink>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, TransformSink>,
  sink: Writable,
): Promise<void>;

// 2 transforms
export default function <Source, Sink, TransformSink, T1>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>,
  options?: PipelineOptions,
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, TransformSink>,
  sink: Duplex | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>),
): Readable;
export default function <Source, TransformSink, T1>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, TransformSink>,
  sink: Writable,
): Promise<void>;

// 3 transforms
export default function <Source, Sink, TransformSink, T1, T2>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>,
  options?: PipelineOptions,
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1, T2>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, TransformSink>,
  sink: Duplex | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>),
): Readable;
export default function <Source, TransformSink, T1, T2>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, TransformSink>,
  sink: Writable,
): Promise<void>;

// 4 transforms
export default function <Source, Sink, TransformSink, T1, T2, T3>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>,
  options?: PipelineOptions,
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1, T2, T3>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, TransformSink>,
  sink: Duplex | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>),
): Readable;
export default function <Source, TransformSink, T1, T2, T3>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, TransformSink>,
  sink: Writable,
): Promise<void>;

// 5 transforms
export default function <Source, Sink, TransformSink, T1, T2, T3, T4>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>,
  options?: PipelineOptions,
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, TransformSink>,
  sink: Duplex | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>),
): Readable;
export default function <Source, TransformSink, T1, T2, T3, T4>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, TransformSink>,
  sink: Writable,
): Promise<void>;

// 6 transforms
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>,
  options?: PipelineOptions,
): Promise<Sink>;
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, TransformSink>,
  sink: Duplex | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>),
): Readable;
export default function <Source, TransformSink, T1, T2, T3, T4, T5>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, TransformSink>,
  sink: Writable,
): Promise<void>;

// 7 transforms
export default function <Source, Sink, TransformSink, T1, T2, T3, T4, T5, T6>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, TransformSink>,
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>,
  options?: PipelineOptions,
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
  sink: Duplex | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>),
): Readable;
export default function <Source, TransformSink, T1, T2, T3, T4, T5, T6>(
  source: PipelineSource<Source>,
  transform1: PipelineTransformer<Source, T1>,
  transform2: PipelineTransformer<T1, T2>,
  transform3: PipelineTransformer<T2, T3>,
  transform4: PipelineTransformer<T3, T4>,
  transform5: PipelineTransformer<T4, T5>,
  transform6: PipelineTransformer<T5, T6>,
  transform7: PipelineTransformer<T6, TransformSink>,
  sink: Writable,
): Promise<void>;

// 8 transforms
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
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>,
  options?: PipelineOptions,
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
  sink: Duplex | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>),
): Readable;
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
  sink: Writable,
): Promise<void>;

// 9 transforms
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
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>,
  options?: PipelineOptions,
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
  sink: Duplex | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>),
): Readable;
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
  sink: Writable,
): Promise<void>;

// 10 transforms
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
  sink: (input: Asyncerator<TransformSink>) => Promise<Sink>,
  options?: PipelineOptions,
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
  sink: Duplex | ((input: Asyncerator<TransformSink>) => AsyncIterable<Sink>),
): Readable;
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
  sink: Writable,
): Promise<void>;

/**
 * Wrapped version of stream.pipeline.  We do this for two reasons:
 * 1) auto-promisify, if the sink is an async function or a WritableStream
 * 2) type the function based on recommended usage, since @types/node does not match current functionality.
 *
 * Note this type definition does not match the full flexibility of `stream.pipeline` (e.g., you
 * can pass arrays of iterables, etc.) but just the expected usage with the asyncerator library.
 *
 * @param argumentList
 */

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export default function <Sink>(...argumentList: unknown[]): Promise<Sink | void> | Readable {
  let options: PipelineOptions | undefined = argumentList.at(-1) as PipelineOptions;
  if (!(Object.keys(options).length === 1 && Object.keys(options)[0] === 'signal')) {
    options = undefined;
  }

  const sink = argumentList[argumentList.length - (options === undefined ? 1 : 2)] as object;

  /**
   * The sink is an async function, so return a promise
   */
  if (sink.constructor.name === 'AsyncFunction') {
    return promisifiedPipeline(...(argumentList as Parameters<typeof promisifiedPipeline>)) as unknown as Promise<Sink>;
  }

  /**
   * The sink is WritableStream, so return a promise<void>.  Reject on error.
   */
  if ((sink as Writable).writable && !(sink as Readable).readable) {
    return new Promise((resolve, reject) => {
      stream.pipeline(...(argumentList as Parameters<typeof stream.pipeline>), (error?: Error | null) => {
        if (error === undefined || error === null) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * The sink is a transform, i.e., AsyncGenerator-like, or a Duplex stream.  In this case, we return a Readable.
   */
  return stream.pipeline(...(argumentList as Parameters<typeof stream.pipeline>), (error) => {
    if (error) {
      log('error', error);
    } else {
      log('complete');
    }
  }) as unknown as Readable;
}
