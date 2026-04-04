import { ColorReducer, ReductionBound, ColorArrays } from '../ColorReducer'
import { Color, ColorUtil } from '../Color'
import { MinimumGrid } from '@/util/MinimumGrid'


export type LossArguments = {
  fromColor: Color,
  fromPopulation: number,
  toColor: Color,
  toPopulation: number
}

// 1540 -> 256 in 0.950019s
// 6006 -> 256 in 16.316993s
export class MatrixColorReducer extends ColorReducer {

  public getBound(): ReductionBound {
    return 'exact'
  }

  protected _reduce(input: ColorArrays, targetSize: number): ColorArrays {
    //const startMs = performance.now()
    let size = input.colors.length

    // col: destination
    // row: source
    let grid = new MinimumGrid(size)

    const counts = new Array(size)
    for(let i = 0; i < counts.length; i++) {
      counts[i] = input.counts[i]
    }

    function computeCell(col: number, row: number) {
      grid.data[grid.index(col, row)] = (col == row || counts[row] == 0 || counts[col] == 0)
        ? Infinity
        : MatrixColorReducer.lossFn({
            // OPTIMIZE is it faster to have 4 separate arguments?
            fromColor: input.colors[row],
            fromPopulation: input.counts[row],
            toColor: input.colors[col],
            toPopulation: input.counts[col]
          })
    }

    // Initialize grid
    for(let row = 0; row < input.colors.length; row++) {
      for(let col = 0; col < input.colors.length; col++) {
        computeCell(col, row)
      }
    }
    grid.recomputeAll()

    // Reduce
    while(size > targetSize) {
      const [to, from] = grid.getMinimumCoord()
      //console.log(`${from} -> ${to} (cost: ${grid.data[grid.index(to, from)]}`)
      if(to === from || counts[from] <= 0 || counts[to] <= 0) throw new Error("This should never happen.")

      counts[to] += counts[from]
      counts[from] = 0
      size -= 1

      // Delete source
      grid.fillCol(from, Infinity)
      grid.fillRow(from, Infinity)
      grid.dirtyCol(from)
      grid.dirtyRow(from)

      // Update cells where the source is the color we just expanded
      for(let col = 0; col < counts.length; col++) {
        computeCell(col, to)
      }
      grid.dirtyRow(to)

      grid.recomputeDirty()
    }

    // Construct output arrays
    {
      let outputIndex = 0
      const outputColors = new Uint32Array(size)
      const outputCounts = new Uint32Array(size)

      for(let i = 0; i < counts.length; i++) {
        if(counts[i] > 0) {
          outputColors[outputIndex] = input.colors[i]
          outputCounts[outputIndex] = counts[i]
          outputIndex += 1
        }
      }
      if(outputIndex != size) throw new Error("This should never happen.")

      //const endMs = performance.now()
      //const seconds = (endMs - startMs) * 0.001
      //console.log(`${input.colors.length} -> ${targetSize} in ${seconds}s`)

      return {
        colors: outputColors,
        counts: outputCounts
      }
    }
  }



  // It is not faster to pass arguments to this separately.
  public static lossFn(args: LossArguments): number {
    return MatrixColorReducer.distanceFn(args.fromColor, args.toColor) * args.fromPopulation
  }

  public static distanceFn(from: Color, to: Color): number {
    function square(x: number) { return x*x }
    let difference = 0
    difference += square(ColorUtil.getRed(to) - ColorUtil.getRed(from))
    difference += square(ColorUtil.getGreen(to) - ColorUtil.getGreen(from))
    difference += square(ColorUtil.getBlue(to) - ColorUtil.getBlue(from))
    return difference
  }

}

