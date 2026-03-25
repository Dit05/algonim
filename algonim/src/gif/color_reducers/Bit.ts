import { ColorReducer, ReductionBound, ColorArrays } from '../ColorReducer'
import { Color, ColorUtil } from '../Color'


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
            // Also penalize differences between channels to encourage a more balanced distribution.
            function f(x: number): number { return (BYTE_LENGTH - x) * (BYTE_LENGTH - x) }
            order[i++] = {r, g, b, loss: f(r) + f(g) + f(b) + Math.abs(r - g) + Math.abs(r - b) + Math.abs(g - b)}
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

    let reds: number[] = new Array(input.colors.length)
    let greens: number[] = new Array(input.colors.length)
    let blues: number[] = new Array(input.colors.length)


    // Genuis! Sort colors so that the ones merged by bit discarding become adjecent for easier counting
    for(let i = 0; i < input.colors.length; i++) {
      reds[i] = ColorUtil.getRed(input.colors[i])
      greens[i] = ColorUtil.getGreen(input.colors[i])
      blues[i] = ColorUtil.getBlue(input.colors[i])
    }



    function reduceBits(redBits: number, greenBits: number, blueBits: number): Map<Color, number> {
      // TODO average
      function bitmask(bits: number) {
        return ((1 << bits) - 1) << (BYTE_LENGTH - bits) // Masks only the considered highest bits.
      }

      let avgRed = 0
      let avgGreen = 0
      let avgBlue = 0
      let avgWeight = 0
      let countAccumulator = 0 // Like avgWeight, but unscaled.

      const map = new Map()
      const redMask = bitmask(redBits)
      const greenMask = bitmask(greenBits)
      const blueMask = bitmask(blueBits)

      for(let i = 0; i < input.colors.length; i++) {
        const quantized: Color = ColorUtil.rgb8(
          reds[i] & redMask,
          greens[i] & greenMask,
          blues[i] & blueMask
        )

        map.set(quantized, (map.get(quantized) ?? 0) + input.counts[i])
      }

      return map
    }


    const excludeCube: boolean[] = new Array((BYTE_LENGTH + 1) * (BYTE_LENGTH + 1) * (BYTE_LENGTH + 1))
    function cubeIndex(x: number, y: number, z: number) {
      const STRIDE = BYTE_LENGTH + 1
      return (z * STRIDE * STRIDE) + (y * STRIDE) + x
    }
    function excludePast(x: number, y: number, z: number) {
      for(let k = z; k >= 0; k--) {
        for(let j = y; j >= 0; j--) {
          for(let i = x; i >= 0; i--) {
            excludeCube[cubeIndex(i, j, k)] = true
          }
        }
      }
    }

    // Find the spot with the most bits preserved where removing any more bits would make it overshoot
    let best: { spot: VisitSpot, map: Map<Color, number> } | undefined = undefined
    let lowestLoss: number | undefined = Infinity

    for(const spot of BitColorReducer.getVisitOrder()) {
      if(excludeCube[cubeIndex(spot.r, spot.g, spot.b)] === true) continue

      const reduced = reduceBits(spot.r, spot.g, spot.b)
      const sizeHere = reduced.size

      if(sizeHere <= targetSize) {
        // We just overshot
        excludePast(spot.r, spot.g, spot.b)
        if(best === undefined || (spot.loss <= lowestLoss && sizeHere > best.map.size)) {
          best = {
            spot,
            map: reduced
          }
          lowestLoss = spot.loss
        }
      }
    }
    lowestLoss = undefined // Not relevant anymore

    if(best === undefined) throw new Error("This should never happen.")

    if(this.mode === 'undershoot') {
      // Pick one bit to re-add to get to >= targetSize
      const spots: VisitSpot[] = []
      if(best.spot.r < BYTE_LENGTH) spots.push({...best.spot, r: best.spot.r + 1})
      if(best.spot.g < BYTE_LENGTH) spots.push({...best.spot, g: best.spot.g + 1})
      if(best.spot.b < BYTE_LENGTH) spots.push({...best.spot, b: best.spot.b + 1})

      let bestSize = Infinity
      for(const spot of spots) {
        const bitRestored = reduceBits(spot.r, spot.g, spot.b)
        if(bitRestored.size < bestSize) {
          best = {
            spot,
            map: bitRestored
          }
          bestSize = bitRestored.size
        }
      }
    }


    // Construct output arrays
    {
      const outputColors = new Uint32Array(best.map.size)
      const outputCounts = new Uint32Array(best.map.size)

      let i = 0
      for(const kvp of best.map) {
        outputColors[i] = kvp[0]
        outputCounts[i] = kvp[1]
        i += 1
      }

      return {
        colors: outputColors,
        counts: outputCounts
      }
    }
  }

}
