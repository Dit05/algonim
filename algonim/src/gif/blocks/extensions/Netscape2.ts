import { iterateDataViewBytes } from '@/util/TypeAdapters'
import { Gif, b } from '../../Gif'
import { ApplicationExtension } from '../ApplicationExtension'


export class Netscape2 extends ApplicationExtension {

  /** Number of times the animation should loop. This is stored as a 2-byte unsigned integer. 0 means loop forever. */
  public loopCount: number = 0

  // Application Extension
  public constructor() {
    super('NETSCAPE')
  }

  protected getAuthenticationCode(): [number, number, number] {
    return [ b`2`, b`.`, b`0` ]
  }

  protected getData(): Iterable<number> {
    const loops: number = this.loopCount

    const data = new DataView(new ArrayBuffer(3))
    data.setUint8(0, 1) // ??? (TODO: find out what this is)
    data.setUint16(1, loops, true)

    return iterateDataViewBytes(data)
  }

  isInvalidIn(gif: Gif): Error | null {
    return super.isInvalidIn(gif)
  }
  //

}
