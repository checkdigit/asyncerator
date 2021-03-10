// node/find-port.test.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import portfinder from 'portfinder';

export default async function (): Promise<number> {
  const PORT_NUMBER = 49152;
  const RANDOM_PORT_NUMBER_CEILING = 16000;
  return new Promise<number>((resolve, reject) => {
    // pick a base port randomly from the un-assignable port range, and search from there
    portfinder.getPort(
      { port: PORT_NUMBER + Math.floor(Math.random() * RANDOM_PORT_NUMBER_CEILING) },
      (error: Error, port: number) => {
        if (error) {
          reject(error);
        } else {
          resolve(port);
        }
      }
    );
  });
}
