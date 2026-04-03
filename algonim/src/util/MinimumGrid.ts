

type Layer = {
  indices: Uint32Array,
  values: Float64Array,
  size: number
}

/**
* A square grid that optimizes finding the smallest element in it as values change.
*
* If you have mutated {@link data}, you must use either:
* - {@link recomputeDirty} -- When only some data has changed and you've marked the changes as dirty.
* - {@link recomputeAll} -- When all data has changed.
*/
export class MinimumGrid {
  // OPTIMIZE:
  // - deletes: boolean[] instead of setting values to Infinity?

  /** Data stored in the grid, in a row-continuous fashion. After changing this, you must ensure the grid is properly recomputed before attempting to retrieve the minimum value. */
  public readonly data: Float64Array
  /** Side length of the grid. */
  public readonly size: number

  readonly layers: Layer[] = []

  /** Stores the dirty indices of the lowest layer. */
  readonly dirty: Set<number> = new Set()


  /** Creates a {@link size}x{@link size} grid. */
  public constructor(size: number) {
    this.size = size
    this.data = new Float64Array(size * size)

    do {
      size = Math.ceil(size / 2)
      this.layers.push({
        indices: new Uint32Array(size * size),
        values: new Float64Array(size * size),
        size: size
      })
    } while(size > 1)
  }


  /** Builds an object that represents this instance's state. */
  public getDebugObject(): any {
    const formatTable = (array: ArrayLike<number>, size: number, deref: boolean) => {
      const table: number[][] = new Array(size)
      for(let row = 0; row < size; row++) {
        const subarray: number[] = new Array(size)
        for(let col = 0; col < size; col++) {
          const val = array[MinimumGrid.vIndex(size, col, row)]
          subarray[col] = deref ? this.data[val] : val
        }
        table[row] = subarray
      }
      return table
    }

    const layers = []
    for(const layer of this.layers) {
      layers.push({
        indices: formatTable(layer.indices, layer.size, false),
        'values[indices]': formatTable(layer.indices, layer.size, true),
        values: formatTable(layer.values, layer.size, false)
      })
    }

    return {
      'data': formatTable(this.data, this.size, false),
      'layers': layers,
    }
  }


  /** Converts a column and a row into an index into {@link data}. */
  public index(col: number, row: number): number {
    return MinimumGrid.vIndex(this.size, col, row)
  }

  /** Converts an index into {@link data} back into a column and a row. */
  public unindex(index: number): [number, number] {
    return MinimumGrid.vUnindex(this.size, index)
  }

  /** Gets the index of the smallest element in {@link data}. This will only be definitely accurate if the grid has been properly recomputed since the last data change. */
  public getMinimumIndex(): number {
    return this.layers[this.layers.length - 1].indices[0]
  }

  /** Gets the column and row of the smallest element in {@link data}. This will only be definitely accurate if the grid has been properly recomputed since the last data change. */
  public getMinimumCoord(): [number, number] {
    const index = this.getMinimumIndex()
    return [ index % this.size, Math.floor(index / this.size) ]
  }


  /** Fills an entire column with {@link value}. */
  public fillCol(col: number, value: number) {
    for(let i = 0; i < this.size; i++) {
      this.data[this.index(col, i)] = value
    }
  }

  /** Fills an entire row with {@link value}. */
  public fillRow(row: number, value: number) {
    this.data.fill(value, row * this.size, (row + 1) * this.size)
  }


  /** Marks a cell to be affected by {@link recomputeDirty}. */
  public dirtyCell(col: number, row: number) {
    ;[col, row] = MinimumGrid.ascend(col, row)
    this.dirty.add(MinimumGrid.vIndex(this.layers[0].size, col, row))
  }

  /** Marks a row of cells to be affected by {@link recomputeDirty}. Prefer using this over individual {@link dirtyCell} calls. */
  public dirtyRow(row: number) {
    row = MinimumGrid.ascend(0, row)[1]
    const size = this.layers[0].size
    for(let col = 0; col < size; col++) {
      this.dirty.add(MinimumGrid.vIndex(size, col, row))
    }
  }

