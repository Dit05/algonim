import { Model } from './Model'
import { Drawer } from '@/gfx/Drawer'
import { Point, Size, SizeUtil, VectorUtil } from '@/gfx/Primitives'
import { TextAlign } from '@/gfx/Styles'
import { Border, EllipseBorder } from '@/gfx/Border'
import { Region } from '@/gfx/Region'
import * as CONFIG from '@/config'


/** Connects two {@link Node}s. */
export class Edge {
  private bidirectional: boolean
  private source: Node
  private destination: Node


  public constructor(source: Node, destination: Node, bidirectional: boolean) {
    // TODO fail without breaking invariants
    this.source = source
    this.destination = destination
    this.bidirectional = bidirectional

    this.link(source, 'outgoing')
    this.link(destination, 'incoming')
    this.setBidirectional(bidirectional)
  }


  private link(node: Node, direction: 'incoming' | 'outgoing') {
    const array = node.getRawArray(direction)
    const index = array.indexOf(this)

    if(CONFIG.CONSISTENCY_CHECKS && array.indexOf(this) !== -1) {
      CONFIG.warnInconsistency("GraphModel Edge being linked multiple times to the same Node")
    }

    if(index !== -1) return // Already present, don't do anything

    array.push(this)
  }

  private unlink(node: Node, direction: 'incoming' | 'outgoing') {
    const array = node.getRawArray(direction)
    const index = array.indexOf(this)

    if(index === -1) return // Not present, don't do anything

    array.splice(index, 1)

    if(CONFIG.CONSISTENCY_CHECKS && array.indexOf(this) !== -1) {
      CONFIG.warnInconsistency("GraphModel Edge still in array after being unlinked")
    }

    return true
  }

  private checkInvariants() {
    if(!CONFIG.CONSISTENCY_CHECKS) return

    if(this.source.getRawArray('outgoing').indexOf(this) === -1) CONFIG.warnInconsistency("GraphModel Edge not in outgoing array of source")
    if(this.destination.getRawArray('incoming').indexOf(this) === -1) CONFIG.warnInconsistency("GraphModel Edge not in incoming array of destination")
    if(this.bidirectional) {
      if(this.source.getRawArray('incoming').indexOf(this) === -1) CONFIG.warnInconsistency("GraphModel Edge (bidirectional) not in incoming array of source")
      if(this.destination.getRawArray('outgoing').indexOf(this) === -1) CONFIG.warnInconsistency("GraphModel Edge (bidirectional) not in outgoing array of destination")
    } else {
      if(this.source.getRawArray('incoming').indexOf(this) !== -1) CONFIG.warnInconsistency("GraphModel Edge (unidirectional) is in incoming array of source")
      if(this.destination.getRawArray('outgoing').indexOf(this) !== -1) CONFIG.warnInconsistency("GraphModel Edge (unidirectional) is in outgoing array of destination")
    }
  }


  public getSource(): Node {
    return this.source
  }

  public getDestination(): Node {
    return this.destination
  }

  public getBidirectional(): boolean {
    return this.bidirectional
  }


  public setSource(newValue: Node) {
    if(newValue === this.source) return

    this.unlink(this.source, 'outgoing')
    if(this.bidirectional) {
      this.unlink(this.source, 'incoming')
    }

    this.source = newValue

    this.link(this.source, 'outgoing')
    if(this.bidirectional) {
      this.link(this.source, 'incoming')
    }

    this.checkInvariants()
  }

  public setDestination(newValue: Node) {
    if(newValue === this.destination) return

    this.unlink(this.destination, 'incoming')
    if(this.bidirectional) {
      this.unlink(this.destination, 'outgoing')
    }

    this.destination = newValue

    this.link(this.destination, 'incoming')
    if(this.bidirectional) {
      this.link(this.destination, 'outgoing')
    }

    this.checkInvariants()
  }

  public setBidirectional(newValue: boolean) {
    if(this.bidirectional == newValue) return

    // uni -> bi: link
    // bi -> uni: unlink
    const action = newValue ? this.link : this.unlink
    action(this.source, 'incoming')
    action(this.source, 'outgoing')

    this.checkInvariants()
  }
}

