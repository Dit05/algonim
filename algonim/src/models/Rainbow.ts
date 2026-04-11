import { Drawer } from '@/gfx/Drawer'
import { Point, Size } from '@/gfx/Primitives'
import { Raster } from './Raster'
import { ColorUtil, Color } from '@/gif/Color'


/**
* Draws lots of colors to annoy the GIF encoder.
*/
export class Rainbow extends Raster<Size> {

  protected prepare(drawer: Drawer): Size {
    return drawer.getSize()
  }

  public getColor(point: Point, data: Size): Color {
    const v = (point.y / (data.height - 1) * 2) - 1
    const u = point.x / (data.width - 1)
    return ColorUtil.hsv(u, 1 - Math.max(0, -v), 1 - Math.max(0, v))
  }

}
