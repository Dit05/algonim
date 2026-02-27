import { Size, Point } from "./Primitives"
import { Drawer } from "./Drawer"
import { LineStyle } from "./Styles"


/**
* Provides some drawing primitives.
*/
export class DebugDraw {

  /** Draws a point as a cross. */
  public static point(drawer: Drawer, position: Point, style: Partial<LineStyle> = { stroke: '#ff00ff' }, radius: number = 3) {
    drawer.drawLine(Point(position.x - radius, position.y), Point(position.x + radius, position.y), style)
    drawer.drawLine(Point(position.x, position.y - radius), Point(position.x, position.y + radius), style)
  }

  /** Draws a rectangle. */
  public static box(drawer: Drawer, pos: Point, size: Size, style: Partial<LineStyle> = { stroke: '#ff00ff' }) {
    drawer.drawLine(Point(pos.x - size.width / 2, pos.y - size.height / 2), Point(pos.x + size.width / 2, pos.y - size.height / 2), style)
    drawer.drawLine(Point(pos.x - size.width / 2, pos.y + size.height / 2), Point(pos.x + size.width / 2, pos.y + size.height / 2), style)
    drawer.drawLine(Point(pos.x - size.width / 2, pos.y - size.height / 2), Point(pos.x - size.width / 2, pos.y + size.height / 2), style)
    drawer.drawLine(Point(pos.x + size.width / 2, pos.y - size.height / 2), Point(pos.x + size.width / 2, pos.y + size.height / 2), style)
  }

}
