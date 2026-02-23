import { Point, Vector, Size } from './Primitives'


/** A rectangle with a position and size. */
export class Region {

  public readonly origin: Point
  public readonly size: Size

  public constructor(origin: Point, size: Size) {
    this.origin = origin
    this.size = size
  }


  /** Creates a region from corners. If a start coordinate isn't greater than its corresponding end coordinate, the position on that axis will be the start coordinate, and the size will be zero. */
  public static fromStartEnd(start: Point, end: Point): Region {
    return new Region(
      start,
      Size(Math.max(start.x, end.x) - start.x, Math.max(start.y, end.y) - start.y)
    );
  }

  /** Cuts out a part of this with a region in local coordinates. */
  public subregion(sub: Region, clipped: boolean = true): Region {
    let region = sub.offset(this.origin)
    if(clipped) region = region.clippedBy(this)
    return region
  }

  /** Extracts a vertical column from this region by specifying the start and end of it along the width, ranging from 0 to 1. */
  public hsplit(startFac: number, endFac: number): Region {
    endFac = Math.min(endFac, 1)
    startFac = Math.min(Math.max(startFac, 0), endFac)
    return Region.fromStartEnd(
      Point(this.origin.x, this.origin.y + Math.floor(startFac * this.size.height)),
      Point(this.origin.x + this.size.width, this.origin.y + Math.ceil(endFac * this.size.height))
    )
  }

  /** Extracts a horizontal column from this region by specifying the start and end of it along the height, ranging from 0 to 1. */
  public vsplit(startFac: number, endFac: number): Region {
    endFac = Math.min(endFac, 1)
    startFac = Math.min(Math.max(startFac, 0), endFac)
    return Region.fromStartEnd(
      Point(this.origin.x + Math.floor(startFac * this.size.width), this.origin.y),
      Point(this.origin.x + Math.ceil(endFac * this.size.width), this.origin.y + this.size.height)
    )
  }


  /** Creates a new region that doesn't extend outside the given one. */
  public clippedBy(clip: Region): Region {
    const startX = Math.max(this.origin.x, clip.origin.x)
    const startY = Math.max(this.origin.y, clip.origin.y)
    const endX = Math.min(this.origin.x + this.size.width, clip.origin.x + clip.size.width)
    const endY = Math.min(this.origin.y + this.size.height, clip.origin.y + clip.size.height)
    return Region.fromStartEnd(Point(startX, startY), Point(endX, endY))
  }


  /** Creates a new region by applying a function to all parameters of this. */
  public applyToAll(fn: (arg0: number) => number): Region {
    return new Region(Point(fn(this.origin.x), fn(this.origin.y)), Size(fn(this.size.width), fn(this.size.height)))
  }

  /** Creates a new region by applying a function to the position of this. */
  public applyToPosition(fn: (arg0: number) => number): Region {
    return new Region(Point(fn(this.origin.x), fn(this.origin.y)), this.size)
  }

  /** Creates a new region by applying a function to the size of this. */
  public applyToSize(fn: (arg0: number) => number): Region {
    return new Region(this.origin, Size(fn(this.size.width), fn(this.size.height)))
  }


  /** Creates a new region with the same size as this, but with the origin offset by some vector. */
  public offset(offset: Vector): Region {
    return new Region(Point(this.origin.x + offset.x, this.origin.y + offset.y), this.size)
  }

}
