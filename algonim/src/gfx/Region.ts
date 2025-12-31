

export class Region {

  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }


  public static fromStartEnd(startX: number, startY: number, endX: number, endY: number): Region {
    return new Region(
      startX,
      startY,
      Math.max(startX, endX) - startX,
      Math.max(startY, endY) - startY
    );
  }

  public subregion(sub: Region): Region {
    return sub.offset(this.x, this.y).clippedBy(this)
  }

  public hsplit(startFac: number, endFac: number): Region {
    endFac = Math.min(endFac, 1)
    startFac = Math.min(Math.max(startFac, 0), endFac)
    return Region.fromStartEnd(
      this.x,
      this.y + startFac * this.height,
      this.x + this.width,
      this.y + endFac * this.height
    )
  }

  public vsplit(startFac: number, endFac: number): Region {
    endFac = Math.min(endFac, 1)
    startFac = Math.min(Math.max(startFac, 0), endFac)
    return Region.fromStartEnd(
      this.x + startFac * this.width,
      this.y,
      this.x + endFac * this.width,
      this.y + this.height
    )
  }


  public offset(x: number, y: number): Region {
    return new Region(this.x + x, this.y + y, this.width, this.height)
  }

  public clippedBy(clip: Region): Region {
    const startX = Math.max(this.x, clip.x)
    const startY = Math.max(this.y, clip.y)
    const endX = Math.min(this.x + this.width, clip.x + clip.width)
    const endY = Math.min(this.y + this.height, clip.y + clip.height)
    return Region.fromStartEnd(startX, startY, endX, endY)
  }

}
