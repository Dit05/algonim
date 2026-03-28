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
      function bitmask(bits: number) {
        return ((1 << bits) - 1) << (BYTE_LENGTH - bits) // Masks only the considered highest bits.
      }
      const redMask = bitmask(redBits)
      const greenMask = bitmask(greenBits)
      const blueMask = bitmask(blueBits)

      const map = new Map<Color, {
        count: number,
        avgRed: number,
        avgGreen: number,
        avgBlue: number
      }>()

      for(let i = 0; i < input.colors.length; i++) {
        const quantized: Color = ColorUtil.rgb8(
          reds[i] & redMask,
          greens[i] & greenMask,
          blues[i] & blueMask
        )

        let elem = map.get(quantized)
        if(elem === undefined) {
          elem = {
            count: 0,
            avgRed: 0,
            avgGreen: 0,
            avgBlue: 0
          }
          map.set(quantized, elem)
        }

        const count = input.counts[i]
        // JavaScript numbers are 64-bit floats, which should have integer precisions up until the quadrillions.
        elem.count += count
        elem.avgRed += reds[i] * count
        elem.avgGreen += greens[i] * count
        elem.avgBlue += blues[i] * count
      }

      const finalMap = new Map<Color, number>()
      for(const kvp of map) {
        finalMap.set(
          ColorUtil.rgb8(
            kvp[1].avgRed / kvp[1].count,
            kvp[1].avgGreen / kvp[1].count,
            kvp[1].avgBlue / kvp[1].count
          ),
          kvp[1].count
        )
      }

      return finalMap
    }


    // Find the spot with the most bits preserved where removing any more bits would make it overshoot
    let best: { spot: VisitSpot, map: Map<Color, number> } | undefined = undefined
    let lowestLoss: number | undefined = Infinity

    for(const spot of BitColorReducer.getVisitOrder()) {
      if(spot.loss > lowestLoss) break

      const reduced = reduceBits(spot.r, spot.g, spot.b)
      const sizeHere = reduced.size

      if(sizeHere <= targetSize) {
        // We just overshot
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
