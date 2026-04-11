import { Model } from './Model'
import { Drawer } from '@/gfx/Drawer'
import { LineStyle, ArrowStyle, FontStyle } from '@/gfx/Styles'
import { Point, Size, SizeUtil, VectorUtil } from '@/gfx/Primitives'
import { TextAlign } from '@/gfx/Styles'
import { Border, EllipseBorder } from '@/gfx/Border'
import { Region } from '@/gfx/Region'


export type Layout = { [key: string]: { pos: [number, number], value: any, connect: string[] } }


/** Graph node with a position that can contain any value. */
export class Node {

  /** Set of other nodes to draw outgoing edges to. If this node is also in the other node's connection set, then the edge is bidirectional. */
  public readonly connections: Set<Node> = new Set()
  /** Position of the center of the node relative to the top-left corner of the model's drawing area. */
  public position: Point = Point(0, 0)
  /** Content drawn in the node. */
  public value: any = null
  /** Whether to hide the value. Useful if the value is not always relevant. */
  public hideValue: boolean = false

  /** Border around {@link value}. {@link Border} is designed to be stateless, so multiple nodes are free to share border instances. */
  public border: Border | null = null


  /** Adds all nodes reachable via outgoing edges to the given set, always including this one. */
  public discoverLinkedNodes(visited: Set<Node>) {
    const toVisit: Node[] = [ this ]

    let current = toVisit.pop()
    while(current !== undefined) {
      visited.add(current)

      for(const other of current.connections) {
        if(!visited.has(other)) {
          toVisit.push(other)
        }
      }

      current = toVisit.pop()
    }
  }

}

/** Displays an interconnected network of {@link Node}s. */
export class Graph extends Model {

  /** Nodes from which drawing begins. When drawing, outgoing edges are automatically followed to discover more nodes to draw. */
  public roots: Iterable<Node> | Node | undefined = undefined
  /** Border used when a node doesn't specify its own. */
  public defaultBorder: Border = new EllipseBorder()

  /** Style applied to lines of edges, including the arrow heads. */
  public edgeLineStyle: Partial<LineStyle> = {}
  /** Style applied to arrow heads of edges. */
  public edgeArrowStyle: Partial<ArrowStyle> = {}
  /** Style applied to node content. */
  public textStyle: Partial<FontStyle> = {}


  /** Creates a new {@link Node}. For it to show up during drawing, it needs to be reachable from {@link roots} via outgoing edges. */
  public createNode(): Node {
    return new Node()
  }

  /** Creates and connects nodes based on a layout object. Also sets these as the roots. */
  public setLayout(layout: Layout): { [key: string]: Node } {
    const nodes: { [key: string]: Node } = {}
    const roots: Node[] = []

    for(const key in layout) {
      const node = this.createNode()
      node.value = layout[key].value
      node.position = { x: layout[key].pos[0], y: layout[key].pos[1] }
      nodes[key] = node
      roots.push(node)
    }

    for(const key in layout) {
      for(const destKey of (layout[key].connect ?? [])) {
        const other = nodes[destKey]
        if(!other) {
          throw new RangeError(`Destination node '${destKey}' doesn't exist.`)
        }

        nodes[key].connections.add(other)
      }
    }

    this.roots = roots
    return nodes
  }

  public draw(drawer: Drawer): void {
    // Get roots as an Iterable
    let effectiveRoots: Iterable<Node>
    if(this.roots instanceof Node) {
      effectiveRoots = [this.roots]
    } else if(this.roots === undefined) {
      effectiveRoots = []
    } else {
      effectiveRoots = this.roots
    }

    // Add linked nodes from all roots
    const nodes: Set<Node> = new Set()
    for(const root of effectiveRoots) {
      root.discoverLinkedNodes(nodes)
    }

    // Draw nodes and cache their sizes
    const sizes = new Map()
    const ids = new Map()
    for(const node of nodes) {
      ids.set(ids.size, node)

      const valueStr = String(node.value)
      const align: TextAlign = { align: 'center', baseline: 'middle' }

      const metrics = drawer.measureText(valueStr, align, this.textStyle)
      const textSize = Size(metrics.width, metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent)
      sizes.set(node, textSize)

      if(!node.hideValue) {
        drawer.drawText(valueStr, node.position, align, this.textStyle)
      }

      const border = node.border || this.defaultBorder
      const borderBounds: Region = border.getBounds(textSize)

      const corner = VectorUtil.add(node.position, borderBounds.origin)
      const borderDrawer = drawer.subregion(Region.fromStartEnd(corner, VectorUtil.add(corner, SizeUtil.toVector(borderBounds.size))))
        .withTranslatedOrigin(VectorUtil.scale(borderBounds.origin, -1))
      border.draw(textSize, borderDrawer)
    }

    // Draw edges
    const drawnBidirectional: Set<string> = new Set()
    for(const node of nodes) {
      for(const other of node.connections) {
        if(!(other instanceof Node)) {
          throw new TypeError(`Found something in the connection set of a Node that isn't a Node. (It's: ${other})`)
        }

        let startPos = node.position
        let endPos = other.position

        const startAngle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x)
        startPos = VectorUtil.add(startPos, (node.border ?? this.defaultBorder).getBoundaryPoint(sizes.get(node), startAngle))

        const endAngle = Math.atan2(startPos.y - endPos.y, startPos.x - endPos.x)
        endPos = VectorUtil.add(endPos, (other.border ?? this.defaultBorder).getBoundaryPoint(sizes.get(other), endAngle))

        let skip = false
        if(other.connections.has(node)) {
          // Check if this bidirectional edge hasn't been drawn yet
          // Since we added `node;other`, we need to check for `other;node` from this perspective.
          if(drawnBidirectional.has(`${ids.get(other)};${ids.get(node)}`)) {
            skip = true
          } else {
            drawer.drawArrowhead(endPos, startPos, this.edgeLineStyle, this.edgeArrowStyle)
            drawnBidirectional.add(`${ids.get(node)};${ids.get(other)}`)
          }
        }

        if(!skip) {
          drawer.drawLine(startPos, endPos, this.edgeLineStyle)
          drawer.drawArrowhead(startPos, endPos, this.edgeLineStyle, this.edgeArrowStyle)
        }
      }
    }
  }

}
