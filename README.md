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

### Extended example

Read a CSV file, output a new CSV file based on some logic:
```ts

import { filter, map, pipeline, race, split } from 'asyncerator';
import fs from 'fs';
import timeout from '@checkdigit/timeout';
import retry from '@checkdigit/retry';

async function main() {
  await pipeline(
    fs.createReadStream('./input.csv'),
    map((buffer: Buffer) => buffer.toString()),
    split('\n'),
    // remove empty lines, and head
    filter((string) => string !== '' && string !== '"header1","header2","header3","header4"'),
    map((line: string) => ({
      field1: (line.split(',')[0] as string).slice(1, -1),
      field4: BigInt((line.split(',')[3] as string).slice(1, -1)),
    })),
    race(
      retry((item) =>
        timeout(
          (async ({field1, field4}) => ({
            calculated: await someAsyncFunction(field1),
            field1,
            field4
          }))(item)
        )
      )
    ),
    async function* (iterator) {
      for await (const item of iterator) {
        if (item.field1 !== item.field4) {
          yield `${field1},${field2},${calculated}\n`;
        }
      }
    },
    fs.createWriteStream('./output.csv')
  );
}
```

## License

MIT
