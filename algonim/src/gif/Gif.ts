

interface Block {
}

class Color {

  public static rgba8(red: number, green: number, blue: number, alpha: number = 255): number {
    function clamp(x: number) {
      if(x > 255) {
        return 255
      } else if(x >= 0) {
        // Returning the input purposefully isn't in the else branch, since NaN would also compare as ">= 0 but < 255"
        return x
      } else {
        return 0
      }
    }

    return clamp(red)
        | (clamp(green) << 8)
        | (clamp(blue) << 16)
        | (clamp(alpha) << 24)
  }

}

class Image implements Block {

  /** Width of this Image. */
  public readonly width: number
  /** Height of this Image. */
  public readonly height: number

  // Uint32Array's endianness is system-dependent!
  private readonly data: Uint32Array


  public constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.data = new Uint32Array(width * height)
  }


  static isIterable<T>(obj: any): obj is Iterable<T> {
    return (obj !== null) && (Symbol.iterator in obj) && (typeof(obj[Symbol.iterator]) === 'function')
  }

  /**
  * Populates this image's pixels via a sequence of bytes.
  *
  * @param order Swizzling order of bytes. Letters that don't correspond to any channel cause that byte to be ignored. Valid channels are `R`/`r` for red, `G`/`g` for green, and `B`/`b` for blue.
  */
  public fillData(bytes: { [key: number]: number, length: number } | Iterable<number>, order: string = 'RGB_', endianness: 'big' | 'little' = 'big'): { filledPixels: number, fullyFilled: boolean } {
    // If bytes is only indexable rather than Iterable, wrap it
    if(!(Image.isIterable(bytes))) {
      const narrowedBytes = bytes
      bytes = function*() {
        for(let i = 0; i < narrowedBytes.length; i++) {
          yield narrowedBytes[i]
        }
      }()
    }

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
        this.data[arrayIndex++] = Color.rgba8(
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

      if(arrayIndex >= this.data.length) {
        break
      }
    }

    return {
      filledPixels: arrayIndex,
      fullyFilled: arrayIndex >= this.data.length
    }
  }
}

export class Gif {
  // https://www.w3.org/Graphics/GIF/spec-gif89a.txt
  // GIF is little endian

  /** Width of the Logical Screen. */
  public readonly width: number
  /** Height of the Logical Screen. */
  public readonly height: number

  private readonly blocks: Block[] = []


  public constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }


  public addImage(data: ImageData) {
    if(data.width > this.width) throw new RangeError("Image data must not be more wide than the logical screen.")
    if(data.height > this.height) throw new RangeError("Image data must not be more high than the logical screen.")

    const img = new Image(data.width, data.height)
    if(data.colorSpace !== 'srgb') {
      console.warn("ImageData color space isn't 'srgb', GIF colors will likely be incorrect.")
    }

    let result = img.fillData(data.data)
    if(!result.fullyFilled) {
      console.warn("Image was somehow not fully filled from ImageData.")
    }

    this.blocks.push(img)
  }


  // TODO: color reducer
  // badness(color_small, color_big) = population(color_small) * difference(color_small, color_big)
  // keep doing the lowest-badness merges until the palette is small enough

  // TODO: figure out how to determine whether to use a global color table

}
