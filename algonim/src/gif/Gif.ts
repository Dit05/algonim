

export class Gif {
  // https://www.w3.org/Graphics/GIF/spec-gif89a.txt

  /** Width of the Logical Screen. */
  readonly width: number
  /** Height of the Logical Screen. */
  readonly height: number

  readonly rawFrames: Uint8ClampedArray[] = []


  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }


  /**
  * Add a frame from image data bytes.
  *
  * @param order Swizzling order of bytes. Letters that don't correspond to any channel cause that byte to be ignored.
  */
  addFrame(bytes: { [key: number]: number, length: number }, order: string = 'RGB_', endianness: 'big' | 'little' = 'big') {
    function pushIntoChannel(channel: number, size: number, byte: number): number {
      if(endianness == 'little') {
        return channel + (byte << (8 * size))
      } else {
        return (channel << 8) + byte
      }
    }

    function getFinalValue(channel: number, size: number): number {
      const val = size > 0 ? channel / ((1 << (8 * size)) - 1) : 0
      return Math.round(val * 255)
    }

    const array = new Uint8ClampedArray(3 * this.width * this.height)
    let arrayIndex = 0

    let red: number = 0
    let redSize: number = 0
    let green: number = 0
    let greenSize: number = 0
    let blue: number = 0
    let blueSize: number = 0

    for(let i = 0; i < bytes.length; i++) {
      // Decide which channel to add it to
      switch(order.charAt(i % order.length)) {
        case 'R':
        case 'r':
          red = pushIntoChannel(red, redSize, bytes[i])
          redSize += 1
          break

        case 'G':
        case 'g':
          green = pushIntoChannel(green, greenSize, bytes[i])
          greenSize += 1
          break

        case 'B':
        case 'b':
          blue = pushIntoChannel(blue, blueSize, bytes[i])
          blueSize += 1
          break
      }

      // Last value of pixel?
      if(((i + 1) % order.length) == 0) {
        array[arrayIndex++] = getFinalValue(red, redSize)
        array[arrayIndex++] = getFinalValue(green, greenSize)
        array[arrayIndex++] = getFinalValue(blue, blueSize)

        red = 0
        redSize = 0
        green = 0
        greenSize = 0
        blue = 0
        blueSize = 0
      }
    }

    this.rawFrames.push(array)
  }

  // TODO: color reducer
  // badness(color_small, color_big) = population(color_small) * difference(color_small, color_big)
  // keep doing the lowest-badness merges until the palette is small enough

  // TODO: figure out how to determine whether to use a global color table

}
