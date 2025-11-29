

class Algonim extends HTMLElement {

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


class Region {

  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }


  public static fromStartEnd(startX: number, startY: number, endX: number, endY: number): Region {
    return new Region(
      startX,
      startY,
      Math.max(startX, endX) - startX,
      Math.max(startY, endY) - startY
    );
  }

  public subregion(sub: Region): Region {
    return sub.offset(this.x, this.y).clippedBy(this)
  }

  public hsplit(startFac: number, endFac: number): Region {
    endFac = Math.min(endFac, 1)
    startFac = Math.min(Math.max(startFac, 0), endFac)
    return Region.fromStartEnd(
      this.x + startFac * this.width,
      this.y,
      this.x + endFac * this.width,
      this.y + this.height
    )
  }

  public vsplit(startFac: number, endFac: number): Region {
    endFac = Math.min(endFac, 1)
    startFac = Math.min(Math.max(startFac, 0), endFac)
    return Region.fromStartEnd(
      this.x,
      this.y + startFac * this.height,
      this.x + this.width,
      this.y + endFac * this.height
    )
  }


  public offset(x: number, y: number): Region {
    return new Region(this.x + x, this.y + y, this.width, this.height)
  }

  public clippedBy(clip: Region): Region {
    const startX = Math.max(this.x, clip.x)
    const startY = Math.max(this.y, clip.y)
    const endX = Math.min(this.x + this.width, clip.x + clip.width)
    const endY = Math.min(this.y + this.height, clip.y + clip.height)
    return Region.fromStartEnd(startX, startY, endX, endY)
  }

}

type CanvasStyle = string | CanvasGradient | CanvasPattern
class Drawer {

  readonly context: CanvasRenderingContext2D
  readonly region: Region


  constructor(context: CanvasRenderingContext2D, region: Region) {
    this.context = context
    this.region = region
    this.context.strokeStyle = "black"
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

  public drawLine(startX: number, startY: number, endX: number, endY: number, strokeStyle: CanvasStyle) {
    this.doClipped(() => {
      this.context.beginPath()
      this.context.moveTo(startX, startY)
      this.context.lineTo(endX, endY)
      this.context.strokeStyle = strokeStyle;
      this.context.stroke()
    })
  }

  public drawText(text: string, x: number, y: number, fillStyle: CanvasStyle) {
    this.doClipped(() => {
      this.context.font = "24px sans" // TODO better
      this.context.textBaseline = "top"
      this.context.fillStyle = fillStyle;
      this.context.fillText(text, x, y)
    })
  }

  public fill(fillStyle: CanvasStyle) {
    this.doClipped(() => {
      this.context.fillStyle = fillStyle;
      this.context.fillRect(0, 0, this.region.width, this.region.height)
    })
  }

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


// HACK
function setupExample(alg: Algonim) {
  const root = new SplitPane()
  alg.rootPane = root

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