  /** Marks a column of cells to be affected by {@link recomputeDirty}. Prefer using this over individual {@link dirtyCell} calls. */
  public dirtyCol(col: number) {
    col = MinimumGrid.ascend(col, 0)[0]
    const size = this.layers[0].size
    for(let row = 0; row < size; row++) {
      this.dirty.add(MinimumGrid.vIndex(size, col, row))
    }
  }


  /** Recomputes every elements. Also marks everything clean. */
  public recomputeAll() {
    for(let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l]
      for(let vRow = 0; vRow < layer.size; vRow++) {
        for(let vCol = 0; vCol < layer.size; vCol++) {
          this.recomputeOne(l, vCol, vRow)
        }
      }
    }
    this.dirty.clear()
  }

  /** Recomputes all elements that have been manually marked dirty so far, and marks them as clean. */
  public recomputeDirty(): number {
    let recomputed = 0

    let srcSet = this.dirty
    let destSet = new Set<number>()

    for(let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l]
      const nextLayer = (l + 1 < this.layers.length) ? this.layers[l + 1] : undefined

      for(const index of srcSet) {
        const [vCol, vRow] = MinimumGrid.vUnindex(layer.size, index)
        const changed: boolean = this.recomputeOne(l, vCol, vRow)
        if(changed) recomputed += 1

        if(nextLayer !== undefined && changed) {
          const [c, r] = MinimumGrid.ascend(vCol, vRow)
          destSet.add(MinimumGrid.vIndex(nextLayer.size, c, r))
        }
      }

      srcSet.clear()
      if(l == 0) {
        srcSet = destSet
        destSet = new Set<number>()
      } else {
        [srcSet, destSet] = [destSet, srcSet]
      }
    }

    return recomputed
  }

  private recomputeOne(layerNum: number, vCol: number, vRow: number): boolean {
    // Gets the local minimum index from the layer below.
    const getIndex = (c: number, r: number, which: number): number => {
      ;[c, r] = MinimumGrid.descend(c, r, which)
      if(layerNum > 0) {
        const lower = this.layers[layerNum - 1]
        ;[c, r] = MinimumGrid.clampCoords(lower.size, c, r)
        return lower.indices[MinimumGrid.vIndex(lower.size, c, r)]
      } else {
        ;[c, r] = MinimumGrid.clampCoords(this.size, c, r)
        return this.index(c, r)
      }
    }

    const minimumDataIndex = this.minIndex(
      getIndex(vCol, vRow, 0),
      getIndex(vCol, vRow, 1),
      getIndex(vCol, vRow, 2),
      getIndex(vCol, vRow, 3)
    )
    const minimumDataValue = this.data[minimumDataIndex]

    const layer = this.layers[layerNum]
    const index = MinimumGrid.vIndex(layer.size, vCol, vRow)

    // For some reason, the index changing should count as a change too. Otherwise, MatrixColorReducer starts selecting Infinity cells and breaks.
    const changed = (layer.indices[index] !== minimumDataIndex) || (layer.values[index] !== minimumDataValue)
    layer.indices[index] = minimumDataIndex
    layer.values[index] = minimumDataValue
    return changed
  }


  private static vIndex(size: number, vCol: number, vRow: number): number {
    return (vRow * size) + vCol
  }

  private static vUnindex(size: number, index: number): [number, number] {
    return [
      index % size,
      Math.floor(index / size)
    ]
  }

  private static clampCoords(size: number, vCol: number, vRow: number): [number, number] {
    function clamp(x: number): number {
      return Math.max(0, Math.min(x, size - 1))
    }
    return [clamp(vCol), clamp(vRow)]
  }

  private static descend(vCol: number, vRow: number, which: number = 0 | 1 | 2 | 3): [number, number] {
    // To go down to a larger grid, double coordinate and add 0 or 1 to taste.
    return [
      (vCol << 1) + ((which >> 0) & 0b1),
      (vRow << 1) + ((which >> 1) & 0b1)
    ]
  }

  private static ascend(vCol: number, vRow: number): [number, number] {
    return [
      vCol >> 1,
      vRow >> 1
    ]
  }

  /** Returns the index that references the smallest data. */
  private minIndex(...indices: number[]): number {
    let minIndex = 0
    let minValue = Infinity
    for(let i = 0; i < indices.length; i++) {
      const value = this.data[indices[i]]
      if(value < minValue) {
        minIndex = indices[i]
        minValue = value
      }
    }
    return minIndex
  }

}
