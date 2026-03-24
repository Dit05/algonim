import { ColorReducer, ReductionBound, ColorArrays } from '../ColorReducer'
import { ColorUtil } from '../Color'
import * as CONFIG from '@/config'


type VisitSpot = {
  r: number,
  g: number,
  b: number,
  loss: number
}

export class BitColorReducer extends ColorReducer {

  private static readonly BYTE_LENGTH = 8

  private static cachedVisitOrder: VisitSpot[] | null = null
  private static getVisitOrder(): VisitSpot[] {
    if(BitColorReducer.cachedVisitOrder === null) {
      const order: VisitSpot[] = new Array((BitColorReducer.BYTE_LENGTH + 1) * (BitColorReducer.BYTE_LENGTH + 1) * (BitColorReducer.BYTE_LENGTH + 1))
      const BYTE_LENGTH = BitColorReducer.BYTE_LENGTH // Alias it for brevity
      let i = 0
      for(let b = 0; b <= BYTE_LENGTH; b++) {
        for(let g = 0; g <= BYTE_LENGTH; g++) {
          for(let r = 0; r <= BYTE_LENGTH; r++) {
            // Loss scoring should make more significant bits more valuable.
            function f(x: number): number { return (BYTE_LENGTH - x) * (BYTE_LENGTH - x) }
            order[i++] = {r, g, b, loss: f(r) + f(g) + f(b)}
          }
        }
      }
      BitColorReducer.cachedVisitOrder = order.sort((a, b) => {
        return a.loss - b.loss // a - b for ascending order
      })
    }
    return BitColorReducer.cachedVisitOrder
  }


  public mode: 'overshoot' | 'undershoot' = 'overshoot'

  public getBound(): ReductionBound {
    switch(this.mode) {
      case 'overshoot': return 'lower'
      case 'undershoot': return 'upper'
    }
  }

