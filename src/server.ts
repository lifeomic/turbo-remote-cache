import Koa, { Context, type Next } from 'koa';
import Router from '@koa/router';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import debug from 'debug';

const app = new Koa();
const router = new Router({ prefix: '/v8/artifacts/:hash' });

const s3Client = new S3Client({});
const logger = debug('turbo-remote-cache');
const BUCKET_NAME = process.env.STORAGE_PATH;
const awsErrorCodesForNotFound = ['NoSuchBucket', 'NoSuchKey'];

const validateReq = (hash: string, ctx: Context, next: Next) => {
  const teamId = ctx.query.slug;

  if (!teamId) {
    return (ctx.status = 404);
  } else {
    ctx.teamId = teamId;
    ctx.artifactId = hash;
    return next();
  }
};

/**
 * download object from a s3 bucket.
 * bucket name comes from env variable 'STORAGE_PATH'.
 * the object key is determined by convention '<team-id>/<artifact-id>'.
 * @param ctx
 * @param next
 */
const downloadArtifact = async (ctx: Context) => {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `${ctx.teamId}/${ctx.artifactId}`,
  });

  try {
    const response = await s3Client.send(cmd);
    ctx.set('Content-Type', 'application/octet-stream');
    if (response.ContentLength) {
      ctx.set('Content-Length', response.ContentLength.toString());
    }
    ctx.body = response.Body;
    // TODO set resp header x-artifact-tag
    logger('object key', `${ctx.teamId}/${ctx.artifactId}`);
  } catch (error) {
    logger('error', error.Code);
    if (awsErrorCodesForNotFound.includes(error.Code)) {
      ctx.status = 404;
      ctx.body = { ok: false };
    } else {
      throw error;
    }
  }
};

const saveArtifact = async (ctx: Context) => {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `${ctx.teamId}/${ctx.artifactId}`,
    Body: ctx.req,
    ContentLength: parseInt(ctx.header['content-length']),
  });

  await s3Client.send(cmd);

  logger('saved artifact', ctx.artifactId);

  ctx.body = { ok: true };
};

/**
 * handles events for analytics
 * @param ctx
 * @param next
 */
const handleEvents = (ctx: Context, next: Next) => {
  if (ctx.artifactId === 'events') {
    logger('post events', ctx.body);
  }
  next();
};

router
  .param('hash', validateReq)
  .get('/', downloadArtifact)
  .post('/', handleEvents)
  .put('/', saveArtifact);

app.use(router.routes()).use(router.allowedMethods());

export default app;
