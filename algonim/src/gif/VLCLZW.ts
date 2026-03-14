import { BitVector } from "./BitVector"

/** @packageDocumentation
* Implements Variable-Length Code LZW Compression, as seen in [https://www.w3.org/Graphics/GIF/spec-gif89a.txt].
*/


interface ArrayLikeButWritable<T> extends ArrayLike<T> {
  [n: number]: T
}

class CompactBinaryTree<TElem, TArray extends ArrayLikeButWritable<TElem>> {

  public readonly elements: TArray
  private readonly leftPtrs: Int32Array
  private readonly rightPtrs: Int32Array
  private count: number = 0


  public constructor(elements: TArray) {
    this.elements = elements
    this.leftPtrs = new Int32Array(elements.length)
    this.rightPtrs = new Int32Array(elements.length)
    this.leftPtrs.fill(-1)
    this.rightPtrs.fill(-1)
  }


  public step(index: number, right: boolean): number {
    return (right ? this.rightPtrs : this.leftPtrs)[index]
  }

  /*public append(index: number, right: boolean): number {
    if(this.count >= this.elements.length) throw new RangeError("Tree full.")

    const array = (right ? this.rightPtrs : this.leftPtrs)
    if(array[index] !== -1) throw new RangeError("Node already present.")

    this.count += 1
    return (array[index] = this.count)
  }*/

  private insert(index: number, bits: number, size: number): number {
    while(size --> 0) {
      const array = ((bits & (1 << size)) > 0 ? this.rightPtrs : this.leftPtrs)
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
  public traverseOrInsert(index: number, bits: number, size: number): number {
    const countWas = this.count
    const result = this.insert(index, bits, size)

    if(countWas != this.count) {
      return -1 - result
    } else {
      return result
    }
  }

  public trim(keepCount: number, clearValue: TElem) {
    this.leftPtrs.fill(-1, keepCount)
    this.rightPtrs.fill(-1, keepCount)
    while(keepCount < this.elements.length) {
      this.elements[keepCount++] = clearValue
    }
  }

  public getTextRepresentation(elementPredicate: (elem: TElem) => boolean, spacing: number | undefined = undefined): { [key: string]: TElem } {
    function bitstring(bits: boolean[]) {
      let str = ''
      for(let i = 0; i < bits.length; i++) {
        str += (bits[i] ? '1' : '0')
        if(spacing !== undefined && (i + 1) % spacing == 0 && i < bits.length - 1) {
          str += ' '
        }
      }
      return str
    }

    const map: { [key: string]: TElem } = {}

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

      if(elementPredicate(this.elements[top])) {
        map[bitstring(trace)] = this.elements[top]
      }
    }

    return map
  }

}

/**
* Compresses data into a stream of bytes. Output does not include the code size. For this to be valid Raster Data in a GIF, it has to be segmented into data sub-blocks via {@link ./blocks/Image.Image.emitDataSubBlocks}.
*/
export function* compress(data: Iterable<number>, initialCodeSize: number): Generator<number> {
  if(initialCodeSize < 2) throw new RangeError("Initial code size must be at least 2.")
  // TODO fail if an element lays outside the initial code size

  const CODE_CLEAR = (1 << initialCodeSize)
  const CODE_END = CODE_CLEAR + 1
  const CODE_FIRST = CODE_CLEAR + 2
  const CODE_MAX = (1 << 12) - 1

  let nextCode = CODE_FIRST
  let codeSize = initialCodeSize + 1

  const output: number[] = []
  const bitVector = new BitVector((byte) => output.push(byte))

  const tree = new CompactBinaryTree<number, Int32Array>(new Int32Array((CODE_MAX + 1) * initialCodeSize)) // TODO + 2?
  //tree.trim(0, -1) // Fill with -1 so that getTextRepresentation.
  for(let i = 0; i < (1 << initialCodeSize); i++) {
    tree.elements[-(tree.traverseOrInsert(0, i, initialCodeSize) + 1)] = i
  }

  bitVector.add(CODE_CLEAR, codeSize)

  let match = 0

  //const codestream = []

  for(const sym of data) {
    let nextMatch = tree.traverseOrInsert(match, sym, initialCodeSize)
    if(nextMatch >= 0) {
      // Found
      match = nextMatch
      //console.log(`matched ${sym}`)
    } else {
      // Not found
      //console.log(`not-matched ${sym}, adding ${nextCode}`)
      tree.elements[-(nextMatch + 1)] = nextCode++
      //console.log(tree.getTextRepresentation(x => x >= 0, initialCodeSize))

      const code = tree.elements[match]
      bitVector.add(code, codeSize)
      //console.log(`emitting ${code} with size ${codeSize}`)
      //codestream.push(code)

      if(nextCode > CODE_MAX) {
        bitVector.add(CODE_CLEAR, codeSize)
        codeSize = 1
        tree.trim(1 << initialCodeSize, -1)
        //console.log(`code size resetting to ${codeSize}`)
      } else if(nextCode > (1 << codeSize)) {
        codeSize += 1
        //console.log(`code size increasing to ${codeSize}`)
      }

      match = tree.traverseOrInsert(0, sym, initialCodeSize)
      if(match < 0) throw new Error("This should never happen.")
    }
  }

  bitVector.add(tree.elements[match], codeSize)
  bitVector.add(CODE_END, codeSize)
  bitVector.flush()

  //console.log(codestream)

  for(let i = 0; i < output.length; i++) {
    yield output[i] 
  }


  /*bitVector.add(CODE_END, codeSize)

  bitVector.flush()
  if(output.length > 0) {
    for(let byte of output) {
      yield byte
    }
  }*/
}
