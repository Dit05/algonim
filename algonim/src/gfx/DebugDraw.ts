import { Size, Point } from "./Primitives"
import { Drawer } from "./Drawer"
import { DrawStyle } from "./Styles"


export class DebugDraw {

  public static point(drawer: Drawer, x: number, y: number, stroke: DrawStyle = '#ff00ff', radius: number = 3) {
    drawer.drawLine(x - radius, y, x + radius, y, { stroke: stroke })
    drawer.drawLine(x, y - radius, x, y + radius, { stroke: stroke })
  }

  public static box(drawer: Drawer, pos: Point, size: Size, stroke: DrawStyle = '#ff00ff') {
    drawer.drawLine(pos.x - size.width / 2, pos.y - size.height / 2, pos.x + size.width / 2, pos.y - size.height / 2)
    drawer.drawLine(pos.x - size.width / 2, pos.y + size.height / 2, pos.x + size.width / 2, pos.y + size.height / 2)
    drawer.drawLine(pos.x - size.width / 2, pos.y - size.height / 2, pos.x - size.width / 2, pos.y + size.height / 2)
    drawer.drawLine(pos.x + size.width / 2, pos.y - size.height / 2, pos.x + size.width / 2, pos.y + size.height / 2)
  }

}
