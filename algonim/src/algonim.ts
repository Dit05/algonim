class Algonim extends HTMLElement {

  static observedAttributes = ["color", "shape"]

  canvas: HTMLCanvasElement


  constructor() {
    super()
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
    let drawer = new Drawer(ctx, new Region(0, 0, this.canvas.width, this.canvas.height))
    drawer.fill('#ff00ff')
    drawer = new Drawer(ctx, new Region(ctx.canvas.width / 4, ctx.canvas.height / 4, this.canvas.width / 2, this.canvas.height / 2))
    drawer.fill('#ff0000')
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

}

type CanvasStyle = string | CanvasGradient | CanvasPattern
class Drawer {

  readonly context: CanvasRenderingContext2D
  readonly region: Region


  constructor(context: CanvasRenderingContext2D, region: Region) {
    this.context = context
    this.region = region
  }


  doClipped(fn: () => void) {
    this.context.save()
    this.context.translate(this.region.x, this.region.y)
    this.context.beginPath()
    this.context.rect(0, 0, this.region.width, this.region.height)
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

  public fill(fillStyle: CanvasStyle) {
    this.doClipped(() => {
      this.context.fillStyle = fillStyle;
      this.context.fillRect(0, 0, this.region.width, this.region.height)
    })
  }

}


abstract class Model {
}

class CodeModel extends Model {

  lines: string[] = []

}


customElements.define('algonim-element', Algonim)
