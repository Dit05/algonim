class Algonim extends HTMLElement {

  static observedAttributes = ["color", "shape"]

  constructor() {
    console.log('Algonim constructed :-)')
    super()
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

class Drawer {

  readonly context: CanvasRenderingContext2D
  readonly region: Region

  constructor(context: CanvasRenderingContext2D, region: Region) {
    this.context = context
    this.region = region
  }


  public drawLine(startX: number, startY: number, endX: number, endY: number) {
    this.context.beginPath()
    this.context.moveTo(startX, startY)
    this.context.lineTo(endX, endY)
    this.context.stroke()
  }

}


abstract class Model {
}

class CodeModel extends Model {

  lines: string[] = []

}


customElements.define('algonim-element', Algonim)
