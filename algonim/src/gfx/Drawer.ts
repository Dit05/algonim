import { Region } from './Region'


type CanvasStyle = string | CanvasGradient | CanvasPattern
export class Drawer {

  readonly context: CanvasRenderingContext2D
  readonly region: Region


  constructor(context: CanvasRenderingContext2D, region: Region) {
    this.context = context
    this.region = region
    this.context.strokeStyle = "black"
  }


  public subregion(region: Region): Drawer {
    return new Drawer(this.context, this.region.subregion(region))
  }

  public getLocalRegion(): Region {
    return new Region(0, 0, this.region.width, this.region.height)
  }


  doClipped(fn: () => void) {
    this.context.save()
    this.context.translate(this.region.x, this.region.y)
    this.context.beginPath()
    this.context.rect(0, 0, this.region.width, this.region.height)
    this.context.clip()
    fn()
    this.context.restore()
  }

  public drawLine(startX: number, startY: number, endX: number, endY: number, strokeStyle: CanvasStyle) {
    this.doClipped(() => {
      this.context.beginPath()
      this.context.moveTo(startX, startY)
      this.context.lineTo(endX, endY)
      this.context.strokeStyle = strokeStyle;
      this.context.stroke()
    })
  }

  public drawText(text: string, x: number, y: number, fillStyle: CanvasStyle) {
    this.doClipped(() => {
      this.context.font = "24px sans" // TODO better
      this.context.textBaseline = "top"
      this.context.fillStyle = fillStyle;
      this.context.fillText(text, x, y)
    })
  }

  public fill(fillStyle: CanvasStyle) {
    this.doClipped(() => {
      this.context.fillStyle = fillStyle;
      this.context.fillRect(0, 0, this.region.width, this.region.height)
    })
  }

}
