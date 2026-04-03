import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MinimumGrid } from './MinimumGrid.ts'


describe('MinimumGrid', () => {
  it('finds the smallest element', () => {
    const data = [
      9, 2, 1,
      3, 5, 6,
      4, 7, 8
    ]
    const grid = new MinimumGrid(3)

    for(let i = 0; i < data.length; i++) {
      grid.data[i] = data[i]
    }

    grid.recomputeAll()
    /*const debug = grid.getDebugObject()
    assert.deepEqual(debug.layers,
    [
      [
        [2, 1],
        [4, 8]
      ],
      [
        [1]
      ]
    ])*/

    assert.equal(grid.getMinimumIndex(), 2)
    assert.deepEqual(grid.getMinimumCoord(), [2, 0])

    grid.data[2] = Infinity
    grid.recomputeAll()
    assert.equal(grid.getMinimumIndex(), 1)
    assert.deepEqual(grid.getMinimumCoord(), [1, 0])

    grid.data[1] = Infinity
    grid.recomputeAll()
    assert.equal(grid.getMinimumIndex(), 3)
    assert.deepEqual(grid.getMinimumCoord(), [0, 1])
  }),

  it('repeatedly finds the smallest element among many', () => {
    function findTrueMinimumIndex(): number {
      let minIndex = 0
      for(let i = 0; i < grid.data.length; i++) {
        if(grid.data[i] < grid.data[minIndex]) {
          minIndex = i
        }
      }
      return minIndex
    }

    const SIZE = 16
    const grid = new MinimumGrid(SIZE)

    let rand = 42
    for(let i = 0; i < grid.data.length; i++) {
      grid.data[i] = rand
      rand = (rand + 5463) % 149
    }
    grid.recomputeAll()

    for(let i = 0; i < grid.data.length; i++) {
      //t.diagnostic(JSON.stringify(grid.getDebugObject()))

      const expected = findTrueMinimumIndex()
      const actual = grid.getMinimumIndex()
      assert.equal(grid.data[actual], grid.data[expected])

      const [col, row] = grid.getMinimumCoord()
      grid.data[actual] = Infinity
      grid.dirtyCell(col, row)
      grid.recomputeDirty()
    }
  })
})
