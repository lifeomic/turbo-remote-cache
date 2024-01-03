import { Readable } from 'stream';

import request from 'supertest';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

import app from '../src/server'; // TODO uses workspace name instead of relative path

describe('cache server', () => {
  const clientMock = mockClient(S3Client);

  beforeEach(() => {
    clientMock.reset();
  });

  it('serves /v8/artifacts/ path only', async () => {
    const response = await request(app.callback()).get('/foo');
    expect(response.status).toBe(404);
  });

  it('requires teamId in query string', async () => {
    const response = await request(app.callback()).get('/v8/artifacts/xxx');
    expect(response.status).toBe(404);
  });

  it('requires artifact id', async () => {
    const resp = await request(app.callback()).get('/v8/artifacts?teamId=y');
    expect(resp.status).toBe(404);
  });

  it('downloads an artifact', async () => {
    const stream = new Readable();
    const mockContent = 'hello world';
    stream.push(mockContent);
    stream.push(null); // end of stream

    // wrap the Stream with SDK mixin
    const sdkStream = sdkStreamMixin(stream);
    clientMock.on(GetObjectCommand).resolves({ Body: sdkStream });
    const response = await request(app.callback()).get(
      '/v8/artifacts/xxx?slug=yyy',
    );
    expect(response.headers).toHaveProperty(
      'content-type',
      'application/octet-stream',
    );

    expect(clientMock).toHaveReceivedCommandWith(GetObjectCommand, {
      Key: `yyy/xxx`,
    });
  });

  it('uploads an artifact', async () => {
    const mockContent = 'hello world';

    clientMock.on(PutObjectCommand).resolves({});

    const response = await request(app.callback())
      .put('/v8/artifacts/xxx?slug=yyy')
      .attach('name', Buffer.from(mockContent), 'x.tgz');

    expect(response.body).toEqual({ ok: true });
    expect(clientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Key: `yyy/xxx`,
    });
  });
});
