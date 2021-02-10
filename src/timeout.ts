// timeout.ts

// import debug from 'debug';

// const log = debug('checkdigit:timeout');

const TIMEOUT = 60000;

/**
 * Promise with timeout implementation.  If promise takes longer than time milliseconds to resolve, reject.
 * @param time
 */
export default function (time = TIMEOUT) {
  return async function <T>(promise: Promise<T>): Promise<T> {
    let handle;
    try {
      return await Promise.race([
        new Promise((_: (value: T) => void, reject) => {
          handle = setTimeout(reject, time);
        }),
        promise,
      ]);
    } finally {
      if (handle !== undefined) {
        clearTimeout(handle);
      }
    }
  };
}
