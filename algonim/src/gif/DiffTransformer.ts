import { Transformer, Block } from './Gif'
import { GraphicControl } from './blocks/GraphicControl'
import { Image } from './blocks/Image'


export class DiffTransformer implements Transformer {

  public readonly images: Image[] = []


  private static reduceToDiff(src: Image, dest: Image): Image {
    if(src.offsetX != dest.offsetX
      || src.offsetY != dest.offsetY
      || src.width != dest.width
      || src.height != dest.height) throw new RangeError("Images must have the same size and position.") // TO-DO be more general

    // Find the rectangle that contains all non-transparent indices
    // TO-DO there is a smarter way to do this, I just know it.
    let minX = dest.width
    let maxX = 0
    let minY = dest.height
    let maxY = 0
    let anySolid = false
    for(let y = 0; y < dest.height; y++) {
      for(let x = 0; x < dest.width; x++) {
        const srcColor = src.colorAt(x, y)
        const destColor = dest.colorAt(x, y)
        if(!(srcColor === destColor || destColor === undefined)) {
          anySolid = true
          minX = Math.min(x, minX)
          maxX = Math.max(x, maxX)
          minY = Math.min(y, minY)
          maxY = Math.max(y, maxY)
        }
      }
    }

    // Make an 1x1 image if there's nothing
    if(!anySolid) {
      minX = 0
      maxX = 0
      minY = 0
      maxY = 0
    }

    const diff = new Image(maxX - minX + 1, maxY - minY + 1, src.colorTable)
    diff.offsetX = minX
    diff.offsetY = minY
    diff.tableIsLocal = src.tableIsLocal
    if(diff.colorTable.reservedIndex === undefined) {
      // The color table should already have a reserved index
      throw new Error("This should never happen.")
    }

    // Draw colors where different, otherwise do transparency
    for(let y = 0; y < diff.height; y++) {
      for(let x = 0; x < diff.width; x++) {
        const srcColor = src.colorAt(x + diff.offsetX, y + diff.offsetY)
        const destColor = dest.colorAt(x + diff.offsetX, y + diff.offsetY)
        const writtenIndex = (srcColor === destColor || destColor === undefined)
          ? diff.colorTable.reservedIndex
          : diff.colorTable.getClosestColorIndex(destColor)
        diff.indices[(y * diff.width) + x] = writtenIndex
      }
    }

    return diff
  }

  public transform(blocks: Block[]): Block[] {
    const resultBlocks: Block[] = []

    let lastImage: Image | undefined = undefined

    for(let i = 0; i < blocks.length; i++) {
      const block = blocks[i]

      if(block instanceof Image) {
        if(lastImage === undefined) {
          lastImage = block
          resultBlocks.push(block)
        } else {
          // Get or create the control block for this image
          let control: GraphicControl
          {
            let previous: Block | undefined = i > 0 ? blocks[i - 1] : undefined
            if(previous instanceof GraphicControl) {
              control = previous
            } else {
              control = new GraphicControl()
              resultBlocks.push(control)
            }
          }

          if(block.colorTable.reservedIndex === undefined) {
            throw new Error("Image color tables doesn't have a reserved index to be used as transparency.") // TO-DO handle this with a one-color quantization step?
          }

          control.disposalMethod = 'preserve' // TO-DO exploit other disposal modes
          control.transparentIndex = block.colorTable.reservedIndex

          // Reduce to difference
          resultBlocks.push(DiffTransformer.reduceToDiff(lastImage, block))

          lastImage = block
        }
      } else {
        resultBlocks.push(block)
      }
    }

    return resultBlocks
  }

}
