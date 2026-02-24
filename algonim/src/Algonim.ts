import { Point, Size } from '@/gfx/Primitives'
import { Region } from '@/gfx/Region'
import { Drawer } from '@/gfx/Drawer'
import { Model } from '@/models/Model'
import { Gif } from '@/gif/Gif'
import * as Models from '@/models'


/**
* Algonim's [custom HTML element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements).
*/
export class Algonim extends HTMLElement {

  protected static observedAttributes = ["delay"]

  // Observed attributes
  /** Default delay in ms between frames. This is linked to a HTML attribute of the same name. @see {@link keyframe} */
  delay: number = 1000
  //

  private canvas: HTMLCanvasElement


  public constructor() {
    super()

    // Create shadow canvas
    const shadow = this.attachShadow({ 'mode': 'closed' })
    this.canvas = this.createCanvas()
    shadow.appendChild(this.canvas)
  }


  protected connectedCallback() {
    //console.log("Custom element added to page.")
  }

  protected disconnectedCallback() {
    //console.log("Custom element removed from page.")
  }

  protected connectedMoveCallback() {
    //console.log("Custom element moved with moveBefore()")
  }

  protected adoptedCallback() {
    //console.log("Custom element moved to new page.")
  }

  protected attributeChangedCallback(name: any, _oldValue: any, newValue: any) {
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

  public slideshow(func: (seq: Sequence) => Promise<void>): Promise<void> {
    // TODO do something about concurrent runs
    const seq = new Sequence(this.canvas)
    seq.delay = this.delay
    return func(seq)
  }

  public recordGif(func: (seq: Sequence) => Promise<void>): Promise<void> {
    const gifCanvas = this.createCanvas()
    const gif = new Gif(gifCanvas.width, gifCanvas.height)

    const consumer: ImageDataConsumerFn = function(img: ImageData) {
      let hash = 0
      for(let i = 0; i < img.data.length; i++) {
        hash = (hash + 7*img.data[i]) % 149
      }
      console.log(`GIF FRAME (${hash})`)
      // TODO accept ImageData directly
      gif.addFrame(img.data)
    }

    const seq = new Sequence(gifCanvas)
    seq.addImageDataConsumer(consumer)
    return func(seq)
  }

}

// TODO the ability to cancel
class Sequence {

  protected readonly canvas: HTMLCanvasElement
  private readonly modelConstructors: { [key: string]: () => Model } = {}
  private readonly imageDataConsumers: ImageDataConsumerFn[] = []

  protected rootPane: Pane | null = null
  public delay: number = 0


  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas

    // Register built-in models
    this.registerModel('code', () => new Models.Code())
    this.registerModel('graph', () => new Models.Graph())
  }


  public addImageDataConsumer(consumer: ImageDataConsumerFn) {
    this.imageDataConsumers.push(consumer)
  }

  private static layoutToPane(layout: Layout, depthLimit: number): Pane {
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
      pane.first = layout.top !== undefined && layout.top !== null ? Sequence.layoutToPane(layout.top, depthLimit - 1) : null
      pane.second = layout.bottom !== undefined && layout.bottom !== null ? Sequence.layoutToPane(layout.bottom, depthLimit - 1) : null
      return pane
    } else if(layout.split === 'vertical') {
      const pane = new SplitPane()
      pane.axis = layout.split
      if(layout.ratio !== undefined) pane.ratio = layout.ratio
      pane.first = layout.left !== undefined && layout.left !== null ? Sequence.layoutToPane(layout.left, depthLimit - 1) : null
      pane.second = layout.right !== undefined && layout.right !== null ? Sequence.layoutToPane(layout.right, depthLimit - 1) : null
      return pane
    } else {
      throw new TypeError('Invalid layout.')
    }
  }

  public setLayout(layout: Layout) {
    this.rootPane = Sequence.layoutToPane(layout, 50)
  }

  /** This should be called in sequence functions to request a keyframe. @see {@link SequenceFn} */
  public async keyframe(delayScale: number = 1) {
    this.redraw()

    delayScale = Math.max(0, delayScale)
    return new Promise((resolve) => {
      setTimeout(resolve, this.delay * delayScale)
    })
  }

  /** Retrieves a list of all registered {@link Model}s' names. */
  public getModelNames(): string[] {
    const names = []
    for(let key in this.modelConstructors) {
      names.push(key)
    }
    return names
  }

  /** Registers a factory function as a {@link Model}. @see {@link createModel} */
  public registerModel(name: string, ctor: () => Model) {
    this.modelConstructors[name] = ctor
  }

  /** Instantiates a registered {@link Model} based on its name. @see {@link getModelNames} */
  public createModel(name: string): Model {
    return this.modelConstructors[name]()
  }

  redraw(): Drawer {
    const CONTEXT_ID = '2d'

    // If you're changing this to re-use the context between frames, keep in mind that Drawer.drawFreeform allows the user to mess up the drawing state stack.
    const ctx = this.canvas.getContext(CONTEXT_ID)
    if(ctx === null) throw new ReferenceError(`Canvas context '${CONTEXT_ID}' not supported or the canvas has already been set to a different mode.`)

    const fullRegion = new Region(Point(0, 0), Size(this.canvas.width, this.canvas.height))
    const drawer = new Drawer(ctx, fullRegion, fullRegion)
    drawer.fill("white");

    if(this.rootPane !== null) {
      this.rootPane.draw(drawer)
    }

    // Pass image data to consumers (if any)
    if(this.imageDataConsumers.length > 0) {
      const img: ImageData = drawer.getImageData({ colorSpace: 'srgb' })
      for(let consumer of this.imageDataConsumers) {
        consumer(img)
      }
    }

    return drawer
  }

}

/** Describes a {@link Pane} hierarchy. @see {@link Algonim.setLayout} */
export type Layout = Model
  | { 'split': 'horizontal', 'ratio': number | undefined, 'top': Layout | undefined, 'bottom': Layout | undefined }
  | { 'split': 'vertical', 'ratio': number | undefined, 'left': Layout | undefined, 'right': Layout | undefined }

/** A function that plays an animation sequence. @see {@link Algonim.slideshow} */
export type SequenceFn = (alg: Algonim) => Promise<void>

export type ImageDataConsumerFn = (img: ImageData) => void



/**
* Base class for panes displayable by Algonim.
* @see {@link Layout}
*/
export abstract class Pane {
  /** Draws the pane over the entire area of the given drawer. */
  public abstract draw(drawer: Drawer): void
}

/**
* Pane that displays a {@link Model}.
*/
export class ModelPane implements Pane {
  public model: Model | null = null

  public draw(drawer: Drawer) {
    if(this.model !== null) {
      this.model.draw(drawer)
    }
  }
}

/**
* Pane that displays two other panes within itself. Be careful not to create an infinitely recursing hierarchy!
*/
export class SplitPane implements Pane {
  /** Axis along which the plane is split. Mirrors vim's behavior, meaning the separator line's orientation will match that of the split. In other words, a vertical split positions the subpanes side-by-side. */
  public axis: 'horizontal' | 'vertical' = 'horizontal'
  /** Controls the proportions of the split. Values closer to 0 reduce the first pane's size, while values closer to 1 increase it. */
  public ratio: number = 0.5

  /** The left or top pane, depending on the split axis. @see {@link axis} */
  public first: Pane | null = null
  /** The right or bottom pane, depending on the split axis. @see {@link axis} */
  public second: Pane | null = null


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
