import { Drawer } from '@/gfx/Drawer'
import { Model } from './Model'


export type DrawFn = (drawer: Drawer) => void

/** Model that invokes another model, then lets you draw over it. */
export class Overlay extends Model {

  public readonly contained: Model
  public drawBefore: DrawFn | undefined = undefined
  public drawAfter: DrawFn | undefined = undefined


  public constructor(contained: Model) {
    super()
    this.contained = contained
  }

  public draw(drawer: Drawer): void {
    if(this.drawBefore) this.drawBefore(drawer)
    this.contained.draw(drawer)
    if(this.drawAfter) this.drawAfter(drawer)
  }

}
