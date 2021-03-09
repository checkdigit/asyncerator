// node/find-port.test.ts

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
