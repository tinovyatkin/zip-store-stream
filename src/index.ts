import { dataToBuffer } from './data-to-bytes';
import { Readable } from 'stream';

function int(n: number, length: number): number[] {
  return Array.from({ length }, (k: number = n) => {
    n >>>= 8;
    return k & 0xff;
  });
}

interface ZipSource {
  path: string;
  data: string | Buffer | Readable;
}

export class ZipStoreStream extends Readable {
  #files: ZipSource[];
  #finished = false;
  readonly #numberOfFiles: number;
  #centralDirectory: number[] = [];
  #filesDataWritten = 0;
  constructor(files: ZipSource[]) {
    super();
    this.#files = files;
    this.#numberOfFiles = this.#files.length;
  }

  async _read(): Promise<void> {
    // end if there is no files
    if (!this.#files.length) {
      if (!this.#finished) {
        this.#finished = true;
        // writing central directory and finishing
        this.push(
          Buffer.from([
            ...this.#centralDirectory,
            0x50,
            0x4b,
            0x05,
            0x06,
            0x00,
            0x00,
            0x00,
            0x00,
            ...int(this.#numberOfFiles, 2),
            ...int(this.#numberOfFiles, 2),
            ...int(this.#centralDirectory.length, 4),
            ...int(this.#filesDataWritten, 4),
            0x00,
            0x00,
          ]),
        );
        // push the EOF-signaling `null` chunk.
        this.push(null);
      }
      return;
    }

    // getting next file to pipe
    const { path, data } = this.#files.shift() as ZipSource;

    const { bytes, crc32 } = await dataToBuffer(data);
    // We support only ASCII encoded file names here
    const pathBytes = Buffer.from(path, 'ascii');

    const commonHeader = [
      0x0a,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      ...int(crc32, 4),
      ...int(bytes.length, 4),
      ...int(bytes.length, 4),
      ...int(pathBytes.length, 2),
      0x00,
      0x00,
    ];

    this.#centralDirectory.push(
      0x50,
      0x4b,
      0x01,
      0x02,
      0x14,
      0x00,
      ...commonHeader,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      ...int(this.#filesDataWritten, 4),
      ...pathBytes,
    );

    const fileData = [
      0x50,
      0x4b,
      0x03,
      0x04,
      ...commonHeader,
      ...pathBytes,
      ...bytes,
    ];
    this.#filesDataWritten += fileData.length;
    if (this.push(Buffer.from(fileData))) return this.read();
  }
}