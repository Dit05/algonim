import { Drawer } from '@/gfx/Drawer'


export abstract class Model {
  public abstract draw(drawer: Drawer): void
}
