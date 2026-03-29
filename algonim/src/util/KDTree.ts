

type Leaf = { parent: Node | undefined, point: number[], index: number }
type Branch = {
  parent: Node | undefined,
  splitValue: number,
  splitAxis: number,
  low: Node,
  high: Node
}
type Node = Leaf | Branch

type PartialBranch = {
  parent: Node | undefined,
  splitValue: number,
  splitAxis: number,
  low: PartialNode | undefined,
  high: PartialNode | undefined
}
type PartialNode = Leaf | PartialBranch

function unpartial(partial: PartialNode): Node {
  if('point' in partial) {
    return partial
  } else {
    if(partial.low === undefined) throw new RangeError("Cannot unpartial node: low is undefined.")
    if(partial.high === undefined) throw new RangeError("Cannot unpartial node: high is undefined.")
    return {
      parent: undefined,
      splitValue: partial.splitValue,
      splitAxis: partial.splitAxis,
      low: unpartial(partial.low),
      high: unpartial(partial.high)
    }
  }
}


export class KDTree {

  public readonly dimensions: number
  private readonly root: Node


  public constructor(pointSource: Iterable<ArrayLike<number>>) {
    // Collect all the points into a list
    const allPoints: number[][] = []

    let dimensions: number | undefined = undefined
    for(const point of pointSource) {
      // Check dimensionality
      if(point.length === 0) throw new RangeError("Zero-dimensional points are not supported.")

      if(dimensions === undefined) {
        dimensions = point.length
      } else if(point.length !== dimensions) {
        console.log(`Dimension mismatch between input points: previously established as ${dimensions}, but a new point had ${point.length}.`)
      }

      // Add it to our list
      const added: number[] = Array(dimensions)
      for(let i = 0; i < point.length; i++) {
        added[i] = point[i]
      }
      allPoints.push(added)
    }

    if(dimensions === undefined) throw new RangeError("Input sequence contains no points.")
    this.dimensions = dimensions

    const allIndices = new Array(allPoints.length)
    for(let i = 0; i < allPoints.length; i++) {
      allIndices[i] = i
    }


    let root: undefined | PartialNode = undefined

    const stack: {
      indices: number[],
      splitAxis: number,
      parent: { branch: PartialBranch, high: boolean } | undefined
    }[] = []
    stack.push({
      indices: allIndices,
      splitAxis: 0,
      parent: undefined
    })

    while(true) {
      const elem = stack.pop()
      if(elem === undefined) break

      let newNode: PartialNode
      if(elem.indices.length < 1) {
        throw new Error("This should never happen.")
      } else if(elem.indices.length === 1) {
        // Leaf
        newNode = { parent: undefined, point: allPoints[elem.indices[0]], index: elem.indices[0] }
      } else {
        // Branch
        elem.indices.sort((a, b) => {
          return allPoints[a][elem.splitAxis] - allPoints[b][elem.splitAxis]
        })

        // This should be the median point.
        const midIndex = Math.floor(elem.indices.length / 2)
        const midValueLow = allPoints[elem.indices[midIndex - 1]][elem.splitAxis]
        const midValueHigh = allPoints[elem.indices[midIndex]][elem.splitAxis]
        const splitValue = (midValueLow + midValueHigh) / 2

        newNode = {
          parent: undefined,
          splitValue,
          splitAxis: elem.splitAxis,
          low: undefined,
          high: undefined
        }

        stack.push({
          indices: elem.indices.slice(0, midIndex),
          splitAxis: (elem.splitAxis + 1) % dimensions,
          parent: { branch: newNode, high: false }
        })
        stack.push({
          indices: elem.indices.slice(midIndex),
          splitAxis: (elem.splitAxis + 1) % dimensions,
          parent: { branch: newNode, high: true }
        })
      }

      if(elem.parent !== undefined) {
        if(elem.parent.high) {
          elem.parent.branch.high = newNode
        } else {
          elem.parent.branch.low = newNode
        }
      } else {
        root = newNode
      }
    }


    if(root === undefined) {
      throw new Error("This should never happen.")
    } else {
      this.root = unpartial(root)
    }

    // Assign parents
    const parentStack: Node[] = [this.root]
    while(true) {
      const node = parentStack.pop()
      if(node === undefined) break

      if('splitValue' in node) {
        node.high.parent = node
        node.low.parent = node
        parentStack.push(node.high)
        parentStack.push(node.low)
      } else {
        // Leaf, no action required.
      }
    }
  }


  private findBestInNode(target: ArrayLike<number>, searchRoot: Node, best: [{ point: ArrayLike<number>, index: number, distanceSq: number } | undefined]) {
    let current: Node = searchRoot
    while('splitValue' in current) {
      if(target[current.splitAxis] < current.splitValue) {
        current = current.low
      } else {
        current = current.high
      }
    }

    let distanceSq = 0
    for(let i = 0; i < this.dimensions; i++) {
      const diff = current.point[i] - target[i]
      distanceSq += diff * diff
    }

    if(best[0] === undefined) {
      best[0] = {
        point: current.point,
        index: current.index,
        distanceSq: distanceSq
      }
    } else if(distanceSq < best[0].distanceSq) {
      best[0].point = current.point
      best[0].index = current.index
      best[0].distanceSq = distanceSq
    }

    while(current !== searchRoot) {
      if(current.parent === undefined) throw new Error("This should never happen.")
      current = current.parent

      if('splitValue' in current) {
        const pos = target[current.splitAxis]
        let planeDifference = current.splitValue - pos
        if(planeDifference * planeDifference <= best[0].distanceSq) {
          let subRoot: Node
          if(pos < current.splitValue) {
            subRoot = current.high
          } else {
            subRoot = current.low
          }
          this.findBestInNode(target, subRoot, best)
        }
      } else {
        throw new Error("This should never happen.")
      }
    }
  }

  /** Given some target position, returns the nearest contained point to it. */
  public findNearest(target: ArrayLike<number>): { point: ArrayLike<number>, index: number, distance: number } {
    if(target.length < this.dimensions) throw new RangeError("Target point has less dimensions than this tree.")
    const best: [{ point: ArrayLike<number>, index: number, distanceSq: number } | undefined] = [undefined]
    this.findBestInNode(target, this.root, best)
    if(best[0] === undefined) throw new Error("No closest point found. This should never happen.")
    return {
      point: best[0].point,
      index: best[0].index,
      distance: Math.sqrt(best[0].distanceSq)
    }
  }

}
