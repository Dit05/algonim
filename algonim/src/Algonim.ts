import { Point, Size } from '@/gfx/Primitives'
import { Region } from '@/gfx/Region'
import { Drawer } from '@/gfx/Drawer'
import { Model } from '@/models/Model'
import * as Models from '@/models'


export class Algonim extends HTMLElement {

  static observedAttributes = ["color", "shape"]

  canvas: HTMLCanvasElement
  rootPane: Pane | null = null

  static modelConstructors: { [key: string]: () => Model } = {
    code: () => new Models.Code(),
    graph: () => new Models.Graph()
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

    // If you're changing this to re-use the context between frames, keep in mind that Drawer.drawFreeform allows the user to mess up the drawing state stack.
    const ctx = this.canvas.getContext(CONTEXT_ID)
    if(ctx === null) throw new ReferenceError(`Canvas context '${CONTEXT_ID}' not supported or the canvas has already been set to a different mode.`)

    const drawer = new Drawer(ctx, new Region(Point(0, 0), Size(this.canvas.width, this.canvas.height)))
    drawer.fill("white");

    if(this.rootPane !== null) {
      this.rootPane.draw(drawer)
    }

    /*drawer.fill('#ff00ff')
    drawer = new Drawer(ctx, new Region(ctx.canvas.width / 4, ctx.canvas.height / 4, this.canvas.width / 2, this.canvas.height / 2))
    drawer.fill('#ff0000')
    drawer.drawLine(0, 0, 800, 800, "black") // SEE: this line is clipped to the small area*/
  }

  // TODO? inbetweening
  public async slideshow(func: (alg: Algonim) => Promise<void>): Promise<void> {
    await func(this)

    return Promise.resolve()
  }

  public async keyframe() {
    this.redraw()
    return new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })
  }

  public createModel(name: string): Model {
    return Algonim.modelConstructors[name]()
  }


  static layoutToPane(layout: Layout, depthLimit: number): Pane {
    if(depthLimit <= 0) {
      throw new Error('Depth limit reached while scanning layout.')
    }

    if(layout instanceof Model) {
      const pane = new ModelPane()
      pane.model = layout
      return pane
    } else if(layout.split === 'horizontal') {
      const pane = new SplitPane()
      pane.axis = layout.split
      if(layout.ratio !== undefined) pane.ratio = layout.ratio
      pane.first = layout.top !== undefined && layout.top !== null ? Algonim.layoutToPane(layout.top, depthLimit - 1) : null
      pane.second = layout.bottom !== undefined && layout.bottom !== null ? Algonim.layoutToPane(layout.bottom, depthLimit - 1) : null
      return pane
    } else if(layout.split === 'vertical') {
      const pane = new SplitPane()
      pane.axis = layout.split
      if(layout.ratio !== undefined) pane.ratio = layout.ratio
      pane.first = layout.left !== undefined && layout.left !== null ? Algonim.layoutToPane(layout.left, depthLimit - 1) : null
      pane.second = layout.right !== undefined && layout.right !== null ? Algonim.layoutToPane(layout.right, depthLimit - 1) : null
      return pane
    } else {
      throw new TypeError('Invalid layout.')
    }
  }

  public setLayout(layout: Layout) {
    this.rootPane = Algonim.layoutToPane(layout, 50)
  }

}

type Layout = Model
  | { 'split': 'horizontal', 'ratio': number | undefined, 'top': Layout | undefined, 'bottom': Layout | undefined }
  | { 'split': 'vertical', 'ratio': number | undefined, 'left': Layout | undefined, 'right': Layout | undefined }



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


class SplitPane implements Pane {
  axis: 'horizontal' | 'vertical' = 'horizontal'
  ratio: number = 0.5

  first: Pane | null = null
  second: Pane | null = null


  public draw(drawer: Drawer) {
    let split
    switch(this.axis) {
      case 'horizontal': split = (r: Region, start: number, end: number) => r.hsplit(start, end); break
      case 'vertical': split = (r: Region, start: number, end: number) => r.vsplit(start, end); break
    }

    if(this.first !== null) {
      let subregion = split(drawer.getLocalRegion(), 0.0, this.ratio)
      const firstDrawer = drawer.subregion(subregion)
      this.first.draw(firstDrawer)
    }
    if(this.second !== null) {
      let subregion = split(drawer.getLocalRegion(), this.ratio, 1.0)
      const secondDrawer = drawer.subregion(subregion)
      this.second.draw(secondDrawer)
    }

    // +0.5 seems to fix the line ending up between pixels.
    switch(this.axis) {
      case 'horizontal':
        const y = Math.round(drawer.getLocalRegion().size.height * this.ratio) + 0.5
        drawer.drawLine(0, y, drawer.getLocalRegion().size.width, y, { stroke: 'black' })
        break
      case 'vertical':
        const x = Math.round(drawer.getLocalRegion().size.width * this.ratio) + 0.5
        drawer.drawLine(x, 0, x, drawer.getLocalRegion().size.height, { stroke: 'black' })
        break
    }
  }
}


// Module setup
customElements.define('algonim-element', Algonim)
