import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { KDTree } from './KDTree.ts'


describe('KDTree', () => {
  it('finds the nearest points', () => {
    const points = [
      [1, 2],
      [7, 0],
      [7, 1],
      [9, 5],
      [9, 3],
      [3, 9]
    ]

    function findNearest(p: [number, number]): { index: number, distance: number } | undefined {
      function cast(x: number[]): [number, number] {
        if(x.length != 2) throw new TypeError()
        return [x[0], x[1]]
      }

      function dist(a: [number, number], b: [number, number]) {
        return Math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)
      }

      const indices = new Array(points.length)
      for(let i = 0; i < indices.length; i++) {
        indices[i] = i
      }
      indices.sort((a, b) => dist(cast(points[a]), p) - dist(cast(points[b]), p))

      const dist0 = dist(cast(points[indices[0]]), p)
      const dist1 = dist(cast(points[indices[1]]), p)
      // Don't test ambiguous borders
      if(Math.abs(dist0 - dist1) < 0.001) {
        return undefined
      } else {
        return {
          index: indices[0],
          distance: dist0
        }
      }
    }

    const tree = new KDTree(points)

    for(let y = 0; y < 10; y += 0.1) {
      for(let x = 0; x < 10; x += 0.1) {
        const expected = findNearest([x, y])
        if(expected == undefined) continue

        const actual = tree.findNearest([x, y])
        const msg = `(${x}, ${y})`

        assert.strictEqual(actual.index, expected.index, msg)
        assert.deepStrictEqual(actual.point, points[expected.index], msg)
        assert.strictEqual(actual.distance, expected.distance, msg)
      }
    }
  })
})
