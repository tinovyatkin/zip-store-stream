# zip-store-stream [![codecov](https://codecov.io/gh/walletpass/zip-store-stream/branch/master/graph/badge.svg)](https://codecov.io/gh/walletpass/zip-store-stream) [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=zip-store-stream&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=zip-store-stream)

Highly optimized Node.JS library to create in-memory ZIP archive (as Readable stream and without compression) from given strings, Buffers or streams.
Storing without compression is fast and in many cases is enough, if you just want to bundle some files together (as our use case for Apple Wallet `.pkpass` files, which consists mostly of already compressed PNG files)

## Motivation

There are tons of ZIP creating libraries on NPM, however, none of them is optimized for speed, memory and asynchronism point of view and I was needed a way to generate ZIP archives (Apple Wallet Passes) at scale of about 50000 RPS.

This library:

- Generates ZIP archive in memory and returns stream to be piped into a file, HTTPS response, etc.
- Works with strings, buffers or readable streams as file sources.
- Starts pushing data as soon as possible to decrease response latency.
- Pushes in small chunks, file by file, to improve message loop flowing.
- Uses super-fast [@node-rs/crc32](https://github.com/Brooooooklyn/node-rs/blob/master/packages/crc32/README.md#performance) Rust-powered library for CRC32 calculation.
- Uses native Node.JS Buffer and efficient multi-bytes writing functions (`writeUInt16LE` / `writeUInt32LE`) for archive structure building.

Written in TypeScript, 100% test coverage.

```ts
import { ZipStoreStream } from 'zip-store-stream';

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
```

```sh
unzip -v test-mixed.zip

    Length   Method    Size  Cmpr    Date    Time   CRC-32   Name
--------  ------  ------- ---- ---------- -----     -------- ----
        12  Stored       12   0% 00-00-1980 00:00 1b851995  string.txt
    10000   Stored    10000   0% 00-00-1980 00:00 983c6c5a  buffer.bin
    3472    Stored     3472   0% 00-00-1980 00:00 f21cdbc5  stream.ts
--------          -------  ---                               -------
    13484            13484   0%                            3 files

```

## Author and License

MIT licensed by Konstantin Vyatkin <tino@vtkn.io>
