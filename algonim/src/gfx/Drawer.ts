import { Point, Size } from './Primitives'
import { Region } from './Region'
import { DrawStyle, LineStyle, ArrowStyle as ArrowheadStyle, FontStyle, TextAlign } from './Styles'


/** Extra parameters for {@link Drawer.drawEllipse}. */
export type EllipseExtras = {
  rotation: number,
  startAngle: number,
  endAngle: number,
  counterclockwise: boolean
}

/** Draws onto a {@link Region} of a [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D). */
export class Drawer {

  private static readonly defaultLineStyle: LineStyle = {
    stroke: 'black',
    lineWidth: 1.0,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    lineDash: [],
    lineDashOffset: 0
  }
  /** Makes a {@link LineStyle} non-partial by setting missing properties to defaults. */
  public static completeLineStyle(partial: Partial<LineStyle>): LineStyle {
    return { ...Drawer.defaultLineStyle, ...partial }
  }

  private static readonly defaultArrowheadStyle: ArrowheadStyle = {
    /**
    * "Shallowness" of the arrow.
    * 0°: prongs point back towards the start point
    * 90°: prongs point perpendicularly outwards
    */
    angleDegrees: 45,
    length: 10
  }
  /** Makes a {@link ArrowheadStyle} non-partial by setting missing properties to defaults. */
  public static completeArrowheadStyle(partial: Partial<ArrowheadStyle>): ArrowheadStyle {
    return { ...Drawer.defaultArrowheadStyle, ...partial }
  }

  private static readonly defaultFontStyle: FontStyle = {
    fill: 'black',
    line: null,
    font: '24px sans',
    fontKerning: 'auto',
    fontStretch: 'normal',
    fontVariantCaps: 'normal',
    textBaseline: 'alphabetic',
    letterSpacing: '0px'
  }
  /** Makes a {@link FontStyle} non-partial by setting missing properties to defaults. */
  public static completeFontStyle(partial: Partial<FontStyle>): FontStyle {
    return { ...Drawer.defaultFontStyle, ...partial }
  }

  private static readonly defaultTextAlign: TextAlign = {
    align: 'center',
    baseline: 'middle'
  }
  /** Makes a {@link TextAlign} non-partial by setting missing properties to defaults. */
  public static completeTextAlign(partial: Partial<TextAlign>): TextAlign {
    return { ...Drawer.defaultTextAlign, ...partial }
  }


  private readonly context: CanvasRenderingContext2D
  private readonly region: Region
  private readonly clipRegion: Region
  private readonly origin: Point


  /**
  * Constructs a new drawer from a raw rendering context. This is likely not what you want, if you're just making a sequence.
  *
  * The rationale for there being two different regions is that it's convenient for some algorithms to have a well-defined area for them to draw their graphic in.
  * Passing the clipping region itself to such algorithms would cause unexpected results when the clipping region itself has to be clipped within a parent drawer.
  *
  * @param context The rendering context to draw onto.
  * @param region Area for drawing, in canvas coordinates.
  * @param clipRegion Area where drawing is actually visible, in canvas coordinates.
  * @param origin The place where (0, 0) is within the drawing region.
  *
  * @see {@link gfx/Border.EllipseBorder.draw} for an example of something that would behave unexpectedly.
  */
  public constructor(context: CanvasRenderingContext2D, region: Region, clipRegion: Region, origin: Point = Point(0, 0)) {
    this.context = context
    this.region = region
    this.clipRegion = clipRegion
    this.origin = origin
  }


  /**
  * Creates a sub-drawer that draws to the same context as this one, but clipped to a lesser or equal region.
  *
  * @param region Area where the resulting sub-drawer will draw, in the coordinates of the current drawer's region. The sub-drawer's clipping region will be constrained to the clipping region of this instance.
  *
  * @see {@link constructor} for why there is a separate drawing and clipping region.
  */
  public subregion(region: Region): Drawer {
    const sub = this.region.subregion(region, false)
    return new Drawer(this.context, sub, sub.clippedBy(this.clipRegion))
  }

  /** Creates a copy of this but with a different origin. */
  public withTranslatedOrigin(origin: Point): Drawer {
    return new Drawer(this.context, this.region, this.clipRegion, Point(this.origin.x + origin.x, this.origin.y + origin.y))
  }

  /**
  * Gets the size of the drawing region.
  *
  * @see {@link getClipSize} if you want the size of the clipping region instead.
  * @see {@link constructor} for why there is a separate drawing and clipping region.
  */
  public getSize(): Size { return this.region.size }

  /**
  * Gets the size of the clipping region.
  *
  * @see {@link getClipSize} if you want the size of the drawing region instead.
  * @see {@link constructor} for why there is a separate drawing and clipping region.
  */
  public getClipSize(): Size { return this.clipRegion.size }

  /** Creates a region with an origin of (0, 0) and a size of {@link getSize}. */
  public getLocalRegion(): Region {
    return new Region(Point(0, 0), this.region.size)
  }


  private doClipped(fn: () => void, skipOrigin: boolean = false) {
    this.context.save()
    this.context.beginPath()
    this.context.rect(this.clipRegion.origin.x, this.clipRegion.origin.y, this.clipRegion.size.width, this.clipRegion.size.height)
    this.context.clip()
    this.context.translate(this.region.origin.x, this.region.origin.y)
    if(!skipOrigin) this.context.translate(this.origin.x, this.origin.y)
    fn()
    this.context.restore()
  }

