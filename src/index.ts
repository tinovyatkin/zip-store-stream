import { dataToBuffer } from './data-to-bytes';
import { Readable } from 'stream';

const FILE_HEADER_PROLOGUE = Buffer.from([
  // version + bit flag
  0x0a,
  0x00,
  0x00,
  0x00,
  // compression method - this is STORE, means no compression
  0x00,
  0x00,
  // file time - we will put nothing here
  0x00,
  0x00,
  // file date - we will put nothing here
  0x00,
  0x00,
]);
const FILE_DATA_PROLOGUE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const ZIP_EPILOGUE = Buffer.from([
  0x50,
  0x4b,
  0x05,
  0x06,
  0x00,
  0x00,
  0x00,
  0x00,
]);

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
        // writing central directory
        this.push(Buffer.from(this.#centralDirectory));

        // ending ZIP file
        this.push(ZIP_EPILOGUE);
        const zipFinal = Buffer.alloc(14, 0);
        let offset = zipFinal.writeUInt16LE(this.#numberOfFiles, 0);
        offset = zipFinal.writeUInt16LE(this.#numberOfFiles, offset);
        offset = zipFinal.writeUInt32LE(this.#centralDirectory.length, offset);
        zipFinal.writeUInt32LE(this.#filesDataWritten, offset);
        this.push(zipFinal);

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

    // Generate a file header (as a buffer)
    const fileHeader = Buffer.alloc(16, 0);
    // crc32
    fileHeader.writeUInt32LE(crc32, 0);
    // compressed size
    fileHeader.writeUInt32LE(bytes.length, 4);
    // uncompressed size
    fileHeader.writeUInt32LE(bytes.length, 8);
    // file name length
    fileHeader.writeUInt16LE(pathBytes.length, 12);

    this.#centralDirectory.push(
      0x50,
      0x4b,
      0x01,
      0x02,
      0x14,
      0x00,
      ...FILE_HEADER_PROLOGUE,
      ...fileHeader,
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

    this.push(FILE_DATA_PROLOGUE);
    this.push(FILE_HEADER_PROLOGUE);
    this.push(fileHeader);
    this.push(pathBytes);
    // update offset
    this.#filesDataWritten +=
      FILE_DATA_PROLOGUE.length +
      FILE_HEADER_PROLOGUE.length +
      fileHeader.length +
      pathBytes.length +
      bytes.length;
    if (this.push(bytes)) return this.read();
  }
}
