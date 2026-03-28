import { ColorReducer, ReductionBound, ColorArrays } from '../ColorReducer'
import { Color, ColorUtil } from '../Color'


export class MatrixColorReducer extends ColorReducer {

  public getBound(): ReductionBound {
    return 'exact'
  }

  protected _reduce(input: ColorArrays, targetSize: number): ColorArrays {
    throw new Error('Method not implemented.') // TODO
  }

}
