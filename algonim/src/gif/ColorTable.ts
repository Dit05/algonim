import { ByteVector } from './ByteVector'
import { Color, ColorUtil } from './Color'
import { ColorReducer, ColorArrays, toCounted } from './ColorReducer'


export type LossArguments = {
  fromColor: Color,
  fromPopulation: number,
  toColor: Color,
  toPopulation: number
}
export type LossFn = (args: LossArguments) => number
export type DistanceFn = (from: Color, to: Color) => number

export class ColorTable {

  public static readonly MIN_SIZEFIELD = 0
  public static readonly MAX_SIZEFIELD = 0b111

  /** Represents valid table sizes. @see {@link sizefieldToSize} */
  public readonly sizefield: number
  /** Colors in the table. @see {@link color} */
  public readonly colors: Uint32Array
  /** Whether colors are sorted in order of decreasing importance. */
  public ordered: boolean = false


  public constructor(sizefield: number) {
    this.sizefield = sizefield
    this.colors = new Uint32Array(ColorTable.sizefieldToSize(sizefield))
  }

  public static createQuantized(reducer: ColorReducer, sizefield: number, input: ColorArrays | ImageData): ColorTable {
    const table = new ColorTable(sizefield)

    // Type narrowing my beloved
    if(input instanceof ImageData) {
      input = toCounted(ColorUtil.imageDataToColors(input))
    }

    const reduced: ColorArrays = reducer.reduce(input, ColorTable.sizefieldToSize(sizefield))
    for(let i = 0; i < table.colors.length; i++) {
      table.colors[i] = reduced.colors[i]
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
  public getClosestColorIndex(target: Color, distanceFn: DistanceFn = ColorTable.defaultDistanceFn): number {
    let bestIndex = 0
    let bestMetric = Infinity

    for(let i = 0; i < this.colors.length; i++) {
      const metric = distanceFn(this.colors[i], target)
      if(metric < bestMetric) {
        bestIndex = i
        bestMetric = metric
      }
    }

    return bestIndex
  }

  /** Default implementation of {@link LossFn}. Multiplies the distance by fromPopulation. */
  public static defaultLossFn(args: LossArguments, distanceFn: DistanceFn = ColorTable.defaultDistanceFn): number {
    return distanceFn(args.fromColor, args.toColor) * args.fromPopulation
  }

  /** Default implementation of {@link DistanceFn}. Calculates the sum of squared error per component. */
  public static defaultDistanceFn(from: Color, to: Color): number {
    function square(x: number) { return x*x }
    let difference = 0
    difference += square(ColorUtil.getRed(to) - ColorUtil.getRed(from))
    difference += square(ColorUtil.getGreen(to) - ColorUtil.getGreen(from))
    difference += square(ColorUtil.getBlue(to) - ColorUtil.getBlue(from))
    return difference
  }


  public emit(vec: ByteVector) {
    for(const color of this.colors) {
      vec.addUint8(ColorUtil.getRed(color))
      vec.addUint8(ColorUtil.getGreen(color))
      vec.addUint8(ColorUtil.getBlue(color))
    }
  }

}


