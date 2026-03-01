import { Model } from './Model'
import { Drawer } from '@/gfx/Drawer'
import { Point, Size, SizeUtil } from '@/gfx/Primitives'
import { TextAlign, FontStyle, LineStyle, ArrowStyle } from '@/gfx/Styles'
import { TextWrapper, TextAtom, ClipResult, Text, SpaceAtom } from '@/gfx/TextWrapper'
import * as CONFIG from '@/config'


export class Line {
  public text: string = ''
  /** Signs present on this line. Note that signs need to refer back to their line, so prefer using {@link Sign.constructor} instead of manipulating this directly, as that will automatically add them to the array. */
  public signs: Sign[] = []
}

// TODO draw a box around it or something
/** An extra bit of text that appears after a line. */
export class Sign implements TextAtom {

  private static readonly ALIGN: TextAlign = { align: 'left', baseline: 'top' }

  private readonly line: Line | null
  public text: string = ''
  public style: SignStyle

  constructor(line: Line, style: SignStyle) {
    this.line = line
    this.style = style
    line.signs.push(this)
  }

  public destroy() {
    if(this.line === null) throw new TypeError("This sign has been destroyed.")

    const index = this.line.signs.indexOf(this)
    if(index === -1) {
      if(CONFIG.CONSISTENCY_CHECKS) CONFIG.warnInconsistency("Non-destroyed Sign not in signs array of Line.")
      return
    }

    this.line.signs.splice(index, 1)
  }

  // TextAtom
  measure(drawer: Drawer, style: FontStyle): Size {
    // Ignore height
    return Size(SizeUtil.fromMetricsFont(drawer.measureText(this.text, Sign.ALIGN, style)).width, 0)
  }

  draw(position: Point, drawer: Drawer, style: FontStyle): void {
    drawer.drawText(this.text, position, Sign.ALIGN, { ...style, ...this.style.fontStyle })
  }

  tryClip(_maxWidth: number, _style: FontStyle): ClipResult<TextAtom> | null { return null }
  trimFromEnd(): boolean { return false }
  //

}

export type SignStyle = {
  fontStyle: Partial<FontStyle>
}

export class Code extends Model {

  private lines: Line[] = []
  /** Lines that should have an arrow before them. Can be a `number`, a `function` mapping line numbers to `boolean`s, or `null` to not have any arrows. */
  public arrowLines: number | ((line: number) => boolean) | null = null

  // Styling
  /** Position where drawing begins. */
  public origin: Point = Point(12, 12)

  /** Style applied to most text. */
  public textStyle: Partial<FontStyle> = {}
  /** {@inheritDoc gfx/TextWrapper.TextWrapper.textHeightFactor} */
  public textHeightFactor: number = 0.8

  /** Distance between the end of the line and the start of `Sign`s. */
  public signSeparation: number = 12
  /** Distance between individual `Sign`s. */
  public signSpacing: number = 8
  /** Style applied to newly created `Sign`s. The font style is not inherited from `textStyle`. @see textStyle */
  public defaultSignStyle: SignStyle = {
    fontStyle: { fill: 'blue' }
  }

  /** Number of the first visible line. */
  public numberingStart: number = 1
  /**
  * Overrides the main text style for line numbers. Setting this to null will cause lines to not be numbered. Note that the number separator needs to be disabled separately.
  * @see textStyle
  * @see numberSeparatorStyle
  */
  public numberingStyleOverride: Partial<FontStyle> | null = { fill: 'gray' }
  /** Style applied to the line separating a line's numbering from its content. */
  public numberSeparatorStyle: Partial<LineStyle> | null = { stroke: 'gray' }
  /** Space before and after the number separator. @see numberSeparatorStyle */
  public readonly numberSeparatorMargins = {
    'before': 4,
    'after': 12
  }

  /** Space between the tip of an arrow and the start of the line content it's pointing at. */
  public arrowDistance: number = 6
  /** Horizontal length of an arrow's main line. */
  public arrowLength: number = 24
  /** Style applied to arrows. */
  public readonly arrowStyle: {
    line: Partial<LineStyle>,
    head: ArrowStyle
  } = {
    line: { stroke: 'red', lineWidth: 2 },
    head: { length: 10, angleDegrees: 30 }
  }
  //


