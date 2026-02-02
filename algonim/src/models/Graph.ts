import { Model } from './Model'
import { Drawer } from '@/gfx/Drawer'
import { Point, Size, SizeUtil, Vector, VectorUtil } from '@/gfx/Primitives'
import { TextAlign } from '@/gfx/Styles'
import { Border, EllipseBorder } from '@/gfx/Border'
import { Region } from '@/gfx/Region'
import * as CONFIG from '@/config'


export class Edge {
  bidirectional: boolean // TODO 2 arrows
  source: Node
  destination: Node


  public constructor(source: Node, destination: Node, bidirectional: boolean) {
    // TODO fail without breaking invariants
    this.source = source
    this.destination = destination
    this.bidirectional = bidirectional

    this.link(source, 'outgoing')
    this.link(destination, 'incoming')
    this.setBidirectional(bidirectional)
  }


  static getArray(node: Node, direction: 'incoming' | 'outgoing'): Edge[] {
    switch(direction) {
      case 'incoming': return node.incoming
      case 'outgoing': return node.outgoing
    }
  }

  link(node: Node, direction: 'incoming' | 'outgoing') {
    const array = Edge.getArray(node, direction)
    const index = array.indexOf(this)

    if(CONFIG.CONSISTENCY_CHECKS && array.indexOf(this) !== -1) {
      CONFIG.warnInconsistency('GraphModel Edge being linked multiple times to the same Node')
    }

    if(index !== -1) return // Already present, don't do anything

    array.push(this)
  }

  unlink(node: Node, direction: 'incoming' | 'outgoing') {
    const array = Edge.getArray(node, direction)
    const index = array.indexOf(this)

    if(index === -1) return // Not present, don't do anything

    array.splice(index, 1)

    if(CONFIG.CONSISTENCY_CHECKS && array.indexOf(this) !== -1) {
      CONFIG.warnInconsistency('GraphModel Edge still in array after being unlinked')
    }

    return true
  }

  checkInvariants() {
    if(!CONFIG.CONSISTENCY_CHECKS) return

    if(this.source.outgoing.indexOf(this) === -1) CONFIG.warnInconsistency('GraphModel Edge not in outgoing array of source')
    if(this.destination.incoming.indexOf(this) === -1) CONFIG.warnInconsistency('GraphModel Edge not in incoming array of destination')
    if(this.bidirectional) {
      if(this.source.incoming.indexOf(this) === -1) CONFIG.warnInconsistency('GraphModel Edge (bidirectional) not in incoming array of source')
      if(this.destination.outgoing.indexOf(this) === -1) CONFIG.warnInconsistency('GraphModel Edge (bidirectional) not in outgoing array of destination')
    } else {
      if(this.source.incoming.indexOf(this) !== -1) CONFIG.warnInconsistency('GraphModel Edge (unidirectional) is in incoming array of source')
      if(this.destination.outgoing.indexOf(this) !== -1) CONFIG.warnInconsistency('GraphModel Edge (unidirectional) is in outgoing array of destination')
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

export class Node {

  incoming: Edge[] = []
  outgoing: Edge[] = []

  public position: Point = Point(0, 0)
  public value: any = null

  public border: Border | null = null


  public connect(other: Node, bidirectional: boolean = false): Edge {
    return new Edge(this, other, bidirectional)
  }

  public discoverLinkedNodes(): Node[] {
    // TODO better
    // potential idea: use only 1 array
    const visited: Node[] = []
    const toVisit: Node[] = [ this ]

    let current = toVisit.pop()
    while(current !== undefined) {
      visited.push(current)

      for(let edge of current.incoming) {
        if(visited.indexOf(edge.source) === -1) {
          toVisit.push(edge.source)
        }
      }
      for(let edge of current.outgoing) {
        if(visited.indexOf(edge.destination) === -1) {
          toVisit.push(edge.destination)
        }
      }

      current = toVisit.pop()
    }

    return visited
  }

}

export class Graph extends Model {

  public root: Node | null = null
  public defaultBorder: Border = new EllipseBorder()


  public createNode(): Node {
    return new Node()
  }

  public draw(drawer: Drawer): void {
    if(this.root === null) return

    const nodes = this.root.discoverLinkedNodes()
    const sizes = new WeakMap()

    for(let node of nodes) {
      const str = String(node.value)
      const align: TextAlign = { align: 'center', baseline: 'middle' }

      const metrics = drawer.measureText(str, align)
      const textSize = Size(metrics.width, metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent)
      sizes.set(node, textSize)

      drawer.drawText(str, node.position.x, node.position.y, align)

      const border = node.border || this.defaultBorder
      const borderBounds: Region = border.getBounds(textSize)

      //DebugDraw.box(drawer, node.position, textSize)

      // FIXME misalignment when boundary goes off-screen
      const corner = VectorUtil.add(node.position, borderBounds.origin)
      const borderDrawer = drawer.subregion(Region.fromStartEnd(corner, VectorUtil.add(corner, SizeUtil.toVector(borderBounds.size))))
        .withTranslatedOrigin(VectorUtil.scale(borderBounds.origin, -1))
      //borderDrawer.fill('#0000ff44')
      border.draw(textSize, borderDrawer)
    }

    // Draw edges
    for(let node of nodes) {
      for(let edge of node.outgoing) {
        const other = edge.getDestination()

        let startPos = edge.getSource().position
        let endPos = edge.getDestination().position

        const startAngle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x)
        startPos = VectorUtil.add(startPos, this.defaultBorder.getBoundaryPoint(sizes.get(node), startAngle))

        const endAngle = Math.atan2(startPos.y - endPos.y, startPos.x - endPos.x)
        endPos = VectorUtil.add(endPos, this.defaultBorder.getBoundaryPoint(sizes.get(other), endAngle))

        drawer.drawArrow(startPos.x, startPos.y, endPos.x, endPos.y)
      }
    }
  }

}
