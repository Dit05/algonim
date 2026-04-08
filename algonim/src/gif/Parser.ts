import { Gif, Block } from './Gif'
import { ApplicationExtension } from './blocks/ApplicationExtension'
import { CodeEmbed } from './blocks/extensions/CodeEmbed'
import { ColorTable } from './ColorTable'


function notAGifError(): Error {
  return new Error("File is not a valid GIF.")
}


export type BlockSignature = {
  offset: number,
  info: BlockInfo
}
export type BlockInfo = {
  type: 'image descriptor'
} | {
  type: 'extension',
  extensionType: 'graphic control' | 'comment' | 'plain text'
} | {
  type: 'extension',
  extensionType: 'application',
  identifier: string,
  authenticationCode: [number, number, number]
} | {
  type: 'extension',
  extensionType: 'unknown',
  extensionLabel: number
} | {
  type: 'trailer',
  remainingBytes: number
} | {
  type: 'unknown',
  specifierByte: number
}


export class Parser {

  public readonly bytes: Uint8Array
  public readonly manifest: BlockSignature[] = []

  public constructor(bytes: Uint8Array) {
    this.bytes = bytes
    Parser.discoverBlocks(bytes, this.manifest)
  }

  // Genuis! Write blocks into external array, so that if an exception happens, partial results still get appended.
  /** Finds the locations of blocks within a byte array. Throws if the data doesn't resemble a valid GIF. */
  public static discoverBlocks(bytes: Uint8Array, destination: BlockSignature[]) {
    function skipColorTable(packedByte: number) {
      const hasTable: boolean = (packedByte & 0b1000_0000) > 0
      if(hasTable) {
        const sizefield = packedByte & 0b0000_0111
        const size = ColorTable.sizefieldToSize(sizefield)
        index += size * 3
      }
    }

    function skipData() {
      while(bytes[index] > 0) {
        index += bytes[index] + 1
      }
      index += 1
    }

    const LOGICAL_SCREEN_DESCRIPTOR_LENGTH = 6
    if(bytes.length < Gif.SIGNATURE.length + Gif.VERSION.length + LOGICAL_SCREEN_DESCRIPTOR_LENGTH + 1 /* Trailer */) {
      throw notAGifError()
    }

    for(let i = 0; i < Gif.SIGNATURE.length; i++) {
      if(bytes[i] !== Gif.SIGNATURE.charCodeAt(i)) {
        throw notAGifError()
      }
    }

    let index = Gif.SIGNATURE.length + Gif.VERSION.length

    // Skip the Logical Screen Descriptor
    skipColorTable(bytes[index + 4])
    index += 7

    // Read blocks
    while(index < bytes.length) {
      const offset = index

      const specifier = bytes[index]
      let info: BlockInfo
      let problem: Error | undefined = undefined

      switch(specifier) {
        case 0x2c: {
          // Image Descriptor
          info = { type: 'image descriptor' }
          skipColorTable(bytes[index + 11])
          index += 11
          skipData()
        } break

        case 0x21: {
          // Extension
          const extensionLabel = bytes[index + 1]

          // TO-DO label the cases based on static fields in blocks
          switch(extensionLabel) {
            case 0xf9: {
              // Graphic Control
              info = { type: 'extension', extensionType: 'graphic control' }
            } break
            case 0xfe: {
              // Comment
              info = { type: 'extension', extensionType: 'comment' }
            } break
            case 0x01: {
              // Plain Text
              info = { type: 'extension', extensionType: 'plain text' }
            } break
            case 0xff: {
              // Application
              let id = ''
              for(let i = 0; i < 8; i++) {
                id += String.fromCharCode(bytes[index + 3 + i])
              }
              info = { type: 'extension', extensionType: 'application', identifier: id, authenticationCode: [bytes[index + 11], bytes[index + 12], bytes[index + 13]] }
            } break
            default: {
              // ???
              info = { type: 'extension', extensionType: 'unknown', extensionLabel: extensionLabel }
            }
          }

          index += 2
          skipData()
        } break

        case 0x3b: {
          // Trailer
          info = { type: 'trailer', remainingBytes: bytes.length - index - 1 }
        } break

        default: {
          // Unknown
          info = { type: 'unknown', specifierByte: specifier }
          problem = new Error("Unknown block type found that cannot be skipped. Block discovery cannot continue.")
        }
      }

      destination.push({ offset, info })

      // Defer throwing to after the unknown block is added
      if(problem !== undefined) throw problem

      if(info.type === 'trailer') break
    }
  }

  private readData(start: number): Uint8Array {
    let byteCount = 0
    let index = start
    while(this.bytes[index] != 0) {
      byteCount += this.bytes[index]
      index += this.bytes[index] + 1
    }

    let outputIndex = 0
    const buffer = new Uint8Array(byteCount)
    index = start
    while(this.bytes[index] != 0) {
      let thisSize = this.bytes[index]
      index += 1

      while(thisSize --> 0) {
        buffer[outputIndex++] = this.bytes[index]
        index += 1
      }
    }

    if(outputIndex != byteCount) throw new Error("This should never happen.")

    return buffer
  }


  public readBlock(sig: BlockSignature): Block {
    // TO-DO support everything
    switch(sig.info.type) {
      case 'extension': {
        switch(sig.info.extensionType) {
          case 'application': {
            if(sig.info.identifier === CodeEmbed.ID) {
              return new CodeEmbed(this.readData(sig.offset + 14))
            } else {
              throw new TypeError("Reading generic Application Extension blocks isn't supported.")
            }
          }

          default: {
            throw new TypeError(`Reading '${sig.info.extensionType}' extension blocks isn't supported.`)
          }
        }
      }

      default: {
        throw new TypeError(`Reading '${sig.info.type}' blocks isn't supported.`)
      }
    }
  }

}
