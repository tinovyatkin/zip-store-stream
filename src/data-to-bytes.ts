import { crc32 } from '@node-rs/crc32';
import { once } from 'events';

/**
 * Converts given string to Buffer, using ascii encoding if string is ASCII only
 * Returns Buffer as is
 *
 * @param {string | Buffer} data
 */
export async function dataToBuffer(
  this: import('stream').Readable,
  data: string | Buffer | import('stream').Readable,
): Promise<{ bytes: Buffer; crc32: number }> {
  if (Buffer.isBuffer(data)) {
    return {
      bytes: data,
      crc32: crc32(data),
    };
  }

  if (typeof data === 'string') {
    return dataToBuffer.call(
      this,
      // we will use ASCII encoding if string is ascii only, saving some bytes
      Buffer.from(data, /^[\p{ASCII}]+$/u.test(data) ? 'ascii' : 'utf-8'),
    );
  }

  // convert stream to buffer
  const res: Buffer[] = [];
  data
    .on('data', chunk => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf-8');
      res.push(buf);
      // as our crc32 calculation is using native extension it's faster to calculate it once on whole buffer
      // crc += crc32c(buf, crc);
    })
    .on('error', err => {
      // re-emit error as upstream
      this.emit('error', err);
    });
  await once(data, 'end');
  const bytes = Buffer.concat(res);
  return { bytes, crc32: crc32(bytes) };
}
