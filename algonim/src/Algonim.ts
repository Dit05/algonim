import { Gif } from '@/gif/Gif'
import { ColorTable } from '@/gif/ColorTable'
import { Image } from '@/gif/blocks/Image'
import { GraphicControl } from '@/gif/blocks/GraphicControl'
import { ByteVector } from '@/gif/ByteVector'
import { SequenceFn, Sequence, Frame } from '@/Sequence'
import * as ColorReducers from '@/gif/color_reducers'
import * as GIFTESTS from '@/gif/Tests'

//import * as Models from '@/models'
//export const models = Models


export type GifOptions = {
  /** The value of {@link Algonim/gif/ColorTable!ColorTable.sizefield} will be one less than this. */
  bitDepth: number,
  /** Whether to use a new color table for every image instead of using a single global color table. */
  useLocalColorTables: boolean, // TODO
  /** Whether the animation should repeat. */
  looping: boolean, // TODO
  /** Size of the temporary buffer used during encoding the GIF file. Only affects encoding performance. */
  encodingBufferSize: number
}

const DEFAULT_GIF_OPTIONS: GifOptions = {
  bitDepth: 3,
  useLocalColorTables: false,
  looping: true,
  encodingBufferSize: 1024
}


/**
* Algonim's [custom HTML element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements).
*/
export class Algonim extends HTMLElement {

  private canvas: HTMLCanvasElement


  public constructor() {
    super()

    // Create shadow canvas
    const shadow = this.attachShadow({ 'mode': 'closed' })
    this.canvas = this.createCanvas()
    shadow.appendChild(this.canvas)
  }


  createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    return canvas
  }

  public slideshow(func: SequenceFn): Promise<void> {
    // TODO do something about concurrent runs
    const seq = new Sequence(this.canvas)
    return func(seq)
  }

  public async recordGif(func: SequenceFn, progressElement: HTMLProgressElement | undefined = undefined, options: Partial<GifOptions> = {}): Promise<Blob> {
    const fullOptions: GifOptions = { ...DEFAULT_GIF_OPTIONS, ...options }

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
      const seq = new Sequence(gifCanvas, true)
      const frames: {
        image: ImageData,
        delay: number
      }[] = []
      seq.addImageDataConsumer(function(frame: Frame) {
        frames.push({
          image: frame.imageData,
          delay: frame.delayMs * 0.1 // 1 gif delay is 10 ms.
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
      // TODO loop
      const gif = new Gif(gifCanvas.width, gifCanvas.height)

      gif.globalColorTable = undefined
      // FIXME color matching takes quite a while with a large color table

      const reducer = new ColorReducers.Tiered([
        {
          limit: 256,
          reducer: new ColorReducers.Random()
        },
        {
          limit: Infinity,
          reducer: function() {
            const b = new ColorReducers.Bit()
            b.mode = 'undershoot'
            return b
          }()
        }
      ])

      for(let i = 0; i < frames.length; i++) {
        const frame = frames[i]

        const control = new GraphicControl()
        control.delay = frame.delay
        gif.blocks.push(control)

        // TODO globalable table
        // TODO checkbox for allowing smaller sizefield
        const localTable = ColorTable.createQuantized(reducer, fullOptions.bitDepth - 1, frame.image, true)
        const image = Image.fromCanvasImageData(frame.image, localTable)
        image.tableIsLocal = true
        //image.compressionFn = stupidCompress // HACK
        gif.blocks.push(image)

        progress.setValue((i + 1) / frames.length * 0.5)
        await progress.animationFrame()
      }

      const vec = new ByteVector(options.encodingBufferSize)
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


// Module setup
customElements.define('algonim-element', Algonim)
