import { ByteVector } from '../ByteVector'
import { Block, Gif } from '../Gif'
import { ColorTable } from '../ColorTable'
import { ColorUtil } from '../Color'
import { compress, CompressionFn } from '../VLCLZW'
import * as CONFIG from '@/config'


export class Image implements Block {

  /** Width of this Image. */
  public readonly width: number
  /** Height of this Image. */
  public readonly height: number

  /** Horizontal offset relative to the top left corner of the logical screen. */
  public offsetX: number = 0
  /** Vertical offset relative to the top left corner of the logical screen. */
  public offsetY: number = 0

  /** Indices into the color table, from left to right, top to bottom. */
  public readonly indices: Uint8ClampedArray
  public colorTable: ColorTable
  public tableIsLocal: boolean = true

  public compressionFn: CompressionFn = compress //(a, b) => stupidCompress(a, b, makeRandomizedStupidClearStategy(0.99))


  public constructor(width: number, height: number, colorTable: ColorTable) {
    if(width < 1 || width > Gif.MAX_DIMENSION) throw new RangeError(`width must be at least 1 and at most ${Gif.MAX_DIMENSION}`)
    if(height < 1 || height > Gif.MAX_DIMENSION) throw new RangeError(`height must be at least 1 and at most ${Gif.MAX_DIMENSION}`)
    this.width = width
    this.height = height
    this.colorTable = colorTable
    this.indices = new Uint8ClampedArray(width * height)
  }


  public static fromCanvasImageData(imageData: ImageData, colorProvider: ColorTable): Image {
    if(imageData.colorSpace !== undefined && imageData.colorSpace !== 'srgb') {
      console.warn(`ImageData color space isn't 'srgb' (it's '${imageData.colorSpace}'), colors will likely be incorrect.`)
    }

    return Image.fromColors(imageData.width, imageData.height, ColorUtil.imageDataToColors(imageData), colorProvider)
  }

  /**
  * Creates an image from a sequence of colors.
  *
  * @param colors Obviously the length of this array must be `width * height` to be able to fill in the entire image.
  * @param colorTable Color table to use. It will be stored in the resulting image and marked as local.
  */
  public static fromColors(width: number, height: number, colors: Uint32Array, colorTable: ColorTable): Image {
    if(colors.length !== width * height) throw new RangeError("Size of colors must be width * height.")

    const image = new Image(width, height, colorTable)
    image.tableIsLocal = true
    for(let i = 0; i < width * height; i++) {
      image.indices[i] = colorTable.getClosestColorIndex(colors[i])
    }

    return image
  }


  /** Creates an image that uses every color in the given color table once. */
  public static makePalette(colorTable: ColorTable): Image {
    const size = ColorTable.sizefieldToSize(colorTable.sizefield)
    const width = ColorTable.sizefieldToSize(colorTable.sizefield >> 1)
    // Genuis!
    const height = ((colorTable.sizefield & 0b1) == 0) ? width >> 1 : width

    const img = new Image(width, height, colorTable)
    if(CONFIG.CONSISTENCY_CHECKS) {
      if(img.indices.length != size) CONFIG.warnInconsistency(`Image pixel count should be ${size}, but it's ${img.indices.length}`)
    }

    for(let i = 0; i < img.indices.length; i++) {
      img.indices[i] = i
    }

    return img
  }



  // Block
  public emit(vec: ByteVector) {
    vec.addUint8(0x2c) // So-called "Image Separator".

    vec.addUint16(this.offsetX)
    vec.addUint16(this.offsetY)
    vec.addUint16(this.width)
    vec.addUint16(this.height)

    let packedField = 0
    packedField |= (this.tableIsLocal ? 1 : 0) << 7
    packedField |= 0 << 6 // Not interlaced.
    packedField |= ((this.tableIsLocal && this.colorTable.ordered) ? 1 : 0) << 5
    // (2 bits are reserved)
    packedField |= (this.tableIsLocal ? this.colorTable.sizefield : 0)
    vec.addUint8(packedField)

    if(this.tableIsLocal) {
      this.colorTable.emit(vec)
    }

    const codeSize = Math.max(2, this.colorTable.sizefield + 1)
    vec.addUint8(codeSize)
    Gif.emitDataSubBlocks(this.compressionFn(this.indices, codeSize), vec)
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

}
