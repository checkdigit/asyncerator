// node/s3.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import assert from 'assert';
import { Readable } from 'stream';
import { CreateBucketCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import awsNock from '@checkdigit/aws-nock';
import * as openpgp from 'openpgp';
import { v4 as uuid } from 'uuid';

import { filter, map } from '../operator';
import { toString } from '../sink';
import pipeline from './pipeline';

describe('s3', () => {
  awsNock();
  const s3 = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'hello',
      secretAccessKey: 'world',
    },
  });

  it('can stream to and from s3', async () => {
    const bucketName = uuid();
    await s3.send(
      new CreateBucketCommand({
        Bucket: bucketName,
      })
    );

    const uploadInbound = new Upload({
      client: s3,
      params: {
        Bucket: bucketName,
        Key: 'in.txt',
        Body: 'hello world',
        ContentType: 'text/plain',
      },
    });
    await uploadInbound.done();

    const getInbound = await s3.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: 'in.txt',
      })
    );

    assert(getInbound.Body instanceof Readable);

    const inOutStream = pipeline(
      getInbound.Body,
      map((string) => `${string}\n`),
      filter((string) => string !== '')
    );

    const uploadOutbound = new Upload({
      client: s3,
      params: {
        Bucket: bucketName,
        Key: 'out.txt',
        Body: inOutStream,
        ContentType: 'text/plain',
      },
    });
    await uploadOutbound.done();

    const getOutbound = await s3.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: 'out.txt',
      })
    );

    assert(getOutbound.Body instanceof Readable);
    const outbound = await pipeline(getOutbound.Body, toString);
    assert.strictEqual(outbound, 'hello world\n');
  });

  it('can stream to and from PGP encrypted object', async () => {
    const { privateKey: armoredPrivateKey, publicKey: armoredPublicKey } = await openpgp.generateKey({
      type: 'rsa',
      rsaBits: 4096,
      userIDs: [{ name: 'Testy McTester', email: 'testy.mctester@testing.com' }],
      passphrase: 'gumby',
    });
    const publicKey = await openpgp.readKey({ armoredKey: armoredPublicKey });
    const privateKey = await openpgp.decryptKey({
      privateKey: await openpgp.readPrivateKey({ armoredKey: armoredPrivateKey }),
      passphrase: 'gumby',
    });

    const encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ text: 'hello world' }),
      encryptionKeys: publicKey,
    });

    const { data: decrypted } = await openpgp.decrypt({
      message: await openpgp.readMessage({
        armoredMessage: encrypted,
      }),
      verificationKeys: publicKey,
      decryptionKeys: privateKey,
    });

    assert.strictEqual(decrypted, 'hello world');
  });
});
