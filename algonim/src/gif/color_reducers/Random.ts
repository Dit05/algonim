import { ColorReducer, ReductionBound, ColorArrays } from '../ColorReducer'


export class RandomColorReducer extends ColorReducer {

  public getBound(): ReductionBound { return 'exact' }

  protected override _reduce(input: ColorArrays, targetSize: number): ColorArrays {
    if(targetSize <= 0) {
      return {
        colors: [],
        counts: []
      }
    } else if(targetSize == input.colors.length) {
      return input
    }

    const inverted = targetSize > input.colors.length / 2
    if(inverted) {
      targetSize = input.colors.length - targetSize
    }

    const pickedIndices = new Set<number>()
    while(pickedIndices.size < targetSize) {
      const index = Math.floor(Math.random() * input.colors.length)
      if(!pickedIndices.has(index)) {
        pickedIndices.add(index)
      }
    }

    if(inverted) {
      targetSize = input.colors.length - targetSize
    }

    let nextOutputIndex = 0
    const colors = new Array(targetSize)
    const counts = new Array(targetSize)

    // Keep track of how much count we're not including
    let unpickedCount = 0
    for(let i = 0; i < input.colors.length; i++) {
      if(pickedIndices.has(i)) {
        colors[nextOutputIndex] = input.colors[i]
        counts[nextOutputIndex] = input.counts[i]
        nextOutputIndex += 1
      } else {
        unpickedCount += input.counts[i]
      }
    }

    // Redistribute it
    const countForEveryOutput = Math.floor(unpickedCount / counts.length)
    if(countForEveryOutput > 0) {
      for(let i = 0; i < counts.length; i++) {
        counts[i] += countForEveryOutput
      }
    }
    unpickedCount -= countForEveryOutput * counts.length

    while(unpickedCount --> 0) {
      counts[Math.floor(Math.random() * counts.length)] += 1
    }

    return {
      colors,
      counts
    }
  }

}

