import { Model } from './Model'
import { Drawer } from '@/gfx/Drawer'
import { TextAlign, FontStyle } from '@/gfx/Styles'


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
    if(this.line === null) throw new TypeError("This sign has been destroyed.")

    // TODO remove
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

  // TODO way of figuring out line spacing
  // TODO customizability
  public draw(drawer: Drawer) {
    const align: TextAlign = { align: 'start', baseline: 'top' }
    const style: Partial<FontStyle> = { fill: 'black' }

    // TODO handle leading whitespace
    let lineCount = 0
    for(let lineCount = 0; lineCount < this.lines.length; lineCount++) {
      const line = this.lines[lineCount]
      const metrics = drawer.measureText(line.text, align, style)

      // TODO line spacing
      const y = (24 + 2) * lineCount
      let x = 10
      drawer.drawText(line.text, x, y, align, style)
      x += metrics.width
      for(let sign of line.signs) {
        x += 10
        drawer.drawText(sign.text, x, y, align, { ...style, ...{ fill: 'blue' } })
        x += drawer.measureText(sign.text, align, { ...style, ...{ fill: 'blue' } }).width
      }
    }

    // TODO arrow
    if(this.arrowLine !== null) {
      let y = (24 + 2) * this.arrowLine + 12;
      drawer.drawLine(0, y, 10, y, { stroke: 'red' })
    }
  }

}
