import { Region } from './Region'
import { DrawStyle, LineStyle, FontStyle, TextAlign } from './Styles'


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

  applyLineStyle(style: LineStyle) {
    this.context.strokeStyle = style.stroke
    this.context.lineWidth = style.lineWidth
    this.context.lineCap = style.lineCap
    this.context.lineJoin = style.lineJoin
    this.context.miterLimit = style.miterLimit
    this.context.setLineDash(style.lineDash)
    this.context.lineDashOffset = style.lineDashOffset
  }

  // TODO customizable line
  public drawLine(startX: number, startY: number, endX: number, endY: number, lineStyle: Partial<LineStyle>) {
    this.doClipped(() => {
      this.context.beginPath()
      this.context.moveTo(startX, startY)
      this.context.lineTo(endX, endY)
      this.applyLineStyle({ ...Drawer.defaultLineStyle, ...lineStyle })
      this.context.stroke()
    })
  }

  public drawText(text: string, x: number, y: number, align: Partial<TextAlign> = {}, style: Partial<FontStyle> = {}) {
    // TODO account for non-individually customizable stuff like textRendering
    const effectiveStyle: FontStyle = { ...Drawer.defaultFontStyle, ...style }
    const effectiveAlign: TextAlign = { ...Drawer.defaultTextAlign, ...align }

    this.doClipped(() => {
      // Apply font style
      this.context.font = effectiveStyle.font
      this.context.fontKerning = effectiveStyle.fontKerning
      this.context.fontStretch = effectiveStyle.fontStretch
      this.context.fontVariantCaps = effectiveStyle.fontVariantCaps
      this.context.textBaseline = effectiveStyle.textBaseline
      this.context.letterSpacing = effectiveStyle.letterSpacing

      // Apply text align
      this.context.textAlign = effectiveAlign.align
      this.context.textBaseline = effectiveAlign.baseline

      if(effectiveStyle.fill !== null) {
        this.context.fillStyle = effectiveStyle.fill
        this.context.fillText(text, x, y)
      }
      if(effectiveStyle.line !== null) {
        this.applyLineStyle(effectiveStyle.line)
        this.context.strokeText(text, x, y)
      }
    })
  }

  public fill(fillStyle: DrawStyle) {
    this.doClipped(() => {
      this.context.fillStyle = fillStyle;
      this.context.fillRect(0, 0, this.region.width, this.region.height)
    })
  }

}
