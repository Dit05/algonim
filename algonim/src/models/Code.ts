import { Model } from './Model'
import { Drawer } from '@/gfx/Drawer'
import { Point, Size, SizeUtil } from '@/gfx/Primitives'
import { TextAlign, FontStyle } from '@/gfx/Styles'
import { TextWrapper, TextAtom, ClipResult, Text, SpaceAtom } from '@/gfx/TextWrapper'
import * as CONFIG from '@/config'


class Line {
  text: string = ''
  signs: Sign[] = []
}

export class Sign implements TextAtom {

  static readonly ALIGN: TextAlign = { align: 'left', baseline: 'top' }

  line: Line | null
  public text: string = ''
  public style: SignStyle

  constructor(line: Line, style: SignStyle) {
    this.line = line
    this.style = style
    line.signs.push(this)
  }

  public destroy() {
    if(this.line === null) throw new TypeError('This sign has been destroyed.')

    const index = this.line.signs.indexOf(this)
    if(index === -1) {
      if(CONFIG.CONSISTENCY_CHECKS) CONFIG.warnInconsistency('Non-destroyed Sign not in signs array of Line')
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

  lines: Line[] = []
  public arrowLines: number | ((line: number) => boolean) | null = null

  // Styling
  public textHeightFactor: number = 0.8

  // TODO further customizability
  /** Distance between the end of the line and the start of `Sign`s. */
  public signSeparation: number = 12
  /** Distance between individual `Sign`s. */
  public signSpacing: number = 8

  /** Style applied to newly created `Sign`s. */
  public defaultSignStyle: SignStyle = {
    fontStyle: { fill: 'blue' }
  }
  //


  public setLines(lines: string[]) {
    this.lines = lines.map((str) => {
      const line = new Line()
      line.text = str
      return line
    })
  }

  public createSign(lineNumber: number): Sign {
    const line = this.lines[lineNumber]
    return new Sign(line, this.defaultSignStyle)
  }

  static measureIndent(text: string): number {
    let indent = 0
    for(let i = 0; i < text.length; i++) {
      let done = false
      switch(text[i]) {
        case ' ': indent += 1; break
        case '\t': indent += 2; break
        default: done = true; break
      }
      if(done) break
    }
    return indent
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

    const style: Partial<FontStyle> = { fill: 'black' }
    const em: number = drawer.measureText('m', {}, style).width

    const wrapper = new TextWrapper(drawer)
    wrapper.textHeightFactor = this.textHeightFactor

    // TODO numbered lines

    let y = 12
    const gutterWidth = 24

    for(let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i]
      const indentSize = Code.measureIndent(line.text) * em

      const text: Text = [line.text]
      if(line.signs.length > 0) {
        text.push(new SpaceAtom(Size(this.signSeparation, 0)))
        const spacer = new SpaceAtom(Size(this.signSpacing, 0))
        for(let i = 0; i < line.signs.length; i++) {
          text.push(line.signs[i])
          if(i < line.signs.length - 1) text.push(spacer)
        }
      }

      const x = gutterWidth + indentSize
      const drawResult = wrapper.drawText(text, Point(x, y), drawer.getSize().width - x, style)

      if(isArrowLine(i)) {
        const start = Point(gutterWidth + indentSize - 12, y + drawResult.size.height / 2)
        const end = Point(gutterWidth + indentSize - 2, y + drawResult.size.height / 2)
        drawer.drawLine(start, end, { stroke: 'red' })
        drawer.drawArrowhead(start, end, { stroke: 'red' }, { length: 4 })
      }

      y += drawResult.size.height
    }
  }

}
