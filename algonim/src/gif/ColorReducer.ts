import { Color, ColorUtil } from './Color'
import { CouldBeIterable, makeIterable } from '@/util/TypeAdapters'


export function randomReduce(maxSize: number, colors: CouldBeIterable<Color>, speedFactor: number = 256): ArrayLike<Color> {

  // Genuis! Sort colors so that the ones merged by bit discarding become adjecent for easier counting
  const array: Color[] = []
  for(const color of makeIterable(colors)) {
    array.push(color)
  }

  while(array.length > maxSize) {
    const size = Math.max(Math.floor(array.length / speedFactor), 1)
    array.splice(Math.floor(Math.random() * (array.length - size)), size)
    console.log(array.length)
  }

  return array
}



const DEFAULT_CONFIG = {
  maxMatrixSize: 4096
}

type ReduceColorsConfig = typeof DEFAULT_CONFIG
// TODO
// broadphase: delete low bits of color channels (make sure they are different by at most 1 at a time)
// can we get within target size by trimming all channels?
//   yes: try to selectively trim only some channels (knapsack problem with n=3)
//   no: trim all channels
// unbroad phase: table color merge-inator
