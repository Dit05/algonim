import { Gif, b } from '../../Gif'
import { ApplicationExtension } from '../ApplicationExtension'


export class CodeEmbed extends ApplicationExtension {

  public utf8: Uint8Array

  // Application Extension
  public constructor(utf8: Uint8Array) {
    super('Algonim.')
    this.utf8 = utf8
  }

  protected getAuthenticationCode(): [number, number, number] {
    return [ b`1`, b`0`, b`0` ]
  }

  protected getData(): Iterable<number> {
    return this.utf8
  }

  isInvalidIn(gif: Gif): Error | null {
    return super.isInvalidIn(gif)
  }
  //

}
