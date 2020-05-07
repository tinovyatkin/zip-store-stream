import {
  createWriteStream,
  createReadStream,
  unlinkSync,
  readFileSync,
} from 'fs';
import { execFileSync } from 'child_process';
import * as Stream from 'stream';
import { promisify } from 'util';
import { randomBytes } from 'crypto';

import { ZipStoreStream } from './index';

const pipeline = promisify(Stream.pipeline);

describe('zip store stream', () => {
  it('should create valid empty ZIP archive', async () => {
    const FILENAME = 'test-empty.zip';
    const zip = new ZipStoreStream([]);
    await pipeline(zip, createWriteStream(FILENAME));
    expect(() =>
      execFileSync('unzip', ['-t', FILENAME], { encoding: 'utf8' }),
    ).toThrowError(
      expect.objectContaining({
        status: 1,
        stdout: expect.stringContaining(
          `warning [${FILENAME}]:  zipfile is empty`,
        ),
      }),
    );
    unlinkSync(FILENAME);
  });

  it('should create valid ZIP archive with ASCII and Unicode text files', async () => {
    const FILENAME = 'test-text.zip';
    const ASCII_TEXT = 'This is test of ASCII text';
    const UNICODE_TEXT = 'Я ❤️ JavaScript';
    const zip = new ZipStoreStream([
      { path: 'ascii.txt', data: ASCII_TEXT },
      { path: 'emoji.txt', data: UNICODE_TEXT },
    ]);
    await pipeline(zip, createWriteStream(FILENAME));
    const ascii = execFileSync('unzip', ['-p', FILENAME, 'ascii.txt'], {
      encoding: 'utf-8',
    });
    expect(ascii).toBe(ASCII_TEXT);
    const unicode = execFileSync('unzip', ['-p', FILENAME, 'emoji.txt'], {
      encoding: 'utf-8',
    });
    expect(unicode).toBe(UNICODE_TEXT);
    unlinkSync(FILENAME);
  });

  it('should work with binary buffers', async () => {
    const BUFF1_DATA = randomBytes(1024);
    const BUFF1_FILENAME = 'test/buffer1.bin';
    const BUFF2_DATA = randomBytes(4096);
    const BUFF2_FILENAME = 'test2/buf2.bin';
    const FILENAME = 'test-buffers.zip';
    const zip = new ZipStoreStream([
      { path: BUFF1_FILENAME, data: BUFF1_DATA },
      { path: BUFF2_FILENAME, data: BUFF2_DATA },
    ]);
    await pipeline(zip, createWriteStream(FILENAME));
    const buf1 = execFileSync('unzip', ['-p', FILENAME, BUFF1_FILENAME], {
      encoding: 'buffer',
    });
    const buf2 = execFileSync('unzip', ['-p', FILENAME, BUFF2_FILENAME], {
      encoding: 'buffer',
    });
    expect(Buffer.compare(buf1, BUFF1_DATA)).toBe(0);
    expect(Buffer.compare(buf2, BUFF2_DATA)).toBe(0);
    unlinkSync(FILENAME);
  });

  it('should work with streams', async () => {
    const FILENAME = 'test-stream.zip';
    const zip = new ZipStoreStream([
      {
        path: __filename,
        data: createReadStream(__filename),
      },
    ]);
    await pipeline(zip, createWriteStream(FILENAME));
    const content = execFileSync('unzip', ['-p', FILENAME, __filename], {
      encoding: 'utf-8',
    });
    expect(content).toBe(readFileSync(__filename, { encoding: 'utf-8' }));
    unlinkSync(FILENAME);
  });

  it('should work with mixed content', async () => {
    const FILENAME = 'test-mixed.zip';
    const zip = new ZipStoreStream([
      { path: 'string.txt', data: 'Hello world!' },
      { path: 'buffer.bin', data: randomBytes(10000) },
      {
        path: 'stream.ts',
        data: createReadStream(__filename, { encoding: 'utf8' }),
      },
    ]);
    await pipeline(zip, createWriteStream(FILENAME));
    expect(execFileSync('unzip', ['-t', FILENAME], { encoding: 'utf8' }))
      .toMatchInlineSnapshot(`
      "Archive:  test-mixed.zip
          testing: string.txt               OK
          testing: buffer.bin               OK
          testing: stream.ts                OK
      No errors detected in compressed data of test-mixed.zip.
      "
    `);
    const verbosely = execFileSync('unzip', ['-v', FILENAME], {
      encoding: 'utf8',
    });
    /*
            Length   Method    Size  Cmpr    Date    Time   CRC-32   Name
        --------  ------  ------- ---- ---------- ----- --------  ----
              12  Stored       12   0% 00-00-1980 00:00 1b851995  string.txt
          10000  Stored    10000   0% 00-00-1980 00:00 983c6c5a  buffer.bin
            3472  Stored     3472   0% 00-00-1980 00:00 f21cdbc5  stream.ts
        --------          -------  ---                            -------
          13484            13484   0%                            3 files
    */
    const parsed = verbosely
      .trim()
      .split('\n')
      .slice(3, 6)
      .map(
        l =>
          /^\s*(?<Length>\d+)\s+(?<Method>\w+)\s+(?<Size>\d+)\s+(?<Cmpr>\d+)%\s+(?<Date>\d\d-\d\d-\d\d\d\d)\s+(?<Time>\d\d:\d\d)\s+(?<CRC32>\S+)\s+(?<name>\S+)$/.exec(
            l,
          )?.groups,
      );
    expect(parsed).toHaveLength(3);
    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Cmpr: '0', Method: 'Stored' }),
      ]),
    );
    unlinkSync(FILENAME);
  });
});
