import { Region } from './Region'
import { DrawStyle, LineStyle } from './Styles';
import { Point, Size, SizeUtil } from './Primitives';
import { Drawer } from './Drawer';


/**
* Graphical element that visually encapsulates a rectangle.
*/
export abstract class Border {

  /** Calculates the border's bounding box for an origin-centered rectangle of the given size. */
  public abstract getBounds(contentSize: Size): Region

  /**
  * Returns a point on the border in the given direction.
  *
  * The angle can be converted to a direction vector by taking `cos(angle)` and `sin(angle)` to be its `x` and `y` respectively.
  */
  public abstract getBoundaryPoint(contentSize: Size, angle: number): Point

  /** Draws the border within the previously calculated bounding box. */
  public abstract draw(contentSize: Size, drawer: Drawer): void

}

/**
* Common ancestor for borders that have a line and a fill style.
*/
export abstract class LineAndFillBorder extends Border {

  /** Style of the border's perimeter line. */
  public line: Partial<LineStyle> | null = {}
  /** Style of the border's interior area. */
  public fill: DrawStyle | null = null

}

/**
* Simple, elliptical border.
*/
export class EllipseBorder extends LineAndFillBorder {

  /** If not `null`, makes the ratio of `width / height` fixed. A value of `1` makes circles, for example. */
  public forceAspectRatio: number | null = null


  /** Calculates a margin to be added to the bounds to prevent antialiasing from becoming clipped away (more noticeable than you think!). */
  private static getEffectiveMargin(lineStyle: Partial<LineStyle>) {
    return 2 + (lineStyle.lineWidth ?? 1)
  }


  private getSemiAxes(contentSize: Size): Size {
    // Calculate the bounds for drawing a circle around the unit square
    // The circle shares its center with the square, and its radius is half the diagonal: sqrt(2)/2
    // Doubling the radius gets us the diameter and also the size of the bounds: sqrt(2)
    // Nice!

    // Now all we need to do is scale the points.

    let width: number = contentSize.width
    let height: number = contentSize.height
    if(this.forceAspectRatio !== null) {
      width = height = Math.max(width, height)
      if(this.forceAspectRatio >= 0) {
        width *= this.forceAspectRatio
      } else {
        height /= this.forceAspectRatio
      }
    }

    return Size(Math.SQRT2 * width / 2, Math.SQRT2 * height / 2)
  }

  public getBounds(contentSize: Size): Region {
    const semiAxes = this.getSemiAxes(contentSize)
    const margin = EllipseBorder.getEffectiveMargin(this.line ?? {})

    const start = Point(-semiAxes.width - margin, -semiAxes.height - margin)
    const end = Point(semiAxes.width + margin, semiAxes.height + margin)
    return Region.fromStartEnd(start, end)
  }

  public getBoundaryPoint(contentSize: Size, angle: number): Point {
    const semiAxes = this.getSemiAxes(contentSize)
    return Point(semiAxes.width * Math.cos(angle), semiAxes.height * Math.sin(angle))
  }

  public draw(contentSize: Size, drawer: Drawer): void {
    drawer.drawEllipse(Point(0, 0), SizeUtil.scale(this.getSemiAxes(contentSize), 2), this.line, this.fill)
  }

}
