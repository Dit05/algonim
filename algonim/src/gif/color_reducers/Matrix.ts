import { ColorReducer, ReductionBound, ColorArrays } from '../ColorReducer'
import { Color, ColorUtil } from '../Color'


export type LossArguments = {
  fromColor: Color,
  fromPopulation: number,
  toColor: Color,
  toPopulation: number
}
export type LossFn = (args: LossArguments) => number
export type DistanceFn = (from: Color, to: Color) => number

export class MatrixColorReducer extends ColorReducer {

  public getBound(): ReductionBound {
    return 'exact'
  }

  protected _reduce(input: ColorArrays, targetSize: number): ColorArrays {
    throw new Error('Method not implemented.') // TODO
  }



  /** Default implementation of {@link LossFn}. Multiplies the distance by fromPopulation. */
  public static defaultLossFn(args: LossArguments, distanceFn: DistanceFn = MatrixColorReducer.defaultDistanceFn): number {
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

}
