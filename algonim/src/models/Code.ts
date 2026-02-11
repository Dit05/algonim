import { Model } from './Model'
import { Drawer } from '@/gfx/Drawer'
import { Point, Size } from '@/gfx/Primitives'
import { TextAlign, FontStyle } from '@/gfx/Styles'
import { TextWrapper } from '@/gfx/TextWrapper'
import * as CONFIG from '@/config'


class Line {
  text: string = ''
  signs: Sign[] = []
}

export class Sign {
  line: Line | null
  text: string = ''

  constructor(line: Line) {
    this.line = line
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
}

export class Code extends Model {

  lines: Line[] = []
  public arrowLine: number | null = null


  public setLines(lines: string[]) {
    this.lines = lines.map((str) => {
      const line = new Line()
      line.text = str
      return line
    })
  }

  public createSign(lineNumber: number): Sign {
    const line = this.lines[lineNumber]
    const sign = new Sign(line)
    line.signs.push(sign)
    return sign
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

  // TODO customizability
  public draw(drawer: Drawer) {
    const align: TextAlign = { align: 'start', baseline: 'top' }
    const style: Partial<FontStyle> = { fill: 'black' }

    const wrapper = new TextWrapper(drawer)

    const em: number = drawer.measureText('m', align, style).width
    const HYPHEN: string = '-'

    // TODO numbered lines
    // TODO reintroduce signs as TextWrapper atoms

    let y = 12
    const spacingFactor = 0.8
    const gutterWidth = 24

    for(let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i]
      const indentSize = Code.measureIndent(line.text) * em

      const x = gutterWidth + indentSize
      const wrapResult = wrapper.drawText([line.text], Point(x, y), drawer.getSize().width - x, align, style)

      /*
      for(let sign of line.signs) {
        x += 10
        drawer.drawText(sign.text, Point(x, y), align, { ...style, ...{ fill: 'blue' } })
        x += drawer.measureText(sign.text, align, { ...style, ...{ fill: 'blue' } }).width
      }
      */

      if(i == this.arrowLine) {
        const start = Point(gutterWidth + indentSize - 12, y + wrapResult.height / 2)
        const end = Point(gutterWidth + indentSize - 2, y + wrapResult.height / 2)
        drawer.drawLine(start, end, { stroke: 'red' })
        drawer.drawArrowhead(start, end, { stroke: 'red' }, { length: 4 })
      }

      y += wrapResult.height
    }
  }

}
