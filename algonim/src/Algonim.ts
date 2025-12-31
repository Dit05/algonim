import { Region } from '@/gfx/Region'
import { Drawer } from '@/gfx/Drawer'
import { Model } from '@/models/Model'
import * as Models from '@/models'


export class Algonim extends HTMLElement {

  static observedAttributes = ["color", "shape"]

  canvas: HTMLCanvasElement
  rootPane: Pane | null = null

  static models: { [key: string]: () => Model } = {
    code: () => new Models.Code(),
    tree: () => new Models.Tree()
  }


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
    if(ctx === null) throw new ReferenceError(`Canvas context '${CONTEXT_ID}' not supported or the canvas has already been set to a different mode.`)

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

  // TODO better name
  // TODO inbetweening
  public async animateFunction(func: (alg: Algonim) => Promise<void>): Promise<void> {
    await func(this)

    return Promise.resolve()
  }

  public async keyframe() {
    console.log('keyframe')
    this.redraw()
    return new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })
  }

  // TODO instead of adding models manually, parse a nested object that represents the panes
  public createModel(name: string): Model {
    return Algonim.models[name]()
  }

  public setRoot(model: Model) {
    let pane = this.rootPane = new ModelPane()
    pane.model = model
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
    let split
    switch(this.axis) {
      case Axis.Horizontal: split = (r: Region, start: number, end: number) => r.hsplit(start, end); break
      case Axis.Vertical: split = (r: Region, start: number, end: number) => r.vsplit(start, end); break
    }

    if(this.first !== null) {
      const firstDrawer = drawer.subregion(split(drawer.getLocalRegion(), 0.0, this.anchor))
      this.first.draw(firstDrawer)
    }
    if(this.second !== null) {
      const secondDrawer = drawer.subregion(split(drawer.getLocalRegion(), this.anchor, 1.0))
      this.second.draw(secondDrawer)
    }

    switch(this.axis) {
      case Axis.Horizontal:
        const y = drawer.getLocalRegion().height * this.anchor
        drawer.drawLine(0, y, drawer.getLocalRegion().width, y, { stroke: 'black' })
        break
      case Axis.Vertical:
        const x = drawer.getLocalRegion().width * this.anchor
        drawer.drawLine(x, 0, x, drawer.getLocalRegion().height, { stroke: 'black' })
        break
    }
  }
}


// Module setup
customElements.define('algonim-element', Algonim)
