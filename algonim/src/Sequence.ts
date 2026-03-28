import { Point, Size } from '@/gfx/Primitives'
import { Region } from '@/gfx/Region'
import { Drawer } from '@/gfx/Drawer'
import { Model } from '@/models/Model'
import * as Models from '@/models'


/** Describes a {@link Pane} hierarchy. @see {@link Sequence.setLayout} */
export type Layout = Model
  | { 'split': 'horizontal', 'ratio': number | undefined, 'top': Layout | undefined, 'bottom': Layout | undefined }
  | { 'split': 'vertical', 'ratio': number | undefined, 'left': Layout | undefined, 'right': Layout | undefined }

const DEFAULT_SEQUENCE_CONFIG = {
  defaultDelayMs: 1000,
  resolution: Size(640, 480)
}
export type SequenceConfig = typeof DEFAULT_SEQUENCE_CONFIG

/** Plays an animation sequence. @see {@link Algonim!Algonim.slideshow} */
export type SequenceFn = (seq: Sequence) => Promise<void>

/** Can be subscribed to a sequence to receive rendered frames from it. @see {@link Sequence.addImageDataConsumer} */
export type FrameConsumerFn = (frame: Frame) => void
export type Frame = {
  imageData: ImageData,
  delayMs: number
}


// TODO the ability to cancel
export class Sequence {

  public readonly config: SequenceConfig = { ...DEFAULT_SEQUENCE_CONFIG }

  protected readonly canvas: HTMLCanvasElement
  private readonly ignoreDelays: boolean
  private readonly modelConstructors: { [key: string]: () => Model } = {}
  private readonly imageDataConsumers: FrameConsumerFn[] = []

  protected rootPane: Pane | null = null


  public constructor(canvas: HTMLCanvasElement, ignoreDelays: boolean = false) {
    this.canvas = canvas
    this.ignoreDelays = ignoreDelays

    // Register built-in models
    this.registerModel('code', () => new Models.Code())
    this.registerModel('graph', () => new Models.Graph())
    this.registerModel('rainbow', () => new Models.Rainbow())
  }


  /** Registers a function to receive image data after every drawn frame. */
  public addImageDataConsumer(consumer: FrameConsumerFn) {
    this.imageDataConsumers.push(consumer)
  }

  private static layoutToPane(layout: Layout, depthLimit: number): Pane {
    if(depthLimit <= 0) {
      throw new Error("Depth limit reached while scanning layout.")
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
      throw new TypeError("Invalid layout.")
    }
  }

  public setLayout(layout: Layout) {
    this.rootPane = Sequence.layoutToPane(layout, 50)
  }

  /** This should be called in sequence functions to request a frame to be drawn. @see {@link SequenceFn} */
  public async capture(delayScale: number = 1) {
    const delay = this.config.defaultDelayMs * Math.max(0, delayScale)

    const drawer: Drawer = this.redraw()

    // Pass image data to consumers (if any)
    if(this.imageDataConsumers.length > 0) {
      const img: ImageData = drawer.getImageData({ colorSpace: 'srgb' })
      for(let consumer of this.imageDataConsumers) {
        consumer({
          imageData: img,
          delayMs: delay
        })
      }
    }

    return new Promise((resolve) => {
      setTimeout(resolve, this.ignoreDelays ? 0 : delay)
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

    this.canvas.width = this.config.resolution.width
    this.canvas.height = this.config.resolution.height

    // If you're changing this to re-use the context between frames, keep in mind that Drawer.drawFreeform allows the user to mess up the drawing state stack.
    const ctx = this.canvas.getContext(CONTEXT_ID)
    if(ctx === null) throw new ReferenceError(`Canvas context '${CONTEXT_ID}' not supported or the canvas has already been set to a different mode.`)

    const fullRegion = new Region(Point(0, 0), Size(this.canvas.width, this.canvas.height))
    const drawer = new Drawer(ctx, fullRegion, fullRegion)
    drawer.fill("white");

    if(this.rootPane !== null) {
      this.rootPane.draw(drawer)
    }

    return drawer
  }

}



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

    // +0.5 seems to fix the line ending up halfway between pixels.
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
