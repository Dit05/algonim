

export type OutputFn = (byte: number) => void

/**
* Collects bits into bytes.
*/
export class BitVector {

  private readonly outputFn: OutputFn
  private partialByte: number = 0
  private partialSize = 0


  public constructor(outputFn: OutputFn) {
    this.outputFn = outputFn
  }


  /** Adds the lowest n bits of a number. This might result in a partial byte, so if this is the last write using this instance, make sure to call {@link flush}. */
  public add(num: number, bits: number | undefined) {
    bits ??= BitVector.countBits(num)

    while(bits > 0) {
      this.partialByte |= (num & 0b1) << this.partialSize
      this.partialSize += 1
      bits -= 1
      num >>= 1
      if(this.partialSize >= 8) {
        this.flush()
      }
    }
  }

  /** If there's an unfinished byte, writes it to the underlying vector. */
  public flush() {
    if(this.partialSize > 0) {
      this.outputFn(this.partialByte)
      this.partialByte = 0
      this.partialSize = 0
    }
  }

  private static countBits(num: number): number {
    let bits = 0
    while(num > 0) {
      num >>= 1
      bits += 1
    }
    return bits
  }

}

// TODO unit tests for this
