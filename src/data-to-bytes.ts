import { crc32 } from '@node-rs/crc32';

/**
 * Converts given string to Buffer, using ascii encoding if string is ASCII only
 * Returns Buffer as is
 *
 * @param {string | Buffer} data
 */
export async function dataToBuffer(
  data: string | Buffer | import('stream').Readable,
): Promise<{ bytes: Buffer; crc32: number }> {
  if (Buffer.isBuffer(data))
    return {
      bytes: data,
      crc32: crc32(data),
    };
  if (typeof data === 'string')
    return dataToBuffer(
      // we will use ASCII encoding if string is ascii only, saving some bytes
      Buffer.from(data, /^[\p{ASCII}]+$/u.test(data) ? 'ascii' : 'utf-8'),
    );

  // convert stream to buffer
  const res = [];
  let crc = 0;
  for await (const chunk of data) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf-8');
    res.push(buf);
    crc += crc32(buf, crc);
  }
  return { bytes: Buffer.concat(res), crc32: crc };
}
