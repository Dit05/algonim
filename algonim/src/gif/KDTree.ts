

type Leaf = { position: number[] }
type Branch = {
  splitValue: number,
  low: Node,
  high: Node
}
type Node = Leaf | Branch

export class KDTree {

  public readonly dimensions: number


  public constructor(pointSource: Iterable<ArrayLike<number>>) {
    const points: number[][] = []

    let dimensions: number | undefined = undefined
    for(const point of pointSource) {
      // Check dimensionality
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
      points.push(added)
    }

    this.dimensions = dimensions ?? 0
  }


  /** Given some target point, returns the nearest contained point to it. */
  public findNearest(target: ArrayLike<number>): ArrayLike<number> {
    throw new Error('not implemented'); // TODO
  }


}
