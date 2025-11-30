import { Region } from './gfx/Region'
import { Drawer } from './gfx/Drawer'


export class Algonim extends HTMLElement {

  static observedAttributes = ["color", "shape"]

  canvas: HTMLCanvasElement
  rootPane: Pane | null = null


  constructor() {
    super()

    // Create shadow canvas
    const shadow = this.attachShadow({ 'mode': 'closed' })
    this.canvas = document.createElement('canvas')
    this.canvas.width = 640
    this.canvas.height = 480
    shadow.appendChild(this.canvas)
  }


  connectedCallback() {
    console.log("Custom element added to page.")
  }

  disconnectedCallback() {
    console.log("Custom element removed from page.")
  }

  connectedMoveCallback() {
    console.log("Custom element moved with moveBefore()")
  }

  adoptedCallback() {
    console.log("Custom element moved to new page.")
  }

  attributeChangedCallback(name: any, oldValue: any, newValue: any) {
    console.log(`Attribute ${name} has changed from ${oldValue} to ${newValue}.`)
  }

  redraw() {
    console.log('Redraw called')

    const CONTEXT_ID = '2d'
    const ctx = this.canvas.getContext(CONTEXT_ID)
    if(ctx === null) throw new ReferenceError(`canvas context '${CONTEXT_ID}' not supported or the canvas has already been set to a different mode`)

    const drawer = new Drawer(ctx, new Region(0, 0, this.canvas.width, this.canvas.height))
    drawer.fill("white");

    if(this.rootPane !== null) {
      this.rootPane.draw(drawer)
    }

    /*drawer.fill('#ff00ff')
    drawer = new Drawer(ctx, new Region(ctx.canvas.width / 4, ctx.canvas.height / 4, this.canvas.width / 2, this.canvas.height / 2))
    drawer.fill('#ff0000')
    drawer.drawLine(0, 0, 800, 800, "black") // SEE: this line is clipped to the small area*/
  }

  public setupExample() {
    const root = new SplitPane()
    this.rootPane = root

    const code = new CodeModel()
    root.second = code

    code.lines = [
      'to_visit = { root }',
      'while |to_visit| > 0 do',
      '\tnext = to_visit.take_one()',
      '\tif next->left <> NULL then',
      '\t\tto_visit.add(next->left)',
      '\tend',
      '\tif next->right <> NULL then',
      '\t\tto_visit.add(next->right)',
      '\tend',
      'done',
    ]
  }

}


abstract class Pane {
  public abstract draw(drawer: Drawer): void
}

class ModelPane implements Pane {
  model: Model | null = null

  public draw(drawer: Drawer) {
    if(this.model !== null) {
      this.model.draw(drawer)
    }
  }
}

enum Axis {
  Horizontal,
  Vertical
}

class SplitPane implements Pane {
  axis: Axis = Axis.Horizontal
  anchor: number = 0.5

  first: Pane | null = null
  second: Pane | null = null


  public draw(drawer: Drawer) {
    // TODO axis
    if(this.first !== null) {
      const firstDrawer = drawer.subregion(drawer.getLocalRegion().hsplit(0.0, this.anchor))
      this.first.draw(firstDrawer)
    }
    if(this.second !== null) {
      const secondDrawer = drawer.subregion(drawer.getLocalRegion().hsplit(this.anchor, 1.0))
      this.second.draw(secondDrawer)
    }
    const x = drawer.getLocalRegion().width * this.anchor
    drawer.drawLine(x, 0, x, drawer.getLocalRegion().height, 'black')
  }
}


type ImperativeLine = () => void
type ImperativeLines = { [key: number]: ImperativeLine }

class ImperativeAlgorithm {

  lines: ImperativeLines = {}

}


abstract class Model {
  public abstract draw(drawer: Drawer): void
}

class CodeModel extends Model {

  lines: string[] = []

  public draw(drawer: Drawer) {
    let lineCount = 0
    for(const line of this.lines) {
      // TODO line up with starting whitespace
      drawer.drawText(line, 10, (24 + 2) * lineCount, 'black')
      lineCount++
    }
  }

}


// Module setup
customElements.define('algonim-element', Algonim)
