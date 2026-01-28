import { Point, Size } from './Primitives'


export class Region {

  readonly origin: Point
  readonly size: Size

  constructor(origin: Point, size: Size) {
    this.origin = origin
    this.size = size
  }


  public static fromStartEnd(start: Point, end: Point): Region {
    return new Region(
      start,
      Size(Math.max(start.x, end.x) - start.x, Math.max(start.y, end.y) - start.y)
    );
  }

  public subregion(sub: Region): Region {
    return sub.offset(this.origin.x, this.origin.y).clippedBy(this)
  }

  public hsplit(startFac: number, endFac: number): Region {
    endFac = Math.min(endFac, 1)
    startFac = Math.min(Math.max(startFac, 0), endFac)
    return Region.fromStartEnd(
      Point(this.origin.x, this.origin.y + Math.floor(startFac * this.size.height)),
      Point(this.origin.x + this.size.width, this.origin.y + Math.ceil(endFac * this.size.height))
    )
  }

  public vsplit(startFac: number, endFac: number): Region {
    endFac = Math.min(endFac, 1)
    startFac = Math.min(Math.max(startFac, 0), endFac)
    return Region.fromStartEnd(
      Point(this.origin.x + Math.floor(startFac * this.size.width), this.origin.y),
      Point(this.origin.x + Math.ceil(endFac * this.size.width), this.origin.y + this.size.height)
    )
  }


  public clippedBy(clip: Region): Region {
    const startX = Math.max(this.origin.x, clip.origin.x)
    const startY = Math.max(this.origin.y, clip.origin.y)
    const endX = Math.min(this.origin.x + this.size.width, clip.origin.x + clip.size.width)
    const endY = Math.min(this.origin.y + this.size.height, clip.origin.y + clip.size.height)
    return Region.fromStartEnd(Point(startX, startY), Point(endX, endY))
  }


  public applyToAll(fn: (arg0: number) => number): Region {
    return new Region(Point(fn(this.origin.x), fn(this.origin.y)), Size(fn(this.size.width), fn(this.size.height)))
  }

  public applyToPosition(fn: (arg0: number) => number): Region {
    return new Region(Point(fn(this.origin.x), fn(this.origin.y)), this.size)
  }

  public applyToSize(fn: (arg0: number) => number): Region {
    return new Region(this.origin, Size(fn(this.size.width), fn(this.size.height)))
  }


  public offset(x: number, y: number): Region {
    return new Region(Point(this.origin.x + x, this.origin.y + y), this.size)
  }

}
