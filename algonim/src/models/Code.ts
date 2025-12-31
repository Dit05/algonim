import { Model } from './Model'
import { Drawer } from '@/gfx/Drawer'

export class Code extends Model {

  public lines: string[] = []
  public arrowLine: number | null = null

  // TODO way of figuring out line spacing
  public draw(drawer: Drawer) {
    let lineCount = 0
    for(const line of this.lines) {
      // TODO line up with starting whitespace
      drawer.drawText(line, 10, (24 + 2) * lineCount, { align: 'start', baseline: 'top' }, { fill: 'black' })
      lineCount++
    }
    // TODO arrow
    if(this.arrowLine !== null) {
      let y = (24 + 2) * this.arrowLine + 12;
      drawer.drawLine(0, y, 10, y, { stroke: 'red' })
    }
  }

}
