import { ByteVector } from './ByteVector'
import { CouldBeIterable, makeIterable } from '@/util/TypeAdapters'


export type LossArguments = {
  fromColor: Color,
  fromPopulation: number,
  toColor: Color,
  toPopulation: number
}
export type LossFn = (args: LossArguments) => number
export type DistanceFn = (from: Color, to: Color) => number

export class ColorTable {

  // TODO docs
  public static readonly MIN_SIZEFIELD = 0
  public static readonly MAX_SIZEFIELD = 0b111

  public readonly sizefield: number
  public readonly colors: Uint32Array
  public ordered: boolean = false


  public constructor(sizefield: number) {
    this.sizefield = sizefield
    this.colors = new Uint32Array(ColorTable.sizefieldToSize(sizefield))
  }

  public static createQuantized(sizefield: number, colors: CouldBeIterable<Color>): ColorTable {
    // TODO
    throw new TypeError("Not implemented.")
  }


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

  public static defaultLossFn(args: LossArguments, distanceFn: DistanceFn = ColorTable.defaultDistanceFn): number {
    return distanceFn(args.fromColor, args.toColor) * args.fromPopulation
  }

  public static defaultDistanceFn(from: Color, to: Color): number {
    let difference = 0
    difference += Math.abs(ColorUtil.getRed(to) - ColorUtil.getRed(from))
    difference += Math.abs(ColorUtil.getGreen(to) - ColorUtil.getGreen(from))
    difference += Math.abs(ColorUtil.getBlue(to) - ColorUtil.getBlue(from))
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


export type Color = number

export class ColorUtil {

  public static getRed(packed: Color): number { return (packed >> 16) & 0xff }
  public static getGreen(packed: Color): number { return (packed >> 8) & 0xff }
  public static getBlue(packed: Color): number { return (packed >> 0) & 0xff }

  public static rgb8(red: number, green: number, blue: number): Color {
    function clamp(x: number) {
      if(x > 255) {
        return 255
      } else if(x >= 0) {
        // Returning the input purposefully isn't in the else branch, since NaN would also compare as ">= 0 but < 255"
        return x
      } else {
        return 0
      }
    }

    return clamp(blue)
        | (clamp(green) << 8)
        | (clamp(red) << 16)
  }

}
