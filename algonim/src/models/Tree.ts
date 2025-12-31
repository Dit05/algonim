import { Model } from './Model'
import { Drawer } from '@/gfx/Drawer'


class TreeNode {

  parent: Tree | TreeNode | null
  children: (TreeNode | null)[] = []
  public value: any = null


  constructor(parent: Tree | TreeNode) {
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


  public getChild(index: number): TreeNode | null {
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

    if(this.parent instanceof Tree) {
      this.parent.root = null
    } else if(this.parent instanceof TreeNode) {
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

export class Tree extends Model {

  root: TreeNode | null = null


  public setRoot(value: any) {
    if(this.root !== null) {
      this.root.delete()
    }
    this.root = new TreeNode(this)
    this.root.value = value
  }


  public draw(drawer: Drawer): void {
    throw new Error('Method not implemented.')
  }

}
