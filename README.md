# zip-store-stream [![codecov](https://codecov.io/gh/walletpass/zip-store-stream/branch/master/graph/badge.svg)](https://codecov.io/gh/walletpass/zip-store-stream) [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=zip-store-stream&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=zip-store-stream)

Highly optimized Node.JS library to create read stream of ZIP archive without compression from given strings, Buffers or streams.
Storing without compression is fast and in many cases is enough, if you just want to bundle some files together (as our use case for Apple Wallet `.pkpass` files, which consists mostly of already compressed PNG files)

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
