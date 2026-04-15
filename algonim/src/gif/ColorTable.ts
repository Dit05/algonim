import { ByteVector } from './ByteVector'
import { Color, ColorUtil } from './Color'
import { ColorReducer, ColorArrays, toCounted } from './ColorReducer'
import { CouldBeIterable } from '@/util/TypeAdapters'
import { KDTree } from '@/util/KDTree'


export class ColorTable {

  public static readonly MIN_SIZEFIELD = 0
  public static readonly MAX_SIZEFIELD = 0b111

  /** Represents valid table sizes. @see {@link sizefieldToSize} */
  public readonly sizefield: number
  /** Colors in the table. @see {@link Color} */
  public readonly colors: Uint32Array
  /** Whether colors are sorted in order of decreasing importance. */
  public ordered: boolean = false
  /** Index of a color to never match with {@link getClosestColorIndex}. This is intended to be used with {@link gif/blocks/GraphicControl!GraphicControl}. */
  public reservedIndex: number | undefined = undefined

  private searchTree: KDTree | undefined = undefined


  public constructor(sizefield: number) {
    this.sizefield = sizefield

    const colorTable = this
    this.colors = new Proxy(new Uint32Array(ColorTable.sizefieldToSize(sizefield)), {
      get(target, prop: string | symbol, _receiver: any) {
        const value = Reflect.get(target, prop, target)
        if (typeof value === 'function') {
          return value.bind(target)
        }
        return value
      },
      set(target, prop: string | symbol, value: any, receiver: any) {
        // Invalidate the search tree whenever colors are modified
        colorTable.searchTree = undefined
        return Reflect.set(target, prop, value, receiver)
      }
    })
  }

  public static createQuantized(reducer: ColorReducer, sizefield: number, colors: ColorArrays | CouldBeIterable<Color> | ImageData, allowSmallerSizefield: boolean = false, transparency: boolean = false): ColorTable {
    // Type narrowing my beloved
    if(colors instanceof ImageData) {
      colors = ColorUtil.imageDataToColors(colors)
    }

    let arrays: ColorArrays = ('colors' in colors && 'counts' in colors)
      ? colors
      : toCounted(colors)

    if(allowSmallerSizefield) {
      sizefield = Math.min(sizefield, ColorTable.desiredSizeToSizefield(arrays.colors.length) ?? ColorTable.MAX_SIZEFIELD)
    }
    const table = new ColorTable(sizefield)

    let desiredCount = table.colors.length
    if(transparency) {
      desiredCount -= 1
      table.reservedIndex = table.colors.length - 1
    }

    if(arrays.colors.length > desiredCount) {
      arrays = reducer.reduce(arrays, desiredCount)
    }
    for(let i = 0; i < arrays.colors.length; i++) {
      table.colors[i] = arrays.colors[i]
    }

    return table
  }

  /** Creates a color table filled with colors ranging from black to white. */
  public static createGreyscale(sizefield: number): ColorTable {
    const table = new ColorTable(sizefield)
    for(let i = 0; i < table.colors.length; i++) {
      const fac = i / (table.colors.length - 1)
      table.colors[i] = ColorUtil.rgb(fac, fac, fac)
    }
    return table
  }

  /** Creates a color table filled with colors sampled along a cubic lattice from the RGB cube. Note that this implies a cubic number of colors, so the table won't be completely filled. */
  public static createEvenlyDistributed(sizefield: number): ColorTable {
    if(sizefield < 2) {
      return ColorTable.createGreyscale(sizefield)
    }

    const table = new ColorTable(sizefield)

    let edgeLength = 1
    while((edgeLength * edgeLength * edgeLength) <= table.colors.length) {
      edgeLength += 1
    }
    edgeLength -= 1

    for(let b = 0; b < edgeLength; b++) {
      for(let g = 0; g < edgeLength; g++) {
        for(let r = 0; r < edgeLength; r++) {
          let index = (b * edgeLength * edgeLength) + (g * edgeLength) + r
          table.colors[index] = ColorUtil.rgb(r / (edgeLength - 1), g / (edgeLength - 1), b / (edgeLength - 1))
        }
      }
    }

    return table
  }


  /** Converts a valid sizefield to an actual table size. */
  public static sizefieldToSize(sizefield: number) {
    if(sizefield < ColorTable.MIN_SIZEFIELD || sizefield > ColorTable.MAX_SIZEFIELD) throw new RangeError("sizefield must be between MIN_SIZEFIELD and MAX_SIZEFIELD.")
    return 1 << (sizefield + 1)
  }

  /**
  * Returns the smallest sizefield that encodes a size of at least desiredSize, or `undefined` if no sizefield can provide a size big enough.
  *
  * @param desiredSize Number of colors the color table should be able to hold.
  */
  public static desiredSizeToSizefield(desiredSize: number): number | undefined {
    for(let sf = ColorTable.MIN_SIZEFIELD; sf <= ColorTable.MAX_SIZEFIELD; sf++) {
      if(ColorTable.sizefieldToSize(sf) >= desiredSize) {
        return sf
      }
    }
    return undefined
  }


  /** Gets the index of the color that has the lowest distance to the target. */
  public getClosestColorIndex(target: Color): number {
    function colorToPoint(color: Color): [number, number, number] {
      return [ColorUtil.getRed(color), ColorUtil.getGreen(color), ColorUtil.getBlue(color)]
    }

    if(this.searchTree === undefined) {
      const colorTable = this
      this.searchTree = new KDTree(function*() {
        for(let i = 0; i < colorTable.colors.length; i++) {
          if(i != colorTable.reservedIndex) {
            yield colorToPoint(colorTable.colors[i])
          }
        }
      }())
    }

    const nearest = this.searchTree.findNearest(colorToPoint(target))
    return nearest.index
  }


  /** Emits this table's color data. */
  public emit(vec: ByteVector) {
    for(const color of this.colors) {
      vec.addUint8(ColorUtil.getRed(color))
      vec.addUint8(ColorUtil.getGreen(color))
      vec.addUint8(ColorUtil.getBlue(color))
    }
  }

}


