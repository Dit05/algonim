import { Block, Gif } from '../Gif'
import { ByteVector } from '../ByteVector'


class GraphicControl implements Block {

  // Block
  public emit(vec: ByteVector) {
  }

  public isInvalidIn(gif: Gif): RangeError | null {
    return null
  }
  //

}
