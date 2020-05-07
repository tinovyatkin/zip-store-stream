import { StreamCrc32 } from './stream-crc32';
import { CRC32Stream } from 'crc32-stream';
import * as Stream from 'stream';
import { promisify } from 'util';
import { crc32 } from '@node-rs/crc32';
const pipeline = promisify(Stream.pipeline);

describe('calculate CRC32 checksum of a stream', () => {
  it('calculates crc32 of string stream', async () => {
    const data = ['bear', ' ', 'sandwich'];
    const readable = Stream.Readable.from(data);
    const crc32s = new StreamCrc32();
    await pipeline(readable, crc32s);

    const crc32ref = new CRC32Stream();
    const readable2 = Stream.Readable.from(data);
    await pipeline(readable2, crc32ref);
    const crc32static = crc32(Buffer.from(data.join(''), 'ascii'))
      .toString(16)
      .toUpperCase();
    expect(crc32static).toBe(crc32ref.hex());
    expect(crc32s.checksum.toString(16).toUpperCase()).toBe(crc32ref.hex());
  });
});
