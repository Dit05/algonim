import { Model } from './Model'
import { Drawer } from '@/gfx/Drawer'
import { Point, Size } from '@/gfx/Primitives'
import { TextAlign, FontStyle } from '@/gfx/Styles'
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

  static limitTextWidth(text: string, maxWidth: number, drawer: Drawer, align: TextAlign, style: Partial<FontStyle>, hyphen: string = '-'): string {
    if(drawer.measureText(text, align, style).width <= maxWidth) {
      // Happy path: the text just fits
      return text
    }

    let min = 1
    let max = text.length

    while(min + 1 < max) {
      const mid = Math.floor((min + max) / 2)
      const width = drawer.measureText(text.substring(0, mid) + hyphen, align, style).width

      if(width > maxWidth) {
        max = mid
      } else {
        min = mid
      }
    }

    return text.substring(0, min)
  }

  // TODO customizability
  public draw(drawer: Drawer) {
    const align: TextAlign = { align: 'start', baseline: 'top' }
    const style: Partial<FontStyle> = { fill: 'black' }

    const em: number = drawer.measureText('m', align, style).width
    const HYPHEN: string = '-'

    // TODO numbered lines
    let y = 12
    const spacingFactor = 0.8
    const gutterWidth = 24

    let lineCount = 0

    let textLeft = ''
    let line = this.lines[0]
    let indentSize = 0
    while(lineCount < this.lines.length || textLeft.length >= 0) {
      if(textLeft.length <= 0) {
        if(lineCount >= this.lines.length) {
          break
        }
        line = this.lines[lineCount]
        lineCount++
        indentSize = Code.measureIndent(line.text) * em
        textLeft = line.text.trim()
        continue
      }

      const metrics = drawer.measureText(textLeft, align, style)
      const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
      const heightAdvance = height * spacingFactor

      let x = gutterWidth + indentSize

      let spaceLeft = drawer.getLocalRegion().size.width - x
      let fitText = Code.limitTextWidth(textLeft, spaceLeft, drawer, align, style)

      drawer.drawText(fitText.length < textLeft.length ? fitText + HYPHEN : fitText, Point(x, y), align, style)
      x += metrics.width
      // TODO line wrap this
      for(let sign of line.signs) {
        x += 10
        drawer.drawText(sign.text, Point(x, y), align, { ...style, ...{ fill: 'blue' } })
        x += drawer.measureText(sign.text, align, { ...style, ...{ fill: 'blue' } }).width
      }

      if(lineCount == this.arrowLine) {
        const start = Point(gutterWidth + indentSize - 12, y + heightAdvance / 2)
        const end = Point(gutterWidth + indentSize - 2, y + heightAdvance / 2)
        drawer.drawLine(start, end, { stroke: 'red' })
        drawer.drawArrowhead(start, end, { stroke: 'red' }, { length: 4 })
      }

      y += heightAdvance

      textLeft = textLeft.substring(fitText.length)
    }
  }

}
