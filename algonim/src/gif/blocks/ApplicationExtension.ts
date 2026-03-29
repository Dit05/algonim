import { ByteVector } from '../ByteVector';
import { Block, Gif, toAscii } from '../Gif'


export abstract class ApplicationExtension implements Block {

  /** The first 8 characters of this will be written to the output as ASCII. If the string is not long enough, it will be padded with "zero" bytes. */
  public readonly applicationIdentifier: string


  public constructor(applicationIdentifier: string) {
    this.applicationIdentifier = applicationIdentifier
  }


  /** Gets three bytes that "authenticates" the application identifier. This is supposed to be used to distinguish between identical application identifiers. */
  protected abstract getAuthenticationCode(): [number, number, number]
  /** The bytes that should be written into the extension's data sub-blocks. */
  protected abstract getData(): Iterable<number>


  // Block
  emit(vec: ByteVector): void {
    vec.addUint8(0x21) // Extension introducer
    vec.addUint8(0xff) // Application extension label
    vec.addUint8(11) // Block size

    // Application identifier
    for(let i = 0; i < 8; i++) {
      const char = this.applicationIdentifier.charAt(i)
      vec.addUint8(char !== "" ? toAscii(char) : 0)
    }

    // Authentication code
    const authCode = this.getAuthenticationCode()
    for(let i = 0; i < authCode.length; i++) {
      vec.addUint8(authCode[i])
    }

    // Data
    Gif.emitDataSubBlocks(this.getData(), vec)
  }

  isInvalidIn(_gif: Gif): Error | null {
    return null
  }
  //

}
