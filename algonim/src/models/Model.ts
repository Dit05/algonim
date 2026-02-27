import { Drawer } from '@/gfx/Drawer'


/** Something that can present something on a canvas. */
export abstract class Model {
  public abstract draw(drawer: Drawer): void
}
