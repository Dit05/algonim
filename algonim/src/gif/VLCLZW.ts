import { BitVector } from "./BitVector"

/** @packageDocumentation
* Implements Variable-Length Code LZW Compression, as seen in [https://www.w3.org/Graphics/GIF/spec-gif89a.txt].
*/


class CompactBinaryTree<TElem> {

  public elements: { [key: number]: TElem } = {}
  public readonly bitWidth: number

  private readonly leftPtrs: Int32Array
  private readonly rightPtrs: Int32Array
  private count: number = 0


  public constructor(size: number, bitWidth: number) {
    this.bitWidth = bitWidth

    this.leftPtrs = new Int32Array(size * bitWidth)
    this.rightPtrs = new Int32Array(size * bitWidth)
    this.clear()
  }


  private insert(index: number, path: number): number {
    let size = this.bitWidth
    while(size --> 0) {
      const array = ((path & (1 << size)) > 0 ? this.rightPtrs : this.leftPtrs)
      if(array[index] < 0) {
        this.count += 1
        index = (array[index] = this.count)
      } else {
        index = array[index]
      }
    }
    return index
  }

  /** Returns a non-negative value if traversal was successful, or `-1 - index` if insertion was needed. */
  public traverseOrInsert(index: number, path: number): number {
    const countWas = this.count
    const result = this.insert(index, path)

    if(countWas != this.count) {
      return -1 - result
    } else {
      return result
    }
  }

  public clear() {
    this.leftPtrs.fill(-1)
    this.rightPtrs.fill(-1)
    this.count = 0
    this.elements = {}
  }

  public addRoots(elementFn: (i: number) => TElem) {
    for(let i = 0; i < (1 << this.bitWidth); i++) {
      const index = -(this.traverseOrInsert(0, i) + 1)
      this.elements[index] = elementFn(i)
    }
  }

  public getTextRepresentation(elementPredicate: (elem: TElem) => boolean = (_elem) => true, spacing: number | undefined = undefined): { [key: string]: TElem } {
    function bitstring(bits: boolean[]) {
      let str = ''
      for(let i = 0; i < bits.length; i++) {
        str += (bits[i] ? '1' : '0')
        if(spacing !== undefined && spacing > 0 && (i + 1) % spacing == 0 && i < bits.length - 1) {
          str += ' '
        }
      }
      return str
    }

    const map: { [key: string]: TElem } = {}
    spacing ??= this.bitWidth

    const indices: number[] = [ 0 ]
    const traces: boolean[][] = []
    while(indices.length > 0) {
      const top = indices.pop() ?? -1
      const trace = traces.pop() ?? []

      if(this.leftPtrs[top] >= 0) {
        indices.push(this.leftPtrs[top])
        traces.push(trace.concat(false))
      }
      if(this.rightPtrs[top] >= 0) {
        indices.push(this.rightPtrs[top])
        traces.push(trace.concat(true))
      }

      if(top in this.elements && elementPredicate(this.elements[top])) {
        map[bitstring(trace)] = this.elements[top]
      }
    }

    return map
  }

}


/** Throws an error for invalid code sizes. */
export function validateInitialCodeSize(initialCodeSize: number) {
  if(!isFinite(initialCodeSize) || isNaN(initialCodeSize)) throw new RangeError("Initial code size must be finite and non-NaN.")
  if(initialCodeSize < 2) throw new RangeError("Initial code size must be at least 2, even for 2-color images.")
  if(initialCodeSize > 8) throw new RangeError("Initial code size must be at most 8.")
}

/** Compresses data into a stream of bytes. Output does not include the code size. For this to be valid Raster Data in a GIF, it has to be segmented into data sub-blocks via {@link gif/Gif.Gif.emitDataSubBlocks}. */
export type CompressionFn = (data: Iterable<number>, initialCodeSize: number) => Generator<number>


/**
* Creates an useful implementation of {@link stupidCompress}'s `clearStrategy`, that starts out with one clear, and every time the chance `p` passes, it's increased by one.
* @param p Chance to keep increasing amount of clears. Be careful to always pass numbers less than 1, otherwise the resulting function won't halt.
*/
export function makeRandomizedStupidClearStategy(p: number): () => number {
  return function() {
    let n = 1
    while(Math.random() < p) n++
    return n
  }
}

/** Stupid implementation of {@link CompressionFn} that outputs each input symbol verbatim, separated by a clear code. */
export function* stupidCompress(data: Iterable<number>, initialCodeSize: number, clearStrategy: () => number = () => 1): Generator<number> {
  validateInitialCodeSize(initialCodeSize)

  const CODE_CLEAR = (1 << initialCodeSize)
  const CODE_END = CODE_CLEAR + 1

  const output: number[] = []
  const bitVector = new BitVector((byte) => output.push(byte))

  bitVector.add(CODE_CLEAR, initialCodeSize + 1)
  for(const sym of data) {
    bitVector.add(sym, initialCodeSize + 1)

    let clears = Math.max(1, clearStrategy())
    while(clears --> 0) {
      bitVector.add(CODE_CLEAR, initialCodeSize + 1)
    }

    for(let i = 0; i < output.length; i++) {
      yield output[i] 
    }
    output.length = 0
  }

  bitVector.add(CODE_END, initialCodeSize + 1)

  for(let i = 0; i < output.length; i++) {
    yield output[i] 
  }
  output.length = 0
}

/** Canonical, decent implementation of {@link CompressionFn}. */
export function* compress(data: Iterable<number>, initialCodeSize: number): Generator<number> {
  validateInitialCodeSize(initialCodeSize)

  const CODE_CLEAR = (1 << initialCodeSize)
  const CODE_END = CODE_CLEAR + 1
  const CODE_FIRST = CODE_CLEAR + 2
  const CODE_MAX = (1 << 12) - 1

  let nextCode = CODE_FIRST
  let codeSize = initialCodeSize + 1

  const output: number[] = []
  const bitVector = new BitVector((byte) => output.push(byte))

  const tree = new CompactBinaryTree<number>(CODE_MAX, initialCodeSize)
  tree.addRoots(i => i)

  bitVector.add(CODE_CLEAR, codeSize)

  let match = 0
  for(const sym of data) {
    if(sym < 0 || sym >= (1 << initialCodeSize)) throw new RangeError(`'${sym}' falls outside the representable range of [${0}..${(1 << initialCodeSize) - 1}].`)

    let nextMatch = tree.traverseOrInsert(match, sym)
    if(nextMatch >= 0) {
      // Found
      match = nextMatch
    } else {
      // Not found
      tree.elements[-(nextMatch + 1)] = nextCode++

      const code = tree.elements[match]
      bitVector.add(code, codeSize)

      if(nextCode > CODE_MAX) {
        // Table reset needed
        bitVector.add(CODE_CLEAR, codeSize)
        nextCode = CODE_FIRST
        codeSize = initialCodeSize + 1
        tree.clear()
        tree.addRoots(i => i)
      } else if(nextCode > (1 << codeSize)) {
        codeSize += 1
      }

      match = tree.traverseOrInsert(0, sym)
      if(match < 0) throw new Error("This should never happen.")
    }

    for(let i = 0; i < output.length; i++) {
      yield output[i] 
    }
    output.length = 0
  }

  bitVector.add(tree.elements[match], codeSize)
  bitVector.add(CODE_END, codeSize)
  bitVector.flush()

  for(let i = 0; i < output.length; i++) {
    yield output[i] 
  }
  output.length = 0
}