/** Graph node with a position that can contain any value. */
export class Node {

  private incoming: Edge[] = []
  private outgoing: Edge[] = []

  public position: Point = Point(0, 0)
  public value: any = null

  public border: Border | null = null


  /** Gets one of the internal edge arrays. It is not recommended to modify these. */
  public getRawArray(direction: 'incoming' | 'outgoing'): Edge[] {
    switch(direction) {
      case 'incoming': return this.incoming
      case 'outgoing': return this.outgoing
    }
  }

  public connect(other: Node, bidirectional: boolean = false): Edge {
    return new Edge(this, other, bidirectional)
  }

  public *getIncomingEdges(): Generator<Edge> {
    for(let edge of this.incoming) yield edge
  }

  public *getOutgoingEdges(): Generator<Edge> {
    for(let edge of this.outgoing) yield edge
  }

  /** Creats an array of all nodes reachable via edges, always including this one. */
  public discoverLinkedNodes(): Node[] {
    // TODO better
    // potential idea: use only 1 array
    const visited: Node[] = []
    const toVisit: Node[] = [ this ]

    let current = toVisit.pop()
    while(current !== undefined) {
      visited.push(current)

      for(let edge of current.incoming) {
        if(visited.indexOf(edge.getSource()) === -1) {
          toVisit.push(edge.getSource())
        }
      }
      for(let edge of current.outgoing) {
        if(visited.indexOf(edge.getDestination()) === -1) {
          toVisit.push(edge.getDestination())
        }
      }

      current = toVisit.pop()
    }

    return visited
  }

}

/** Displays {@link Node}s interconnected by {@link Edge}s. */
export class Graph extends Model {

  /** Nodes from which drawing begins. */
  public roots: Node[] | Node | null = null
  /** Border used when a node doesn't specify its own. */
  public defaultBorder: Border = new EllipseBorder()


  public createNode(): Node {
    return new Node()
  }

  public draw(drawer: Drawer): void {
    if(this.roots === null) return

    const nodes: Node[] = []
    if(this.roots instanceof Array) {
      for(let root of this.roots) {
        for(let linked of root.discoverLinkedNodes()) {
          nodes.push(linked)
        }
      }
    } else if(this.roots instanceof Node) {
      for(let linked of this.roots.discoverLinkedNodes()) {
        nodes.push(linked)
      }
    }

    const sizes = new WeakMap()

    for(let node of nodes) {
      const str = String(node.value)
      const align: TextAlign = { align: 'center', baseline: 'middle' }

      const metrics = drawer.measureText(str, align)
      const textSize = Size(metrics.width, metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent)
      sizes.set(node, textSize)

      drawer.drawText(str, node.position, align)

      const border = node.border || this.defaultBorder
      const borderBounds: Region = border.getBounds(textSize)

      const corner = VectorUtil.add(node.position, borderBounds.origin)
      const borderDrawer = drawer.subregion(Region.fromStartEnd(corner, VectorUtil.add(corner, SizeUtil.toVector(borderBounds.size))))
        .withTranslatedOrigin(VectorUtil.scale(borderBounds.origin, -1))
      border.draw(textSize, borderDrawer)
    }

    // Draw edges
    for(let node of nodes) {
      for(let edge of node.getOutgoingEdges()) {
        const other = edge.getDestination()

        let startPos = edge.getSource().position
        let endPos = edge.getDestination().position

        const startAngle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x)
        startPos = VectorUtil.add(startPos, this.defaultBorder.getBoundaryPoint(sizes.get(node), startAngle))

        const endAngle = Math.atan2(startPos.y - endPos.y, startPos.x - endPos.x)
        endPos = VectorUtil.add(endPos, this.defaultBorder.getBoundaryPoint(sizes.get(other), endAngle))

        drawer.drawLine(startPos, endPos)
        drawer.drawArrowhead(startPos, endPos)
        if(edge.getBidirectional()) drawer.drawArrowhead(endPos, startPos)
      }
    }
  }

}
