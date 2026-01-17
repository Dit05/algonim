import { Model } from './Model'
import { Drawer } from '@/gfx/Drawer'
import { Point } from '@/gfx/Point'
import * as CONFIG from '@/config'


class Edge {
  bidirectional: boolean
  source: Node
  destination: Node


  public constructor(source: Node, destination: Node, bidirectional: boolean) {
    // TODO fail without breaking invariants
    this.link(source, 'outgoing')
    this.link(destination, 'incoming')
    this.setBidirectional(bidirectional)

    this.source = source
    this.destination = destination
    this.bidirectional = bidirectional
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
    // TODO
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

  position: Point = Point(0, 0)
  parent: Graph | Node | null
  children: (Node | null)[] = []
  public value: any = null


  constructor(parent: Graph | Node) {
    this.parent = parent
  }


  public isValid(): boolean {
    return this.parent !== null
  }

  assertValid(): void {
    if(!this.isValid()) {
      throw new TypeError("This tree node has become invalid.")
    }
  }


  public getChild(index: number): Node | null {
    this.assertValid()
    return this.children[index]
  }

  public removeSlot(index: number): void {
    this.assertValid()
    this.children.splice(index, 1)
  }


  invalidateRecursive(): void {
    this.parent = null
    for(let child of this.children) {
      child?.invalidateRecursive()
    }
  }

  public delete(keepSlot: boolean = false): void {
    if(!this.isValid()) return

    if(this.parent instanceof Graph) {
      this.parent.root = null
    } else if(this.parent instanceof Node) {
      let removed = false
      for(let i = 0; i < this.parent.children.length; i++) {
        if(this.parent.children[i] === this) {
          this.parent.children[i] = null
          if(!keepSlot) this.parent.removeSlot(i)
          removed = true
          break
        }
      }
      if(!removed) throw new TypeError("Tree node's parent is supposed to be a tree node, but none of its children are this instance.")
    }
    this.invalidateRecursive()
  }

}

export class Graph extends Model {

  root: Node | null = null


  public setRoot(value: any) {
    if(this.root !== null) {
      this.root.delete()
    }
    this.root = new Node(this)
    this.root.value = value
  }


  public draw(drawer: Drawer): void {
    // TODO
  }

}
