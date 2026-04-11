import { Drawer } from '@/gfx/Drawer'
import { Point, Size, Vector } from '@/gfx/Primitives'
import { Model } from './Model'
import { ColorUtil, Color } from '@/gif/Color'


/** Helper for making models that draw individual pixels. */
export abstract class Raster<TData> extends Model {

  /** Size of individual colored squares in pixels. Increasing this speeds up drawing. */
  public step: Vector = Vector(1, 1)

  public draw(drawer: Drawer): void {
    const data: TData = this.prepare(drawer)

    const size: Size = drawer.getSize()
    if(size.width <= 1 || size.height <= 1) return // Avoid dividing by zero later

    const dx = Math.max(this.step.x, 1)
    const dy = Math.max(this.step.y, 1)

    for(let y = 0; y < size.height; y += dy) {
      for(let x = 0; x < size.width; x += dx) {
        const point = Point(x, y)
        drawer.drawRectangle(point, Size(dx, dy), null, ColorUtil.toHexString(this.getColor(point, data)))
      }
    }

    this.finish(drawer, data)
  }

  protected abstract prepare(drawer: Drawer): TData
  protected abstract getColor(point: Point, data: TData): Color
  protected finish(_drawer: Drawer, _data: TData) {}

}
