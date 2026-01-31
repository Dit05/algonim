import { Region } from './Region'
import { DrawStyle, LineStyle } from './Styles';
import { Point, Size, SizeUtil } from './Primitives';
import { Drawer } from './Drawer';


export abstract class Border {

  /**
  * Calculates the border's bounding box for an origin-centered rectangle of the given size.
  */
  public abstract getBounds(contentSize: Size): Region

  /**
  * Returns a point on the border in the given direction.
  */
  public abstract getBoundaryPoint(contentSize: Size, angle: number): Point

  /**
  * Draws the border within the previously calculated bounding box.
  */
  public abstract draw(drawer: Drawer): void

}

export abstract class LineAndFillBorder extends Border {

  public line: Partial<LineStyle> | null = {}
  public fill: DrawStyle | null = null

}

export class EllipseBorder extends LineAndFillBorder {

  static readonly MARGIN: number = 2 // Margin added to the bounds to prevent antialiasing from becoming clipped away (more noticeable than you think!).


  getSemiAxes(contentSize: Size): Size {
    // Calculate the bounds for drawing a circle around the unit square
    // The circle shares its center with the square, and its radius is half the diagonal: sqrt(2)/2
    // Doubling the radius gets us the diameter and also the size of the bounds: sqrt(2)
    // Nice!

    // Now all we need to do is scale the points.
    return Size(-Math.SQRT2 * contentSize.width / 2, -Math.SQRT2 * contentSize.height / 2)
  }

  public getBounds(contentSize: Size): Region {
    const semiAxes = this.getSemiAxes(contentSize)

    const start = Point(semiAxes.width - EllipseBorder.MARGIN, semiAxes.height - EllipseBorder.MARGIN)
    const end = Point(-semiAxes.width + EllipseBorder.MARGIN, -semiAxes.height + EllipseBorder.MARGIN)
    return Region.fromStartEnd(start, end)
  }

  public getBoundaryPoint(contentSize: Size, angle: number): Point {
    const semiAxes = this.getSemiAxes(contentSize)
    return Point(semiAxes.width * Math.cos(angle), semiAxes.height * Math.sin(angle))
  }

  public draw(drawer: Drawer): void {
    drawer.drawEllipse(Point(0, 0), SizeUtil.shrink(drawer.getLocalRegion().size, EllipseBorder.MARGIN * 2), this.line, this.fill)
  }

}
