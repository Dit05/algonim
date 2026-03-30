import { Color, ColorUtil } from './Color'
import { CouldBeIterable, makeIterable } from '@/util/TypeAdapters'
import * as CONFIG from '@/config'


export type ReductionBound = 'exact' | 'upper' | 'lower'

export type ColorArrays = {
  colors: ArrayLike<Color>,
  counts: ArrayLike<number>
}

export function checkInput(input: ColorArrays, targetSize: number | undefined = undefined) {
  if(input.colors.length != input.counts.length) throw new RangeError("colors.length must equal counts.length.")
  if(targetSize !== undefined && targetSize > input.colors.length) throw new RangeError("targetSize must not exceed input array lengths.")
}

function mapToArrays(map: Map<Color, number>): ColorArrays {
  const arrays = {
    colors: new Array(map.size),
    counts: new Array(map.size)
  }

  let i = 0
  for(const kvp of map) {
    arrays.colors[i] = kvp[0]
    arrays.counts[i] = kvp[1]
    i += 1
  }

  CONFIG.consistencyShuffle(arrays.colors, arrays.counts)

  return arrays
}

export function toCounted(colors: CouldBeIterable<Color>): ColorArrays {
  colors = makeIterable(colors)
  const map = new Map<Color, number>()

  for(const color of colors) {
    map.set(color, (map.get(color) ?? 0) + 1)
  }

  return mapToArrays(map)
}

export function mergeCounteds(arrays: CouldBeIterable<ColorArrays>): ColorArrays {
  arrays = makeIterable(arrays)
  const map = new Map<Color, number>()

  for(const array of arrays) {
    checkInput(array)
    for(let i = 0; i < array.colors.length; i++) {
      const color = array.colors[i]
      map.set(color, (map.get(color) ?? 0) + array.counts[i])
    }
  }

  return mapToArrays(map)
}


export abstract class ColorReducer {

  public abstract getBound(): ReductionBound

  public reduce(input: ColorArrays, targetSize: number): ColorArrays {
    function sumCounts(array: ArrayLike<number>): number | undefined {
      if(CONFIG.CONSISTENCY_CHECKS) {
        let sum = 0
        for(let i = 0; i < array.length; i++) {
          const here = array[i]
          if(isNaN(here)) CONFIG.warnInconsistency(`counts[${i}] is NaN`)
          else if(!isFinite(here)) CONFIG.warnInconsistency(`counts[${i}] is not finite`)
          sum += here
        }
        return sum
      } else {
        return undefined
      }
    }

    checkInput(input, targetSize)

    const preCounts = sumCounts(input.counts)
    const result = this._reduce(input, targetSize)
    const postCounts = sumCounts(result.counts)
    if(postCounts != preCounts) CONFIG.warnInconsistency(`Sum of counts array must remain unchanged after reduction. (was ${preCounts}, became ${postCounts})`)

    return result
  }
  protected abstract _reduce(input: ColorArrays, targetSize: number): ColorArrays

}


export class MatrixColorReducer/* extends ColorReducer*/ {
}
