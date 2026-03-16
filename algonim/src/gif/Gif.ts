import { ByteVector } from './ByteVector'
import { ColorTable } from './ColorTable'


export interface Block {
  emit(vec: ByteVector): void
  /** Notice that this method returns any potential errors, rather than throwing them. */
  isInvalidIn(gif: Gif): Error | null
}


export class Gif {
  // https://www.w3.org/Graphics/GIF/spec-gif89a.txt
  // GIF is little endian

  /** Maximum width/height. */
  public static readonly MAX_DIMENSION = (256 * 256) - 1

  /** Width of the Logical Screen. */
  public readonly width: number
  /** Height of the Logical Screen. */
  public readonly height: number

  /**
  * Non-mandatory blocks that will be added to the GIF stream.
  *
  * The header, logical screen descriptor, global color table (if provided), and trailer are always in the output.
  */
  public readonly blocks: Block[] = []

  public globalColorTable: ColorTable | undefined = undefined
  public backgroundColorIndex: number = 0
  public pixelAspectRatio: number = 1.0
  /** Number of bits per primary color available to the original image. This is entirely redundant and does not affect anything. Possibly it was included in the GIF specification as a joke. */
  public colorBits: number = 0


  public constructor(width: number, height: number) {
    if(width < 1 || width > Gif.MAX_DIMENSION) throw new RangeError(`Logical screen width must be at least 1 and at most ${Gif.MAX_DIMENSION}`)
    if(height < 1 || height > Gif.MAX_DIMENSION) throw new RangeError(`Logical screen height must be at least 1 and at most ${Gif.MAX_DIMENSION}`)
    this.width = width
    this.height = height
  }


  public static getBlockKind(label: number): 'graphic rendering' | 'control' | 'special purpose' | undefined {
    if(label >= 0 && label <= 0x7f) {
      // The Trailer block is in this range for some reason
      if(label == 0x3b) {
        return 'control'
      }
      return 'graphic rendering'
    } else if(label >= 0x80 && label <= 0xf9) {
      return 'control'
    } else if(label >= 0xfa && label <= 0xff) {
      return 'special purpose'
    } else {
      return undefined
    }
  }

  private static emitHeader(vec: ByteVector) {
    const HEADER = "GIF89a"
    for(let i = 0; i < HEADER.length; i++) {
      vec.addUint8(HEADER.charCodeAt(i))
    }
  }

  private emitLogicalScreenDescriptor(vec: ByteVector) {
    vec.addUint16(this.width)
    vec.addUint16(this.height)

    let packedField: number = 0

    packedField |= ((this.globalColorTable !== undefined) ? 1 : 0) << 7
    packedField |= Math.min(Math.max(0, this.colorBits - 1), 0b111) << 4
    packedField |= ((this.globalColorTable?.ordered ?? false) ? 1 : 0) << 3
    packedField |= this.globalColorTable?.sizefield ?? 0
    vec.addUint8(packedField)

    vec.addUint8(this.globalColorTable !== null ? this.backgroundColorIndex : 0)

    // TODO
    let aspectRatio: number = 0
    vec.addUint8(aspectRatio)

    if(this.globalColorTable !== undefined) {
      this.globalColorTable.emit(vec)
    }
  }

  private static emitTrailer(vec: ByteVector) {
    vec.addUint8(0x3b)
  }


  /** Encodes this GIF as binary data into the given ByteVector. */
  public createFile(vec: ByteVector) {
    for(const step of this.createFileStaged()) {
      step(vec)
    }
  }

  /** Returns the steps that {@link createFile} would perform, so that you can do them at your own pace. */
  public createFileStaged(): ((vec: ByteVector) => void)[] {
    for(const block of this.blocks) {
      const problem = block.isInvalidIn(this)
      if(problem !== null) {
        throw problem
      }
    }

    const steps = []

    steps.push((vec: ByteVector) => Gif.emitHeader(vec))
    steps.push((vec: ByteVector) => this.emitLogicalScreenDescriptor(vec))
    for(const block of this.blocks) {
      steps.push((vec: ByteVector) => block.emit(vec))
    }
    steps.push((vec: ByteVector) => Gif.emitTrailer(vec))

    return steps
  }


  /** Emits some data as GIF sub-blocks. */
  public static emitDataSubBlocks(data: Iterable<number>, vec: ByteVector) {
    function finishSubBlock() {
      vec.addUint8(size)
      for(let i = 0; i < size; i++) {
        vec.addUint8(buf[i])
      }
      size = 0
    }

    const buf = new Uint8ClampedArray(255)
    let size = 0

    for(const byte of data) {
      buf[size] = byte
      size += 1
      if(size >= 255) {
        finishSubBlock()
      }
    }

    if(size > 0) finishSubBlock() // Remaining data
    finishSubBlock() // Mandatory 0-size sub-block at the end
  }


  // TODO: color reducer
  // badness(color_small, color_big) = population(color_small) * difference(color_small, color_big)
  // keep doing the lowest-badness merges until the palette is small enough

  // TODO: figure out how to determine whether to use a global color table

}
