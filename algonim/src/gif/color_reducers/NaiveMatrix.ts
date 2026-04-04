import { ColorReducer, ReductionBound, ColorArrays } from '../ColorReducer'
import { MatrixColorReducer } from './Matrix' // For distance and loss functions.


// 1540 -> 256 in 28.983913s
// 6006 -> 256 in 1649.116315s (27 and a half minutes)
export class NaiveMatrixColorReducer extends ColorReducer {

  public getBound(): ReductionBound {
    return 'exact'
  }

  protected _reduce(input: ColorArrays, targetSize: number): ColorArrays {
    if(targetSize < 1) throw new RangeError("targetSize must be at least 1.")

    const originalCount = input.colors.length
    console.log(`Reducing ${originalCount} colors via naive matrix reducer`)
    const startMs = performance.now()

    let colorCount = input.colors.length
    let deletes: boolean[] = []
    let deleteCount: number = 0
    let counts: number[] = []
    initializeTemporaryArrays()

    function applyDeletions(): ColorArrays {
      const output = {
        colors: new Array(colorCount),
        counts: new Array(colorCount)
      }
      let outputIndex = 0
      for(let i = 0; i < input.colors.length; i++) {
        if(deletes[i]) continue
        output.colors[outputIndex] = input.colors[i]
        output.counts[outputIndex] = counts[i]
        outputIndex += 1
      }
      if(outputIndex != colorCount) throw new Error("This should never happen.")
      return output
    }
    function initializeTemporaryArrays() {
      deletes = new Array(input.colors.length)
      counts = new Array(input.counts.length)
      for(let i = 0; i < input.colors.length; i++) {
        deletes[i] = false
        counts[i] = input.counts[i]
      }
    }

    while(colorCount > targetSize) {
      let best = {
        from: -1,
        to: -1,
        loss: Infinity
      }
      for(let j = 0; j < input.colors.length; j++) {
        if(deletes[j]) continue
        for(let i = 0; i < input.colors.length; i++) {
          if(i == j) continue
          if(deletes[i]) continue

          const lossHere = MatrixColorReducer.lossFn({
              fromColor: input.colors[j], fromPopulation: counts[j],
              toColor: input.colors[i], toPopulation: counts[i]
            })

          if(lossHere < best.loss) {
            best.loss = lossHere
            best.from = j
            best.to = i
          }
        }
      }

      if(best.from === -1 || best.to === -1) throw new Error("This should never happen.")

      if(colorCount % 10 == 0) {
        console.log(`${colorCount}/${targetSize}`)
      }
      counts[best.to] += counts[best.from]
      deletes[best.from] = true
      colorCount -= 1
      deleteCount += 1

      // Apply deletions to the arrays after an arbitrary amount have accumulated
      if(deleteCount >= 256) {
        console.log("Applying deletions")
        input = applyDeletions()
        initializeTemporaryArrays()
        deleteCount = 0
      }
    }


    const endMs = performance.now()
    const seconds = (endMs - startMs) * 0.001
    console.log(`${originalCount} -> ${colorCount} in ${seconds}s`)

    return applyDeletions()
  }

}
