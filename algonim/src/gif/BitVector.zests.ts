import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { BitVector } from './BitVector.ts'


describe('BitVector', () => {
  it('collects bits', () => {
    const output: number[] = []
    const vec = new BitVector((x) => output.push(x)) // Fun fact: just putting output.push as the argument doesn't work (probably due to binding)

    vec.add(0b11111, 5)
    vec.add(0b0000, 4)
    vec.add(0b111, 3)
    vec.add(0b00, 2)
    vec.add(0b1, 1)
    vec.flush()

    assert.deepStrictEqual(output, [ 0b00011111, 0b01001110 ])

    vec.add(0b1, 1)
    vec.flush()

    assert.deepStrictEqual(output, [ 0b00011111, 0b01001110, 0b1 ])
  })
})
