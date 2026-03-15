import { Block, Gif } from '../Gif'
import { ByteVector } from '../ByteVector'


/**
* - `undefined`: The decoder is not required to take any action.
* - `'preserve'`: The graphic is to be left in place.
* - `'background'`: Restore the area of the graphic to the background color.
* - `'previous'`: Restore the area of the graphic to whatever was there before the graphic was drawn.
*/
export type DisposalMethod = undefined | 'preserve' | 'background' | 'previous'

/**
* Acts upon the next {@link gif/blocks/Image.Image}.
*/
export class GraphicControl implements Block {

  /** What to do with the graphic after it has been displayed. */
  public disposalMethod: DisposalMethod = undefined
  /** Whether user input can also be used to advance to the next frame. If {@link delay} is also 0, the decoder is supposed to wait indefinitely for user input. */
  public userInput: boolean = false
  /** When defined, the color with this index acts as transparency. */
  public transparentIndex: number | undefined = undefined
  /** One delay is 10 ms. */
  public delay: number = 0


  // Block
  public emit(vec: ByteVector) {
    vec.addUint8(0x21) // Extension introducer
    vec.addUint8(0xf9) // Graphic control label
    vec.addUint8(4) // Block size

    let packedField = 0
    packedField |= GraphicControl.disposalMethodToNumber(this.disposalMethod) << 2
    packedField |= (this.userInput ? 1 : 0) << 1
    packedField |= ((this.transparentIndex !== undefined) ? 1 : 0)
    vec.addUint8(packedField)

    vec.addUint16(this.delay)

    // TODO should it actually be missing when undefined?
    vec.addUint8((this.transparentIndex !== undefined) ? this.transparentIndex : 0)

    vec.addUint8(0) // Block terminator
  }

  public isInvalidIn(_gif: Gif): RangeError | null {
    // TODO enhance isInvalidIn?
    return null
  }
  //


  private static disposalMethodToNumber(disposal: DisposalMethod): number {
    switch(disposal) {
      case undefined:
        return 0
      case 'preserve':
        return 1
      case 'background':
        return 2
      case 'previous':
        return 3
      default:
        return 0
    }
  }

}
