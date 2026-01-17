import { Region } from './Region'
import { DrawStyle, LineStyle, ArrowStyle, FontStyle, TextAlign } from './Styles'


export class Drawer {

  // TODO cascading style sheets support (or something similar)
  static readonly defaultLineStyle: LineStyle = {
    stroke: 'black',
    lineWidth: 1.0,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    lineDash: [],
    lineDashOffset: 0
  }

  static readonly defaultArrowStyle: ArrowStyle = {
    /**
    * "Shallowness" of the arrow.
    * 0°: prongs point back towards the start point
    * 90°: prongs point perpendicularly outwards
    */
    angleDegrees: 45,
    length: 10
  }

  static readonly defaultFontStyle: FontStyle = {
    fill: 'black',
    line: null,
    font: '24px sans',
    fontKerning: 'auto',
    fontStretch: 'normal',
    fontVariantCaps: 'normal',
    textBaseline: 'alphabetic',
    letterSpacing: '0px'
  }

  static readonly defaultTextAlign: TextAlign = {
    align: 'center',
    baseline: 'middle'
  }


  readonly context: CanvasRenderingContext2D
  readonly region: Region


  constructor(context: CanvasRenderingContext2D, region: Region) {
    this.context = context
    this.region = region
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

  applyLineStyle(style: Partial<LineStyle>) {
    const effectiveStyle: LineStyle = { ...Drawer.defaultLineStyle, ...style }
    this.context.strokeStyle = effectiveStyle.stroke
    this.context.lineWidth = effectiveStyle.lineWidth
    this.context.lineCap = effectiveStyle.lineCap
    this.context.lineJoin = effectiveStyle.lineJoin
    this.context.miterLimit = effectiveStyle.miterLimit
    this.context.setLineDash(effectiveStyle.lineDash)
    this.context.lineDashOffset = effectiveStyle.lineDashOffset
  }

  applyTextAlign(align: Partial<TextAlign>) {
    const effectiveAlign: TextAlign = { ...Drawer.defaultTextAlign, ...align }
    this.context.textAlign = effectiveAlign.align
    this.context.textBaseline = effectiveAlign.baseline
  }

  applyFontStyle(style: Partial<FontStyle>) {
    const effectiveStyle: FontStyle = { ...Drawer.defaultFontStyle, ...style }
    this.context.font = effectiveStyle.font
    this.context.fontKerning = effectiveStyle.fontKerning
    this.context.fontStretch = effectiveStyle.fontStretch
    this.context.fontVariantCaps = effectiveStyle.fontVariantCaps
    this.context.textBaseline = effectiveStyle.textBaseline
    this.context.letterSpacing = effectiveStyle.letterSpacing

    if(effectiveStyle.fill !== null) {
      this.context.fillStyle = effectiveStyle.fill
    }
    if(effectiveStyle.line !== null) {
      this.applyLineStyle(effectiveStyle.line)
    }
  }

  public drawLine(startX: number, startY: number, endX: number, endY: number, style: Partial<LineStyle>) {
    this.drawMultiLine([{x: startX, y: startY}, {x: endX, y: endY}], style)
  }

  public drawMultiLine(points: Iterable<{x: number, y: number}>, style: Partial<LineStyle>) {
    this.doClipped(() => {
      this.context.beginPath()
      this.applyLineStyle(style)

      let first = true
      for(let point of points) {
        if(first) {
          this.context.moveTo(point.x, point.y)
          first = false
        } else {
          this.context.lineTo(point.x, point.y)
        }
      }

      this.context.stroke()
    })
  }

  public drawArrow(startX: number, startY: number, endX: number, endY: number, lineStyle: Partial<LineStyle>, arrowStyle: Partial<ArrowStyle>) {
    const effectiveArrowStyle: ArrowStyle = { ...Drawer.defaultArrowStyle, ...arrowStyle }
    this.drawLine(startX, startY, endX, endY, lineStyle)

    const radians = effectiveArrowStyle.angleDegrees / 180.0 * Math.PI
    const sin = Math.sin(radians)
    const cos = Math.cos(radians)

    // i: perpendicular to the end of the arrow
    // j: backwards
    let dx = endX - startX
    let dy = endY - startY
    if(Math.abs(dx) < 0.00001 && Math.abs(dy) < 0.00001) return

    const len = Math.sqrt(dx*dx + dy*dy)
    dx /= len
    dy /= len

    const scale = effectiveArrowStyle.length
    const i = { x: -dy * scale, y: +dx * scale }
    const j = { x: -dx * scale, y: -dy * scale }

    this.drawLine(endX, endY, endX + sin * i.x + cos * j.x, endY + sin * i.y + cos * j.y, lineStyle)
    this.drawLine(endX, endY, endX - sin * i.x + cos * j.x, endY - sin * i.y + cos * j.y, lineStyle)
  }

  public drawText(text: string, x: number, y: number, align: Partial<TextAlign> = {}, style: Partial<FontStyle> = {}) {
    // TODO account for non-individually customizable stuff like textRendering
    const effectiveStyle: FontStyle = { ...Drawer.defaultFontStyle, ...style }

    this.doClipped(() => {
      this.applyFontStyle(style)
      this.applyTextAlign(align)

      if(effectiveStyle.fill !== null) {
        this.context.fillText(text, x, y)
      }
      if(effectiveStyle.line !== null) {
        this.context.strokeText(text, x, y)
      }
    })
  }

  public measureText(text: string, align: Partial<TextAlign> = {}, style: Partial<FontStyle> = {}): TextMetrics {
    let measured: TextMetrics | null = null

    this.doClipped(() => {
      this.applyFontStyle(style)
      this.applyTextAlign(align)
      measured = this.context.measureText(text)
    })

    if(measured === null) {
      throw Error("doClipped did not invoke the passed-in lambda.")
    }

    return measured
  }

  public fill(fillStyle: DrawStyle) {
    this.doClipped(() => {
      this.context.fillStyle = fillStyle;
      this.context.fillRect(0, 0, this.region.width, this.region.height)
    })
  }

}
