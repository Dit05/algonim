import { Gif } from '@/gif/Gif'
import { ColorTable } from '@/gif/ColorTable'
import { Image } from '@/gif/blocks/Image'
import { Netscape2 } from '@/gif/blocks/extensions/Netscape2'
import { GraphicControl } from '@/gif/blocks/GraphicControl'
import { ByteVector } from '@/gif/ByteVector'
import { SequenceFn, Sequence, Frame } from '@/Sequence'
import * as ColorReducers from '@/gif/color_reducers'
import * as GIFTESTS from '@/gif/Tests'

//import * as Models from '@/models'
//export const models = Models


export type GifOptions = {
  /** The value of {@link Algonim/gif/ColorTable!ColorTable.sizefield} will be one less than this. */
  colorTableBits: number,
  /** Whether to automatically use color tables smaller than {@link colorTableBits} when possible. */
  allowSmallerTables: boolean,
  /** Whether to use a new color table for every image instead of using a single global color table. */
  useLocalColorTables: boolean, // TODO
  /** Number of times the animation should loop, from `0` (infinite) up to `65535`. `Infinity` is treated as 0 and `NaN` is treated as `1`. If left `undefined`, no Netscape 2.0 block will be added to the GIF and looping will be unspecified. */
  loopCount: number | undefined,
  /** Size of the temporary buffer used during encoding the GIF file. Only affects encoding performance. */
  encodingBufferSize: number,
  /** Whether timing info should be logged to the console. */
  logTiming: boolean
}

const DEFAULT_GIF_OPTIONS: GifOptions = {
  colorTableBits: 8,
  allowSmallerTables: true,
  useLocalColorTables: false,
  loopCount: undefined,
  encodingBufferSize: 1024,
  logTiming: true
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

  public async recordGif(func: SequenceFn, progressElement: HTMLProgressElement | undefined = undefined, optionsOverrides: Partial<GifOptions> = {}): Promise<Blob> {
    const options: GifOptions = { ...DEFAULT_GIF_OPTIONS, ...optionsOverrides }

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

    function newTimer(): number {
      return performance.now()
    }
    function measure(timer: number): number {
      return performance.now() - timer
    }

    let totalTimer = newTimer()
    let timer

    try {
      const times: Partial<{
        record: number,
        frames: number[],
        encode: number,
        total: number
      }> = {}

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

      timer = newTimer()
      await func(seq)
      times.record = measure(timer)

      progress.setValue(0)
      progress.setMax(1)
      await progress.animationFrame()

      // Make the GIF
      const gif = new Gif(gifCanvas.width, gifCanvas.height)

      gif.globalColorTable = undefined

      const reducer = new ColorReducers.Tiered([
        {
          limit: 2048,
          reducer: new ColorReducers.Matrix()
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

      // Add the Netscape 2.0 block if looping is specified
      let loops = optionsOverrides.loopCount
      if(loops != undefined) {
        if(isNaN(loops)) {
          loops = 1
        } else if(!isFinite(loops)) {
          loops = 0
        }

        const loopBlock = new Netscape2()
        loopBlock.loopCount = loops
        gif.blocks.push(loopBlock)
      }

      times.frames = new Array(frames.length)
      for(let i = 0; i < frames.length; i++) {
        timer = newTimer()
        const frame = frames[i]

        const control = new GraphicControl()
        control.delay = frame.delay
        gif.blocks.push(control)

        // TODO globalable table
        const localTable = ColorTable.createQuantized(reducer, options.colorTableBits - 1, frame.image, options.allowSmallerTables)
        const image = Image.fromCanvasImageData(frame.image, localTable)
        image.tableIsLocal = true
        gif.blocks.push(image)
        times.frames[i] = measure(timer)

        progress.setValue((i + 1) / frames.length * 0.5)
        await progress.animationFrame()
      }

      timer = newTimer()
      const vec = new ByteVector(optionsOverrides.encodingBufferSize)
      const steps = gif.createFileStaged()
      for(let i = 0; i < steps.length; i++) {
        steps[i](vec)
        progress.setValue(0.5 + (i + 1) / steps.length * 0.5)
        await progress.animationFrame()
      }
      times.encode = measure(timer)

      times.total = measure(totalTimer)

      // Format and print timing
      if(options.logTiming) {
        let framesTotal = 0
        for(let i = 0; i < frames.length; i++) {
          framesTotal += times.frames[i]
        }
        const framesAvg = framesTotal / Math.max(frames.length, 1)

        let mse = 0
        for(let i = 0; i < frames.length; i++) {
          mse += (times.frames[i] - framesAvg) ** 2
        }
        mse /= Math.max(frames.length, 1)

        function fmt(n: number): string { return n.toFixed(2) }
        console.log(`timing info (ms): total=${fmt(times.total)}, record=${fmt(times.record)}, frames=${fmt(framesTotal)} (avg=${fmt(framesAvg)}, sd=${fmt(Math.sqrt(mse))}), encode=${fmt(times.encode)}`)
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
