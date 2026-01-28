import { Model } from './Model'
import { Drawer } from '@/gfx/Drawer'
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

  // TODO customizability
  public draw(drawer: Drawer) {
    const align: TextAlign = { align: 'start', baseline: 'top' }
    const style: Partial<FontStyle> = { fill: 'black' }

    // TODO line wrap
    let y = 12
    const spacingFactor = 0.8
    const gutterWidth = 24
    for(let lineCount = 0; lineCount < this.lines.length; lineCount++) {
      const line = this.lines[lineCount]

      let indent = 0
      for(let i = 0; i < line.text.length; i++) {
        let done = false
        switch(line.text[i]) {
          case ' ': indent += 1; break
          case '\t': indent += 2; break
          default: done = true; break
        }
        if(done) break
      }
      const indentSize = indent * drawer.measureText('m', align, style).width

      const text = line.text.trim()

      const metrics = drawer.measureText(text, align, style)
      const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
      const heightAdvance = height * spacingFactor

      let x = gutterWidth + indentSize
      drawer.drawText(text, x, y, align, style)
      x += metrics.width
      for(let sign of line.signs) {
        x += 10
        drawer.drawText(sign.text, x, y, align, { ...style, ...{ fill: 'blue' } })
        x += drawer.measureText(sign.text, align, { ...style, ...{ fill: 'blue' } }).width
      }

      if(lineCount == this.arrowLine) {
        drawer.drawArrow(gutterWidth + indentSize - 12, y + heightAdvance / 2, gutterWidth + indentSize - 2, y + heightAdvance / 2, { stroke: 'red' }, { length: 4 })
      }

      y += heightAdvance
    }
  }

}
