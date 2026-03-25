import { CouldBeIterable, makeIterable } from '@/util/TypeAdapters'


export type Color = number

export class ColorUtil {

  public static getRed(packed: Color): number { return (packed >> 16) & 0xff }
  public static getGreen(packed: Color): number { return (packed >> 8) & 0xff }
  public static getBlue(packed: Color): number { return (packed >> 0) & 0xff }


  /**
  * Constructs a color from individual channels.
  * @param convert Converts a channel to the [0, 255] range.
  */
  public static fromChannels(red: number, green: number, blue: number, convert: (x: number) => number): Color {
    function clamp(x: number) {
      x = Math.round(x)
      if(x > 255) {
        return 255
      } else if(x >= 0) {
        // Returning the input purposefully isn't in the else branch, since NaN would also compare as ">= 0 but < 255"
        return x
      } else {
        return 0
      }
    }

    return clamp(convert(blue))
        | (clamp(convert(green)) << 8)
        | (clamp(convert(red)) << 16)
  }

  /** Constructs a color from individual channels ranging from 0 to 255. */
  public static rgb8(red: number, green: number, blue: number): Color {
    return ColorUtil.fromChannels(red, green, blue, x => x)
  }

  /** Constructs a color from individual channels ranging from 0 to 1. */
  public static rgb(red: number, green: number, blue: number): Color {
    return ColorUtil.fromChannels(red, green, blue, x => x * 256)
  }

  /** Constructs a color from HSV values ranging from 0 to 1. */
  public static hsv(hue: number, saturation: number, value: number): Color {
    // https://en.wikipedia.org/wiki/File:HSV-RGB-comparison.svg
    function wedge(x: number) {
      return Math.max(0, Math.min(-(Math.abs(3 * x) - 6 / 6), 0.5))
    }

    let r = 0.5 + wedge(hue - 0) - wedge(hue - 3/6) + wedge(hue - 1)
    let g = 0.5 - wedge(hue + 1/6) + wedge(hue - 2/6) - wedge(hue - 5/6)
    let b = 0.5 - wedge(hue - 1/6) + wedge(hue - 4/6) - wedge(hue - 7/6)

    const m = value - (value * saturation)
    return ColorUtil.rgb(r*value + m, g*value + m, b*value + m)
  }

  /** Encodes a color as a hexadecimal string, like `#abcdef`. */
  public static toHexString(color: Color): string {
    function channel(val: number) {
      const HEX = '0123456789abcdef'
      return HEX.charAt((val >> 4) & 0x0F) + HEX.charAt(val & 0x0F)
    }
    return '#' + channel(ColorUtil.getRed(color)) + channel(ColorUtil.getGreen(color)) + channel(ColorUtil.getBlue(color))
  }


  /**
  * Interprets an array of bytes into colors.
  *
  * @param order Swizzling order of bytes. Letters that don't correspond to any channel cause that byte to be ignored. Valid channels are `R`/`r` for red, `G`/`g` for green, and `B`/`b` for blue.
  * @param endianness In big-endian mode, the first byte is the most significant, while in little-endian mode, it's the least significant.
  */
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
        colors[arrayIndex++] = ColorUtil.rgb8(
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

  public static imageDataToColors(imageData: ImageData): Uint32Array {
    const result = ColorUtil.bytesToColorArray(imageData.width * imageData.height, imageData.data, 'RGB_', 'big')
    if(!result.fullyFilled) {
      console.warn("Image was somehow not fully filled when being created from canvas ImageData.")
    }
    return result.colors
  }

}