  private applyLineStyle(style: Partial<LineStyle>) {
    const effectiveStyle: LineStyle = Drawer.completeLineStyle(style)
    this.context.strokeStyle = effectiveStyle.stroke
    this.context.lineWidth = effectiveStyle.lineWidth
    this.context.lineCap = effectiveStyle.lineCap
    this.context.lineJoin = effectiveStyle.lineJoin
    this.context.miterLimit = effectiveStyle.miterLimit
    this.context.setLineDash(effectiveStyle.lineDash)
    this.context.lineDashOffset = effectiveStyle.lineDashOffset
  }

  private applyFillStyle(style: DrawStyle) {
    this.context.fillStyle = style
  }

  private applyTextAlign(align: Partial<TextAlign>) {
    const effectiveAlign: TextAlign = Drawer.completeTextAlign(align)
    this.context.textAlign = effectiveAlign.align
    this.context.textBaseline = effectiveAlign.baseline
  }

  private applyFontStyle(style: Partial<FontStyle>) {
    const effectiveStyle: FontStyle = Drawer.completeFontStyle(style)
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


  /** Draws a line between two points. */
  public drawLine(start: Point, end: Point, style: Partial<LineStyle> = {}) {
    this.drawMultiLine([start, end], style)
  }

  /** Draws a line through multiple points. Line drawing only takes place if the iterable yields at least two points. */
  public drawMultiLine(points: Iterable<Point>, style: Partial<LineStyle>) {
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


  /**
  * Draws the head of an arrow at the end of the specified line.
  *
  * A full arrow can be drawn by calling {@link drawLine} with the same points.
  *
  * A two-headed arrow can be drawn by calling this again, but with the start and end points swapped.
  */
  public drawArrowhead(start: Point, end: Point, lineStyle: Partial<LineStyle> = {}, arrowheadStyle: Partial<ArrowheadStyle> = {}) {
    const effectiveArrowStyle: ArrowheadStyle = Drawer.completeArrowheadStyle(arrowheadStyle)

    const radians = effectiveArrowStyle.angleDegrees / 180.0 * Math.PI
    const sin = Math.sin(radians)
    const cos = Math.cos(radians)

    // i: perpendicular to the end of the arrow
    // j: backwards
    let dx = end.x - start.x
    let dy = end.y - start.y
    if(Math.abs(dx) < 0.00001 && Math.abs(dy) < 0.00001) return

    const len = Math.sqrt(dx*dx + dy*dy)
    dx /= len
    dy /= len

    const scale = effectiveArrowStyle.length
    const i = { x: -dy * scale, y: +dx * scale }
    const j = { x: -dx * scale, y: -dy * scale }

    this.drawLine(end, Point(end.x + sin * i.x + cos * j.x, end.y + sin * i.y + cos * j.y), lineStyle)
    this.drawLine(end, Point(end.x - sin * i.x + cos * j.x, end.y - sin * i.y + cos * j.y), lineStyle)
  }


  /** Draws an ellipse. @see [CanvasRenderingContext2D.ellipse](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/ellipse) */
  public drawEllipse(center: Point, size: Size, lineStyle: Partial<LineStyle> | null = {}, fillStyle: DrawStyle | null = null, extras: Partial<EllipseExtras> = {}) {
    this.doClipped(() => {

      const effectiveExtras: EllipseExtras = { ...{
          rotation: 0,
          startAngle: 0,
          endAngle: Math.PI * 2,
          counterclockwise: false
        }, ...extras }

      const ellipse = function(ctx: CanvasRenderingContext2D) {
        ctx.ellipse(center.x, center.y, size.width / 2, size.height / 2, effectiveExtras.rotation, effectiveExtras.startAngle, effectiveExtras.endAngle, effectiveExtras.counterclockwise)
      }

      if(fillStyle != null) {
        this.applyFillStyle(fillStyle)
        this.context.beginPath()
        ellipse(this.context)
        this.context.fill()
      }
      if(lineStyle != null) {
        this.applyLineStyle(lineStyle)
        this.context.beginPath()
        ellipse(this.context)
        this.context.stroke()
      }
    })
  }


  /** Draws some text. You can use {@link gfx/TextWrapper.TextWrapper} if you need wrapping. */
  public drawText(text: string, position: Point, align: Partial<TextAlign> = {}, style: Partial<FontStyle> = {}) {
    // TODO account for non-individually customizable stuff like textRendering
    const effectiveStyle: FontStyle = Drawer.completeFontStyle(style)

    this.doClipped(() => {
      this.applyFontStyle(effectiveStyle)
      this.applyTextAlign(align)

      if(effectiveStyle.fill !== null) {
        this.context.fillText(text, position.x, position.y)
      }
      if(effectiveStyle.line !== null) {
        this.context.strokeText(text, position.x, position.y)
      }
    })
  }

  /** Measures some text. Useful for making judgements about how to draw it. @see [TextMetrics](https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics) */
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


  /** Fills the entire drawing area. */
  public fill(fillStyle: DrawStyle) {
    this.doClipped(() => {
      this.context.fillStyle = fillStyle;
      this.context.fillRect(0, 0, this.region.size.width, this.region.size.height)
    }, true) // Skip the origin offset for this
  }

  /**
  * Escape hatch that gives you direct access to the underlying [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D).
  *
  * SAFETY: The drawing state stack MUST NOT be different after your function returns! This is to prevent future drawing operations from being affected.
  */
  public drawFreeform(fn: (ctx: CanvasRenderingContext2D) => void) {
    this.doClipped(() => {
      fn(this.context)
    })
  }

}
