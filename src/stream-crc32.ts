import { PassThrough } from 'stream';
import { crc32 } from '@node-rs/crc32';

export class StreamCrc32 extends PassThrough {
  public checksum = 0;
  private _size = 0;

  _transform<T extends string | Buffer>(
    chunk: T,
    _encoding: T extends string ? BufferEncoding : 'buffer',
    callback: import('stream').TransformCallback,
  ): void {
    if (chunk) {
      this.checksum = crc32(chunk, this.checksum);
      this._size += chunk.length;
    }

    callback(null, chunk);
  }

  get size(): number {
    return this._size;
  }
}
