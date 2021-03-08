# asyncerator

## Introduction

The `asyncerator` module provides three central capabilities:
- A standard Check Digit "blessed" definition of the de facto `Asyncerator<T>` interface.
- A strongly typed, promisified version of Node's [`stream.pipeline`](https://nodejs.org/api/stream.html#stream_stream_pipeline_source_transforms_destination_callback) function.
- A library of simple source, transform and sink components that can be used standalone, or with `pipeline`.

### Installing

`npm install asyncerator`

## `Asyncerator<T>` interface

```
export interface Asyncerator<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}
```

The `Asyncerator` interface defined by this module is the minimum common `for-await` compatible interface that both
NodeJS.ReadableStream and AsyncIterableIterator implement.  It's a useful construct to be used with the Node
14+ `stream.pipeline` function, since it allows `AsyncIterableIterators` and Node stream-based objects to be combined in
various convenient ways.

The following all implement the `Asyncerator` interface:
- `AsyncIterableIterator`
- `AsyncGenerator` (aka async generator functions)
- `NodeJS.ReadableStream` (internal Node implementations include `stream.Readable`, `readline`, `fs.createReadStream`, etc)
- the standard Javascript `for await...of` statement will accept an Asyncerator
- the upcoming [W3C Streams API](https://streams.spec.whatwg.org/#rs-asynciterator)

### Why do we need a custom interface for this?

It's not a custom interface, it's simply the de facto interface used by Node and elsewhere.  It's just not defined anywhere.

Specifically:
- `Asyncerator` is similar to `AsyncIterableIterator`, but does not extend `AsyncIterator`.
- It's also similar to `AsyncIterable`, but `[Symbol.asyncIterator]()` returns an `AsyncIterableIterator`
  instead of an `AsyncIterator`.
- ...but it's not exactly either one.  In particular, Typescript does not agree that Node streams implement either
  interface, which makes interoperability a problem in Typescript without `Asyncerator`.

## `asyncerator.pipeline`


`asyncerator.pipeline` is a strongly typed, promisified version of Node's
[`stream.pipeline`](https://nodejs.org/api/stream.html#stream_stream_pipeline_source_transforms_destination_callback) function.

Its typing is complicated, but the basic form of the function is:
```
pipeline(
  source, // string | Readable | Iterable | AsyncIterable | Asyncerator
  ...transforms, // zero or more Transform | ((input: Asyncerator) => Asyncerator)
  sink // Writable | Transform | ((input: Asyncerator) => Promise<Sink>) | ((input: Asyncerator) => AsyncIterable)
): Readable | Promise<Sink> | Promise<void>; {
```

The main advantage of the typings is that at compile-time, the outputs of each source or transformation must match the
input of the subsequent transformation or sink.  This makes working with complex pipelines much less error-prone.

In addition, the standard Node typings (`@types/node`) for `stream.pipeline` are woefully incorrect (as of 14.14.32)
to the point of being unusable.

Functionally, the Asyncerator `pipeline` function differs from the built-in `stream.pipeline` in that it returns a promise, or a
stream, depending on the type of the sink (last argument):
- if the sink is a Writable stream, return a `Promise<void>`.
- if the sink is an async function that returns a `Promise<T>`, return that promise.
- if the sink is an async generator function or a stream `Transform`, return a `Readable` stream.

Despite these differences Under the hood, `stream.pipeline` is still used to perform the actual work.

### Simple example

```ts
import { map, pipeline } from 'asyncerator';
import fs from 'fs';
import zlib from 'zlib';

// write a Gzipped file containing "hello" and "world" on two separate lines
await pipeline(
  ["hello", "world"],
  map((string) => `${string}\n`),
  zlib.createGzip(),
  fs.createWriteStream(temporaryFile)
);
```

## Extended example

Read a CSV file, output a new CSV file based on some logic:
```ts

import { filter, map, pipeline, race, split } from 'asyncerator';
import fs from 'fs';
import timeout from '@checkdigit/timeout';
import retry from '@checkdigit/retry';

async function main() {
  await pipeline(
    fs.createReadStream('./input.csv'),
    // turn buffers into string chunks
    map((buffer: Buffer) => buffer.toString()),
    // split chunks into lines
    split('\n'),
    // remove empty lines, and CSV header line
    filter((string) => string !== '' && string !== '"header1","header2","header3","header4"'),
    // transform string into an object
    map((line: string) => ({
      field1: line.split(',')[0] as string,
      field4: BigInt((line.split(',')[3] as string)),
    })),
    // perform concurrent requests (up to 128 by default) - Note: DOES NOT PRESERVE ORDER
    race(
      retry((item) =>
        timeout(
          (async ({field1, field4}) => ({
            calculated: await someAsyncNetworkAPIFunction(field1),
            field1,
            field4 // type is infered to be a BigInt, because Typescript is awesome
          }))(item)
        )
      )
    ),
    // demonstrate use of an async generator to filter and transform objects into a string
    // (FYI could be done more easily using map and filter)
    async function* (iterator) {
      for await (const item of iterator) {
        if (doWeOutput(item)) {
          yield `${item.field1},${item.field2},${item.calculated}\n`;
        }
      }
    },
    fs.createWriteStream('./output.csv')
  );
}
```

Note this code, in addition to the built-in asyncerator functionality, also uses `@checkdigit/timeout` and
`@checkdigit/retry` to implement retries with timeouts and exponential back-off.

## License

MIT
