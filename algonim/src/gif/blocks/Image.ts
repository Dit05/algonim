import { ByteVector } from '../ByteVector'
import { Block, Gif } from '../Gif'
import { ColorUtil, ColorTable } from '../ColorTable'
import { CouldBeIterable, makeIterable } from '@/util/TypeAdapters'


export class Image implements Block {

  /** Width of this Image. */
  public readonly width: number
  /** Height of this Image. */
  public readonly height: number

  /** Horizontal offset relative to the top left corner of the logical screen. */
  public offsetX: number = 0
  /** Vertical offset relative to the top left corner of the logical screen. */
  public offsetY: number = 0

  public readonly indices: Uint8ClampedArray
  public colorTable: ColorTable | undefined = undefined


  public constructor(width: number, height: number) {
    if(width < 1 || width > Gif.MAX_DIMENSION) throw new RangeError(`width must be at least 1 and at most ${Gif.MAX_DIMENSION}`)
    if(height < 1 || height > Gif.MAX_DIMENSION) throw new RangeError(`height must be at least 1 and at most ${Gif.MAX_DIMENSION}`)
    this.width = width
    this.height = height
    this.indices = new Uint8ClampedArray(width * height)
  }


  public static fromCanvasImageData(data: ImageData, colorTable: ColorTable | undefined): Image {
    if(data.colorSpace !== undefined && data.colorSpace !== 'srgb') {
      console.warn(`ImageData color space isn't 'srgb' (it's '${data.colorSpace}'), colors will likely be incorrect.`)
    }

    const result = Image.bytesToColorArray(data.width * data.height, data.data, 'RGB_', 'big')
    if(!result.fullyFilled) {
      console.warn("Image was somehow not fully filled when being created from canvas ImageData.")
    }

    return Image.fromColors(data.width, data.height, result.colors, colorTable)
  }


  // Block
  public emit(vec: ByteVector) {
    // TODO
  }

  public isInvalidIn(gif: Gif): RangeError | null {
    if(this.width > gif.width) return new RangeError("Image must not be more wide than the logical screen.")
    if(this.height > gif.height) return new RangeError("Image must not be more high than the logical screen.")
    if(this.offsetX < 0) return new RangeError("offsetX must be non-negative.")
    if(this.offsetY < 0) return new RangeError("offsetY must be non-negative.")
    if(this.offsetX + this.width > gif.width) return new RangeError("With offsetX this high, the image would extend past the boundary of the logical screen.")
    if(this.offsetY + this.height > gif.height) return new RangeError("With offsetY this high, the image would extend past the boundary of the logical screen.")
    return null
  }
  //

  private static emitDataSubBlocks(vec: ByteVector, data: Iterable<number>) {
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


  public static bytesToColorArray(length: number, bytes: CouldBeIterable<number>, order: string = 'RGB_', endianness: 'big' | 'little' = 'big'): { colors: Uint32Array, filledPixels: number, fullyFilled: boolean } {
    bytes = makeIterable(bytes)
    const colors = new Uint32Array(length)

    function pushIntoChannel(channel: number, size: number, byte: number): number {
      if(endianness == 'little') {
        return channel + (byte << (8 * size))
      } else {
        return (channel << 8) + byte
      }
    }

    function getFinalValue(channel: number, size: number): number {
      // Uint32Array will round 0-0.999... to 0 and 255-255.999... to 255. If we multiplied by only 255, then 255's band would be only the single max value.
      return (size > 0 ? channel / ((1 << (8 * size)) - 1) : 0) * 256
    }

    let arrayIndex = 0

    let swizzleIndex = 0
    let red: number = 0
    let redSize: number = 0
    let green: number = 0
    let greenSize: number = 0
    let blue: number = 0
    let blueSize: number = 0

    for(let byte of bytes) {
      // Decide which channel to add it to
      switch(order.charAt(swizzleIndex % order.length)) {
        case 'R':
        case 'r':
          red = pushIntoChannel(red, redSize, byte)
          redSize += 1
          break

        case 'G':
        case 'g':
          green = pushIntoChannel(green, greenSize, byte)
          greenSize += 1
          break

        case 'B':
        case 'b':
          blue = pushIntoChannel(blue, blueSize, byte)
          blueSize += 1
          break
      }

      // Last value of pixel?
      swizzleIndex += 1
      if(swizzleIndex == order.length) {
        colors[arrayIndex++] = ColorUtil.rgba8(
          getFinalValue(red, redSize),
          getFinalValue(green, greenSize),
          getFinalValue(blue, blueSize)
        )

        swizzleIndex = 0
        red = 0
        redSize = 0
        green = 0
        greenSize = 0
        blue = 0
        blueSize = 0
      }

      if(arrayIndex >= colors.length) {
        break
      }
    }

    return {
      colors,
      filledPixels: arrayIndex,
      fullyFilled: arrayIndex >= colors.length
    }
  }

  /**
  * Creates an image from a sequence of bytes.
  *
  * @param order Swizzling order of bytes. Letters that don't correspond to any channel cause that byte to be ignored. Valid channels are `R`/`r` for red, `G`/`g` for green, and `B`/`b` for blue.
  */
  public static fromColors(width: number, height: number, colors: Uint32Array, colorTable: ColorTable | undefined = undefined): Image {
    if(colors.length < width * height) throw new RangeError("Size of colors must be at least width * height.")
    if(colorTable === undefined) colorTable = ColorTable.createQuantized(ColorTable.MAX_SIZEFIELD, colors)

    const image = new Image(width, height)
    image.colorTable = colorTable
    for(let i = 0; i < width * height; i++) {
      image.indices[i] = colorTable.getClosestColorIndex(colors[i])
    }
    return image
  }

}