  protected _reduce(input: ColorArrays, targetSize: number): ColorArrays {
    const BYTE_LENGTH = BitColorReducer.BYTE_LENGTH // Alias it for brevity

    function reverseBits(x: number): number {
      let result = 0
      let len = BYTE_LENGTH
      while(len --> 0) {
        result |= (((x & (1 << len)) > 0) ? 1 : 0) << (BYTE_LENGTH - 1 - len)
      }
      return result
    }

    let reds = new Array(input.colors.length)
    let greens = new Array(input.colors.length)
    let blues = new Array(input.colors.length)

    let active = new Array(input.colors.length)
    for(let i = 0; i < input.colors.length; i++) {
      active[i] = i
    }


    // Genuis! Sort colors so that the ones merged by bit discarding become adjecent for easier counting
    for(let i = 0; i < input.colors.length; i++) {
      reds[i] = reverseBits(ColorUtil.getRed(input.colors[i]))
      greens[i] = reverseBits(ColorUtil.getGreen(input.colors[i]))
      blues[i] = reverseBits(ColorUtil.getBlue(input.colors[i]))
    }

    const byRed = [...active].sort((a, b) => reds[a] - reds[b])
    const byGreen = [...active].sort((a, b) => greens[a] - greens[b])
    const byBlue = [...active].sort((a, b) => blues[a] - blues[b])

    for(let i = 0; i < input.colors.length; i++) {
      reds[i] = reverseBits(reds[i])
      greens[i] = reverseBits(greens[i])
      blues[i] = reverseBits(blues[i])
    }


    function computeMask(srcIndices: number[], data: number[], bits: number): boolean[] {
      const BITMASK = ((1 << bits) - 1) << (BYTE_LENGTH - bits) // Masks only the considered highest bits.
      const deletes: boolean[] = new Array(srcIndices.length)

      if(bits <= 0) {
        for(let i = 0; i < srcIndices.length; i++) {
          deletes[i] = true
        }
        return deletes
      }

      // For every run of effectively consecutive values, mark the lowest unsorted-index as kept, and the rest of the run as deleted
      let runColor = -1
      let runLowestIndex = 0

      for(let i = 0; i < srcIndices.length; i++) {
        const here = data[srcIndices[i]] & BITMASK

        deletes[srcIndices[i]] = true
        if(here != runColor) {
          runColor = here
          deletes[runLowestIndex] = false
          runLowestIndex = srcIndices[i]
        } else {
          runLowestIndex = Math.min(runLowestIndex, srcIndices[i])
        }
      }

      return deletes
    }

    // TODO make these lazy?
    const redMasks = new Array(BYTE_LENGTH + 1)
    const greenMasks = new Array(BYTE_LENGTH + 1)
    const blueMasks = new Array(BYTE_LENGTH + 1)
    for(let i = 0; i <= BYTE_LENGTH; i++) {
      redMasks[i] = computeMask(byRed, reds, i)
      greenMasks[i] = computeMask(byGreen, greens, i)
      blueMasks[i] = computeMask(byBlue, blues, i)
    }

    function computeSizeWithThisManyBits(redBits: number, greenBits: number, blueBits: number) {
      const red = redMasks[redBits]
      const green = greenMasks[greenBits]
      const blue = blueMasks[blueBits]

      let removed = 0
      for(let i = 0; i < red.length; i++) {
        if(red[i] && green[i] && blue[i]) removed += 1
      }

      return input.colors.length - removed
    }


    // TODO under/overshoot

    const excludeCube: boolean[] = new Array((BYTE_LENGTH + 1) * (BYTE_LENGTH + 1) * (BYTE_LENGTH + 1))
    function cubeIndex(x: number, y: number, z: number) {
      const STRIDE = BYTE_LENGTH + 1
      return (z * STRIDE * STRIDE) + (y * STRIDE) + x
    }
    function excludePast(x: number, y: number, z: number) {
      // TODO
      for(let k = z; k >= 0; k--) {
        for(let j = y; j >= 0; j--) {
          for(let i = x; i >= 0; i--) {
            excludeCube[cubeIndex(i, j, k)] = true
          }
        }
      }
    }

    // Find the spot with the most bits preserved where removing any more bits would make it overshoot

    let bestSpot: VisitSpot | undefined = undefined
    let bestSize: number = NaN
    let bestLoss: number | undefined = Infinity

    console.log(BitColorReducer.getVisitOrder())
    for(const spot of BitColorReducer.getVisitOrder()) {
      if(excludeCube[cubeIndex(spot.r, spot.g, spot.b)] === true) continue

      const sizeHere = computeSizeWithThisManyBits(spot.r, spot.g, spot.b)

      if(sizeHere <= targetSize) {
        // We just overshot
        if(bestSpot === undefined || (spot.loss <= bestLoss && sizeHere > bestSize)) {
          bestSpot = spot
          bestSize = sizeHere
          bestLoss = spot.loss
          console.log(`${bestSpot} ${bestLoss} ${bestSize}`)
        }
      }
    }
    bestLoss = undefined // Not relevant anymore

    if(bestSpot === undefined) throw new Error("This should never happen.")

    if(this.mode === 'undershoot') {
      // Pick one bit to re-add to get to >= targetSize
      const spots: VisitSpot[] = []
      if(bestSpot.r < BYTE_LENGTH) spots.push({...bestSpot, r: bestSpot.r + 1})
      if(bestSpot.g < BYTE_LENGTH) spots.push({...bestSpot, g: bestSpot.g + 1})
      if(bestSpot.b < BYTE_LENGTH) spots.push({...bestSpot, b: bestSpot.b + 1})

      bestSize = Infinity
      for(const spot of spots) {
        const sizeHere = computeSizeWithThisManyBits(spot.r, spot.g, spot.b)
        if(sizeHere < bestSize) {
          bestSpot = spot
          bestSize = sizeHere
        }
      }
    }


    // Construct output arrays
    {
      const outputColors = new Uint32Array(bestSize)
      const outputCounts = new Uint32Array(bestSize)

      let outputIndex = 0
      const red = redMasks[bestSpot.r]
      const green = greenMasks[bestSpot.g]
      const blue = blueMasks[bestSpot.b]
      for(let i = 0; i < input.colors.length; i++) {
        if(red[i] && green[i] && blue[i]) {
          // Deleted
          if(CONFIG.CONSISTENCY_CHECKS && i <= 0) CONFIG.warnInconsistency("Color deletions should only occur starting at index 1.")
          outputCounts[outputIndex - 1] += input.counts[i]
        } else {
          // Kept
          // TODO average out the discarded bits
          outputColors[outputIndex] = input.colors[i]
          outputCounts[outputIndex] += input.counts[i]
          outputIndex += 1
        }
      }

      return {
        colors: outputColors,
        counts: outputCounts
      }
    }
  }

}
