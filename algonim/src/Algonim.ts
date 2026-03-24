import { Gif } from '@/gif/Gif'
import { ColorTable } from '@/gif/ColorTable'
import { Image } from '@/gif/blocks/Image'
import { GraphicControl } from '@/gif/blocks/GraphicControl'
import { ByteVector } from '@/gif/ByteVector'
import { SequenceFn, Sequence} from '@/Sequence'
import * as ColorReducers from '@/gif/ColorReducers'
import * as GIFTESTS from '@/gif/Tests'


/**
* Algonim's [custom HTML element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements).
*/
export class Algonim extends HTMLElement {

  protected static observedAttributes = ["delay"]

  // Observed attributes
  /** Default delay in ms between frames. This is linked to a HTML attribute of the same name. */
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

  public slideshow(func: SequenceFn): Promise<void> {
    // TODO do something about concurrent runs
    const seq = new Sequence(this.canvas)
    seq.delay = this.delay
    return func(seq)
  }

  public async recordGif(func: SequenceFn, progressElement: HTMLProgressElement | undefined = undefined, bufferSize: number = 1024): Promise<Blob> {
    const progress = {
      setHidden(hidden: boolean) {
        if(progressElement) progressElement.hidden = hidden
      },
      setMax(max: number) {
        if(progressElement) progressElement.max = max
      },
      setValue(value: number | undefined) {
        if(progressElement) {
          if(value === undefined) {
            progressElement.removeAttribute('value') // Make indeterminate
          } else {
            progressElement.value = value
          }
        }
      },
      animationFrame(): Promise<unknown> {
        return new Promise((resolve) => requestAnimationFrame(resolve))
      }
    }

    try {
      // Capture frames
      const gifCanvas = this.createCanvas()
      const seq = new Sequence(gifCanvas)
      const frames: {
        image: ImageData,
        delay: number
      }[] = []
      seq.addImageDataConsumer(function(img: ImageData) {
        frames.push({
          image: img,
          delay: 100 // TODO obtain actual delay as passed to keyframe
        })
      })

      progress.setHidden(false)
      progress.setValue(undefined) // To avoid having to solve the halting problem, set the progress bar to indeterminate
      await progress.animationFrame()

      await func(seq)

      progress.setValue(0)
      progress.setMax(1)
      await progress.animationFrame()

      // Make the GIF
      const gif = new Gif(gifCanvas.width, gifCanvas.height)

      /*const stupidColorTable = new ColorTable(ColorTable.desiredSizeToSizefield(2) ?? -1)
      stupidColorTable.colors[0] = ColorUtil.rgb8(0, 0, 0)
      stupidColorTable.colors[1] = ColorUtil.rgb8(255, 255, 255)*/
      //gif.globalColorTable = ColorTable.createEvenlyDistributed(2)
      gif.globalColorTable = undefined
      // FIXME color matching takes forever with a large color table

      const reducer = new ColorReducers.Tiered([
        {
          limit: 1024,
          reducer: new ColorReducers.Random()
        },
        {
          limit: Infinity,
          reducer: function() {
            const b = new ColorReducers.Bit()
            //b.mode = 'undershoot'
            return b
          }()
        }
      ])

      for(let i = 0; i < frames.length; i++) {
        const frame = frames[i]

        const control = new GraphicControl()
        control.delay = frame.delay
        gif.blocks.push(control)

        const localTable = ColorTable.createQuantized(reducer, 3, frame.image)
        const image = Image.fromCanvasImageData(frame.image, localTable)
        image.tableIsLocal = true
        //image.compressionFn = stupidCompress // HACK
        gif.blocks.push(image)

        progress.setValue((i + 1) / frames.length * 0.5)
        await progress.animationFrame()
      }

      const vec = new ByteVector(bufferSize)
      const steps = gif.createFileStaged()
      for(let i = 0; i < steps.length; i++) {
        steps[i](vec)
        progress.setValue(0.5 + (i + 1) / steps.length * 0.5)
        await progress.animationFrame()
      }

      return new Blob(vec.finish())
    } finally {
      progress.setHidden(true)
      await progress.animationFrame()
    }
  }

}

export function test() {
  console.log('<empty>')
}


// Module setup
customElements.define('algonim-element', Algonim)
