import { Point, Size } from '@/gfx/Primitives'
import { Region } from '@/gfx/Region'
import { Drawer } from '@/gfx/Drawer'
import { Model } from '@/models/Model'
import * as Models from '@/models'


export class Algonim extends HTMLElement {

  static observedAttributes = ["delay"]

  // Observed attributes
  delay: number = 1000
  //

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
    this.canvas = this.createCanvas()
    shadow.appendChild(this.canvas)
  }


  connectedCallback() {
    //console.log("Custom element added to page.")
  }

  disconnectedCallback() {
    //console.log("Custom element removed from page.")
  }

  connectedMoveCallback() {
    //console.log("Custom element moved with moveBefore()")
  }

  adoptedCallback() {
    //console.log("Custom element moved to new page.")
  }

  attributeChangedCallback(name: any, oldValue: any, newValue: any) {
    //console.log(`Attribute ${name} has changed from ${oldValue} to ${newValue}.`)
    switch(name) {
      case 'delay':
        this.delay = Number(newValue)
        break
    }
  }

  createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    // TODO customizable size
    canvas.width = 640
    canvas.height = 480
    return canvas
  }

  redraw(canvas: HTMLCanvasElement | undefined = undefined /* Do NOT use `this` in parameter defaults, since it won't be bound yet */): Drawer {
    if(canvas === undefined) canvas = this.canvas

    const CONTEXT_ID = '2d'

    // If you're changing this to re-use the context between frames, keep in mind that Drawer.drawFreeform allows the user to mess up the drawing state stack.
    const ctx = canvas.getContext(CONTEXT_ID)
    if(ctx === null) throw new ReferenceError(`Canvas context '${CONTEXT_ID}' not supported or the canvas has already been set to a different mode.`)

    const drawer = new Drawer(ctx, new Region(Point(0, 0), Size(canvas.width, canvas.height)))
    drawer.fill("white");

    if(this.rootPane !== null) {
      this.rootPane.draw(drawer)
    }

    return drawer

    /*drawer.fill('#ff00ff')
    drawer = new Drawer(ctx, new Region(ctx.canvas.width / 4, ctx.canvas.height / 4, canvas.width / 2, canvas.height / 2))
    drawer.fill('#ff0000')
    drawer.drawLine(0, 0, 800, 800, "black") // SEE: this line is clipped to the small area*/
  }

  // TODO? inbetweening
  public slideshow(func: (alg: Algonim) => Promise<void>): Promise<void> {
    return func(this)
  }

  // FIXME why does this make the main animation finish instantly?
  public recordGif(func: (alg: Algonim) => Promise<void>): Promise<void> {
    const gifCanvas = this.createCanvas()

    const handler: ProxyHandler<this> = {
      // TODO type-safe proxying with advanced TS magic
      get(target, prop, receiver): any {
        if(prop === 'keyframe') {
          // Modify the keyframe method
          return function(this: Algonim, _bogusDelayScale: number = 1): Promise<void> {
            // Redirect drawing to our GIF canvas
            const drawer = this.redraw(gifCanvas)

            // TODO insert into gif
            const data = drawer.context.getImageData(0, 0, gifCanvas.width, gifCanvas.height, { colorSpace: 'srgb' }).data
            let hash = 0
            for(let i = 0; i < data.length; i++) {
              hash = (hash + 7*data[i]) % 149
            }
            console.log(`GIF FRAME (${hash})`)

            return new Promise((resolve) => {
              setTimeout(resolve, 0) // Genuis! 0 delay will just yield.
            })
          }
        } else {
          // Return the thing from the target object
          let original = Reflect.get(target, prop, receiver)
          if(typeof(original) === 'function') {
            original = original.bind(target) // For some reason, this is needed to "maintain context" or something.
          }
          return original
        }
      }
    }

    const proxy = new Proxy(this, handler)
    return func(proxy)
  }

  public async keyframe(delayScale: number = 1) {
    this.redraw()

    delayScale = Math.max(0, delayScale)
    return new Promise((resolve) => {
      setTimeout(resolve, this.delay * delayScale)
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
        drawer.drawLine(Point(0, y), Point(drawer.getLocalRegion().size.width, y), { stroke: 'black' })
        break
      case 'vertical':
        const x = Math.round(drawer.getLocalRegion().size.width * this.ratio) + 0.5
        drawer.drawLine(Point(x, 0), Point(x, drawer.getLocalRegion().size.height), { stroke: 'black' })
        break
    }
  }
}


// Module setup
customElements.define('algonim-element', Algonim)
