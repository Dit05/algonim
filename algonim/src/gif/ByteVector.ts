

export class ByteVector {

  /** The largest writeable value is 8*8 = 64 bits, so we need at least that much buffer. */
  public static readonly MIN_BUFFER = 8

  private readonly blocks: ArrayBuffer[] = []
  private readonly buffer: ArrayBuffer
  private readonly view: DataView

  private bufferOffset: number = 0


  public constructor(bufferSize: number = 8) {
    if(bufferSize < ByteVector.MIN_BUFFER) throw new RangeError(`bufferSize must be at least ${ByteVector.MIN_BUFFER}.`)

    this.buffer = new ArrayBuffer(bufferSize)
    this.view = new DataView(this.buffer)
  }



  private mustBeOpen() {
    if(this.bufferOffset >= this.buffer.byteLength) {
      throw new TypeError("This ByteVector was already finished. It cannot be written to anymore.")
    }
  }

  private flush() {
    this.blocks.push(this.buffer.slice(0, this.bufferOffset))
    this.bufferOffset = 0
  }

  private maybeFlush() {
    if(this.bufferOffset + ByteVector.MIN_BUFFER >= this.buffer.byteLength) {
      this.flush()
    }
  }

  private add(fn: (byteOffset: number, value: number) => void, offset: number, value: number) {
    this.mustBeOpen()
    fn(this.bufferOffset, value)
    this.bufferOffset += offset
    this.maybeFlush()
  }

  private static makeLittleEndian(fn: (byteOffset: number, value: number, littleEndian: boolean) => void): (byteOffset: number, value: number) => void {
    return (byteOffset: number, value: number) => fn(byteOffset, value, true)
  }


  public addUint8(value: number) { this.add((a, b) => this.view.setUint8(a, b), 1, value) }
  public addUint16(value: number) { this.add(ByteVector.makeLittleEndian(this.view.setUint16), 2, value) }
  public addUint32(value: number) { this.add(ByteVector.makeLittleEndian(this.view.setUint32), 4, value) }

  public addInt8(value: number) { this.add(this.view.setInt8, 1, value) }
  public addInt16(value: number) { this.add(ByteVector.makeLittleEndian(this.view.setInt16), 2, value) }
  public addInt32(value: number) { this.add(ByteVector.makeLittleEndian(this.view.setInt32), 4, value) }

  public addFloat32(value: number) { this.add(ByteVector.makeLittleEndian(this.view.setFloat32), 4, value) }
  public addFloat64(value: number) { this.add(ByteVector.makeLittleEndian(this.view.setFloat64), 8, value) }

  public finish() {
    if(this.bufferOffset > 0) {
      this.flush()
    }
    this.bufferOffset = this.buffer.byteLength
    return this.blocks
  }

}