  /** Creates one line for every element of the given array. Future modifications to the array won't be reflected by the lines. */
  public setLines(lines: string[]) {
    this.lines = lines.map((str) => {
      const line = new Line()
      line.text = str
      return line
    })
  }

  /** Creates a sign at the end of the given line, numbered from 0. */
  public createSign(lineNumber: number): Sign {
    const line = this.lines[lineNumber]
    return new Sign(line, this.defaultSignStyle)
  }

  private static measureAndRemoveIndent(text: string): { indent: number, deindented: string } {
    let indent = 0
    let removeCount = 0
    for(let i = 0; i < text.length; i++) {
      let done = false
      switch(text[i]) {
        case ' ': indent += 1; break
        case '\t': indent += 2; break
        default: done = true; break
      }
      if(done) break
      else removeCount += 1
    }
    return {
      indent: indent,
      deindented: text.substring(removeCount)
    }
  }

  public draw(drawer: Drawer) {
    let isArrowLine: (n: number) => boolean
    switch(typeof(this.arrowLines)) {
      case 'number':
        isArrowLine = n => n == this.arrowLines
        break
      case 'function':
        isArrowLine = this.arrowLines
        break
      default:
        if(this.arrowLines !== null) {
          console.warn(`CodeModel's arrowLines should be a number, a function from number to boolean, or null`)
        }
        isArrowLine = _ => false
        break
    }

    const em: number = drawer.measureText('m', {}, this.textStyle).width

    const wrapper = new TextWrapper(drawer)
    wrapper.textHeightFactor = this.textHeightFactor

    let y = this.origin.y
    const beginX = this.origin.x

    const effectiveNumberingStyle: Partial<FontStyle> | null = this.numberingStyleOverride !== null ? { ...this.textStyle, ...this.numberingStyleOverride } : null
    let numbersWidth = 0
    if(effectiveNumberingStyle !== null) {
      for(let i = 0; i < this.lines.length; i++) {
        numbersWidth = Math.max(numbersWidth, drawer.measureText(String(this.numberingStart + i), {}, effectiveNumberingStyle).width)
      }
    }

    for(let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i]
      let lineContent = line.text

      let x = beginX

      if(effectiveNumberingStyle !== null) {
        drawer.drawText(String(this.numberingStart + i), Point(x, y), { align: 'left', baseline: 'top' }, effectiveNumberingStyle)
        x += numbersWidth
      }
      let numberSeparatorX: number | null = null
      if(this.numberSeparatorStyle !== null) {
        x += this.numberSeparatorMargins.before
        numberSeparatorX = x
        x += this.numberSeparatorMargins.after
      }

      const indentInfo = Code.measureAndRemoveIndent(lineContent)
      lineContent = indentInfo.deindented
      x += indentInfo.indent * em
      const arrowX = x

      const text: Text = [lineContent]
      if(line.signs.length > 0) {
        text.push(new SpaceAtom(Size(this.signSeparation, 0)))
        const spacer = new SpaceAtom(Size(this.signSpacing, 0))
        for(let i = 0; i < line.signs.length; i++) {
          text.push(line.signs[i])
          if(i < line.signs.length - 1) text.push(spacer)
        }
      }

      const drawResult = wrapper.drawText(text, Point(x, y), drawer.getSize().width - x, this.textStyle)

      if(this.numberSeparatorStyle !== null && numberSeparatorX !== null) {
        drawer.drawLine(Point(numberSeparatorX, y), Point(numberSeparatorX, y + drawResult.size.height - 1), this.numberSeparatorStyle)
      }

      if(isArrowLine(i)) {
        const start = Point(arrowX - this.arrowDistance - this.arrowLength, y + drawResult.size.height / 2)
        const end = Point(arrowX - this.arrowDistance, y + drawResult.size.height / 2)
        drawer.drawLine(start, end, this.arrowStyle.line)
        drawer.drawArrowhead(start, end, this.arrowStyle.line, this.arrowStyle.head)
      }

      y += drawResult.size.height
    }
  }

}
