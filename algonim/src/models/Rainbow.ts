import { Drawer } from '@/gfx/Drawer'
import { Point, Size, Vector } from '@/gfx/Primitives'
import { Model } from './Model'
import { ColorUtil, Color } from '@/gif/Color'


/**
* Draws lots of colors to annoy the GIF encoder.
*/
export class Rainbow extends Model {

  /** Size of individual colored squares in pixels. Increasing this speeds up drawing. */
  public step: Vector = Vector(1, 1)

  public draw(drawer: Drawer): void {
    const size: Size = drawer.getSize()
    if(size.width <= 1 || size.height <= 1) return // Avoid dividing by zero later

    const dx = Math.max(this.step.x, 1)
    const dy = Math.max(this.step.y, 1)

    for(let y = 0; y < size.height; y += dy) {
      const v = (y / (size.height - 1) * 2) - 1
      for(let x = 0; x < size.width; x += dx) {
        const u = x / (size.width - 1)

        const color: Color = ColorUtil.hsv(u, 1 - Math.max(0, -v), 1 - Math.max(0, v))
        drawer.drawRectangle(Point(x, y), Size(dx, dy), null, ColorUtil.toHexString(color))
      }
    }
  }

}
