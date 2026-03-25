import { ColorReducer, ReductionBound, ColorArrays } from '../ColorReducer'


export type Tier = {
  reducer: ColorReducer,
  limit: number
}

export class TieredColorReducer extends ColorReducer {
  private readonly tiers: Tier[]

  public constructor(tiers: Tier[]) {
    super()

    this.tiers = tiers.slice().sort((a, b) => a.limit - b.limit) // Sort by limit ascending
  }

  public getBound(): ReductionBound {
    if(this.tiers.length > 0) {
      return this.tiers[0].reducer.getBound()
    } else {
      console.warn("Calling getBound on TieredColorReducer with no tiers. Such an instance is invalid and will never produce a result.")
      return 'exact'
    }
  }

  protected _reduce(input: ColorArrays, targetSize: number): ColorArrays {
    function failIfPastEnd(tiers: ArrayLike<Tier>, i: number): true | never /* Now THIS is a type! */ {
      if(i >= tiers.length) {
        throw new TypeError(`There's no tier that can handle a target size of ${targetSize}.`)
      } else {
        return true
      }
    }

    let index = 0
    while(failIfPastEnd(this.tiers, index) && input.colors.length > this.tiers[index].limit) {
      index += 1
    }

    let workingArray = input
    for(; index >= 0; index--) {
      let effectiveTargetSize = index > 0 ? this.tiers[index - 1].limit : targetSize
      effectiveTargetSize = Math.min(workingArray.colors.length, effectiveTargetSize)
      workingArray = this.tiers[index].reducer.reduce(workingArray, effectiveTargetSize)
    }

    return workingArray
  }
}
